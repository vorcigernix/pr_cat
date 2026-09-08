import { batch, query } from '@/lib/db';
import type { GitHubClient } from '@/lib/github';
import type { GitHubPullRequest, GitHubUser, PRReview, PullRequest } from '@/lib/types';
import type { PullRequestSyncResult } from '@/lib/core/ports/github.port';
import type { InStatement } from '@libsql/client';

const PAGE_SIZE = 100;
const REVIEW_CONCURRENCY = 4;
const CHECKPOINT_OVERLAP_MS = 60_000;

// A page is the lifetime of this deduplicated author set, keeping memory bounded.
export async function ensureSyncUsers(users: GitHubUser[]): Promise<void> {
  const uniqueUsers = [...new Map(users.map(user => [String(user.id), user])).values()];
  if (uniqueUsers.length === 0) return;
  const existing = await query<{ id: string }>(
    `SELECT id FROM users WHERE id IN (${uniqueUsers.map(() => '?').join(',')})`,
    uniqueUsers.map(user => String(user.id))
  );
  const existingIds = new Set(existing.map(user => user.id));
  const missing = uniqueUsers.filter(user => !existingIds.has(String(user.id)));
  if (missing.length === 0) return;
  await batch(missing.map(user => ({
    sql: 'INSERT INTO users (id, name, email, image) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
    args: [String(user.id), user.name || user.login, user.email || null, user.avatar_url || null],
  })));
}

function reviewState(state: string): PRReview['state'] {
  const normalized = state.toLowerCase();
  return normalized === 'approved' || normalized === 'changes_requested' || normalized === 'dismissed'
    ? normalized : 'commented';
}

export async function savePullRequestReviews(
  pullRequestId: number, reviews: Awaited<ReturnType<GitHubClient['getPullRequestReviews']>>
): Promise<void> {
  const submitted = reviews.filter(review => review.submitted_at);
  if (submitted.length > 0) {
    const existing = await query<PRReview>(
      `SELECT * FROM pr_reviews WHERE pull_request_id = ? AND github_id IN (${submitted.map(() => '?').join(',')})`,
      [pullRequestId, ...submitted.map(review => review.id)]
    );
    const byGitHubId = new Map(existing.map(review => [review.github_id, review]));
    const changed = submitted.filter(review => {
      const previous = byGitHubId.get(review.id);
      return !previous || previous.state !== reviewState(review.state) || previous.submitted_at !== review.submitted_at;
    });
    await ensureSyncUsers(changed.flatMap(review => review.user ? [review.user] : []));
    const statements: InStatement[] = changed.map(review => {
      const previous = byGitHubId.get(review.id);
      const values = [review.user ? String(review.user.id) : null, reviewState(review.state), review.submitted_at];
      return previous ? {
        sql: 'UPDATE pr_reviews SET reviewer_id = ?, state = ?, submitted_at = ? WHERE pull_request_id = ? AND github_id = ?',
        args: [...values, pullRequestId, review.id],
      } : {
        // The write batch serializes this existence check with the insert, including concurrent retries.
        sql: `INSERT INTO pr_reviews (reviewer_id, state, submitted_at, pull_request_id, github_id)
          SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM pr_reviews WHERE pull_request_id = ? AND github_id = ?)`,
        args: [...values, pullRequestId, review.id, pullRequestId, review.id],
      };
    });
    if (statements.length > 0) await batch(statements);
  }
}

export async function syncPullRequestReviews(
  client: GitHubClient, owner: string, repo: string, number: number, pullRequestId: number
): Promise<void> {
  for (let page = 1; ; page++) {
    const reviews = await client.getPullRequestReviews(owner, repo, number, page);
    await savePullRequestReviews(pullRequestId, reviews);
    if (reviews.length < PAGE_SIZE) return;
  }
}

function pullRequestWrite(repositoryId: number, pr: GitHubPullRequest): InStatement {
  return {
    sql: `INSERT INTO pull_requests (
      github_id, repository_id, number, title, description, author_id, state,
      created_at, updated_at, closed_at, merged_at, draft, additions, deletions, changed_files
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(repository_id, number) DO UPDATE SET
      title = excluded.title, description = excluded.description,
      author_id = COALESCE(pull_requests.author_id, excluded.author_id), state = excluded.state,
      updated_at = excluded.updated_at, closed_at = excluded.closed_at,
      merged_at = excluded.merged_at, draft = excluded.draft,
      additions = COALESCE(excluded.additions, pull_requests.additions),
      deletions = COALESCE(excluded.deletions, pull_requests.deletions),
      changed_files = COALESCE(excluded.changed_files, pull_requests.changed_files)
    WHERE julianday(pull_requests.updated_at) IS NULL OR julianday(excluded.updated_at) > julianday(pull_requests.updated_at)
      OR (pull_requests.author_id IS NULL AND excluded.author_id IS NOT NULL
        AND julianday(excluded.updated_at) >= julianday(pull_requests.updated_at))
    RETURNING id, number`,
    args: [pr.id, repositoryId, pr.number, pr.title, pr.body ?? null, pr.user ? String(pr.user.id) : null,
      pr.merged_at ? 'merged' : pr.state, pr.created_at, pr.updated_at,
      pr.closed_at, pr.merged_at, pr.draft ? 1 : 0,
      pr.additions ?? null, pr.deletions ?? null, pr.changed_files ?? null],
  };
}

async function syncPullRequestPage(repositoryId: number, candidates: GitHubPullRequest[], result: PullRequestSyncResult): Promise<Map<number, number>> {
  const existing = await query<PullRequest>(
    `SELECT * FROM pull_requests WHERE repository_id = ? AND number IN (${candidates.map(() => '?').join(',')})`,
    [repositoryId, ...candidates.map(pr => pr.number)]
  );
  const byNumber = new Map(existing.map(pr => [pr.number, pr]));
  const changed = candidates.filter(pr => {
    const previous = byNumber.get(pr.number);
    return !previous || !Number.isFinite(Date.parse(previous.updated_at)) || Date.parse(pr.updated_at) > Date.parse(previous.updated_at) || (!previous.author_id && !!pr.user);
  });
  await ensureSyncUsers(changed.flatMap(pr => pr.user ? [pr.user] : []));
  const written = changed.length > 0 ? await batch(changed.map(pr => pullRequestWrite(repositoryId, pr))) : [];
  const ids = new Map(existing.map(pr => [pr.number, pr.id]));
  for (let index = 0; index < changed.length; index++) {
    const row = written[index].rows[0];
    if (row) {
      ids.set(Number(row.number), Number(row.id));
      if (byNumber.has(changed[index].number)) result.updated++;
      else result.created++;
    } else result.unchanged++;
  }
  result.unchanged += candidates.length - changed.length;
  // A concurrent sync can insert a PR after the page lookup; recover its ID without rewriting it.
  const missingIds = candidates.filter(pr => !ids.has(pr.number));
  if (missingIds.length > 0) {
    const concurrent = await query<Pick<PullRequest, 'id' | 'number'>>(
      `SELECT id, number FROM pull_requests WHERE repository_id = ? AND number IN (${missingIds.map(() => '?').join(',')})`,
      [repositoryId, ...missingIds.map(pr => pr.number)]
    );
    concurrent.forEach(pr => ids.set(pr.number, pr.id));
  }
  return ids;
}

async function syncPageReviews(
  client: GitHubClient, owner: string, repo: string,
  candidates: GitHubPullRequest[], ids: Map<number, number>, result: PullRequestSyncResult
): Promise<void> {
  // Wait for the entire bounded group before reporting failure, so no work escapes this request.
  for (let offset = 0; offset < candidates.length; offset += REVIEW_CONCURRENCY) {
    const group = candidates.slice(offset, offset + REVIEW_CONCURRENCY);
    const outcomes = await Promise.allSettled(group.map(async pr => {
      const id = ids.get(pr.number);
      if (id === undefined) throw new Error('PR changed concurrently; retry synchronization');
      await syncPullRequestReviews(client, owner, repo, pr.number, id);
    }));
    for (let index = 0; index < outcomes.length; index++) {
      const outcome = outcomes[index];
      if (outcome.status === 'rejected') {
        result.errors.push({ pr: group[index].number, error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason) });
      } else result.processed++;
    }
    if (result.errors.length > 0) return;
  }
}

export async function syncRepositoryPullRequests(
  client: GitHubClient, repositoryId: number, owner: string, repo: string, since?: Date
): Promise<PullRequestSyncResult> {
  const result: PullRequestSyncResult = { processed: 0, created: 0, updated: 0, unchanged: 0, errors: [] };
  const startedAt = new Date();
  try {
    if (since && !Number.isFinite(since.getTime())) throw new Error('Invalid synchronization start date');
    const checkpoints = await query<{ updated_through: string }>(
      'SELECT updated_through FROM repository_sync_state WHERE repository_id = ?', [repositoryId]
    );
    const checkpoint = checkpoints[0] ? new Date(checkpoints[0].updated_through) : undefined;
    if (checkpoint && !Number.isFinite(checkpoint.getTime())) throw new Error('Invalid saved synchronization checkpoint');
    // A caller may request an older backfill, but cannot skip work newer than the saved checkpoint.
    const boundary = checkpoint && since ? new Date(Math.min(checkpoint.getTime(), since.getTime())) : checkpoint;
    const cutoff = boundary ? boundary.getTime() - CHECKPOINT_OVERLAP_MS : -Infinity;

    for (let page = 1; ; page++) {
      const pagePRs = await client.getPullRequests(owner, repo, 'all', page, PAGE_SIZE);
      if (pagePRs.some(pr => !Number.isFinite(Date.parse(pr.updated_at)))) throw new Error('GitHub returned an invalid PR update timestamp');
      const candidates = pagePRs.filter(pr => Date.parse(pr.updated_at) >= cutoff);
      if (candidates.length > 0) {
        const ids = await syncPullRequestPage(repositoryId, candidates, result);
        await syncPageReviews(client, owner, repo, candidates, ids, result);
        if (result.errors.length > 0) return result;
      }
      if (pagePRs.length < PAGE_SIZE || candidates.length < pagePRs.length) break;
    }

    const completedAt = new Date().toISOString();
    const checkpointWrite = await batch([{
      sql: `INSERT INTO repository_sync_state (repository_id, updated_through, last_synced_at) VALUES (?, ?, ?)
        ON CONFLICT(repository_id) DO UPDATE SET
          updated_through = MAX(repository_sync_state.updated_through, excluded.updated_through),
          last_synced_at = MAX(repository_sync_state.last_synced_at, excluded.last_synced_at) RETURNING last_synced_at`,
      args: [repositoryId, startedAt.toISOString(), completedAt],
    }]);
    result.lastSyncedAt = String(checkpointWrite[0].rows[0].last_synced_at);
  } catch (error) {
    result.errors.push({ pr: 0, error: error instanceof Error ? error.message : String(error) });
  }
  return result;
}
