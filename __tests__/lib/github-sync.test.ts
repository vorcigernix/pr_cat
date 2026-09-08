/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { createClient, type Client, type InStatement } from '@libsql/client';
import { batch, query } from '@/lib/db';
import type { GitHubClient } from '@/lib/github';
import type { GitHubPullRequest } from '@/lib/types';
import { syncRepositoryPullRequests } from '@/lib/infrastructure/adapters/github/pull-request-sync';

jest.mock('@/lib/db', () => ({ query: jest.fn(), batch: jest.fn() }));

function pullRequest(number: number, overrides: Partial<GitHubPullRequest> = {}): GitHubPullRequest {
  return {
    id: 1000 + number, number, title: `PR ${number}`, body: 'Description', state: 'open',
    user: { id: 7, login: 'author', avatar_url: '', html_url: '' },
    created_at: '2020-01-01T00:00:00Z', updated_at: '2026-09-07T12:00:30Z',
    closed_at: null, merged_at: null, draft: false,
    head: { ref: 'feature', sha: 'abc' }, base: { ref: 'main', sha: 'def' },
    ...overrides,
  };
}

describe('Paged PR synchronization', () => {
  let db: Client;
  const api = { getPullRequests: jest.fn(), getPullRequestReviews: jest.fn() };
  const client = api as unknown as GitHubClient;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T12:00:00Z'));
    jest.clearAllMocks();
    api.getPullRequests.mockReset().mockResolvedValue([]);
    api.getPullRequestReviews.mockReset().mockResolvedValue([]);
    db = createClient({ url: 'file::memory:' });
    await db.executeMultiple(readFileSync('lib/schema.sql', 'utf8'));
    await db.executeMultiple(`
      INSERT INTO organizations (id, github_id, name) VALUES (1, 100, 'Org');
      INSERT INTO repositories (id, github_id, organization_id, name, full_name) VALUES (1, 200, 1, 'repo', 'Org/repo');
    `);
    (query as jest.Mock).mockImplementation(async (sql, args) => (await db.execute({ sql, args })).rows);
    (batch as jest.Mock).mockImplementation((statements: InStatement[]) => db.batch(statements, 'write'));
  });

  afterEach(() => {
    db.close();
    jest.useRealTimers();
  });

  it('pages PRs, deduplicates author lookups per page, and bounds review concurrency', async () => {
    api.getPullRequests.mockResolvedValueOnce(Array.from({ length: 100 }, (_, i) => pullRequest(i + 1)))
      .mockResolvedValueOnce([pullRequest(101)]);
    let active = 0;
    let maximum = 0;
    api.getPullRequestReviews.mockImplementation(async () => {
      active++;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active--;
      return [];
    });

    const result = await syncRepositoryPullRequests(client, 1, 'Org', 'repo');

    expect(result).toMatchObject({ processed: 101, created: 101, updated: 0, unchanged: 0, errors: [] });
    expect(maximum).toBe(4);
    expect(active).toBe(0);
    expect(api.getPullRequests.mock.calls.map(call => call[3])).toEqual([1, 2]);
    expect((query as jest.Mock).mock.calls.filter(call => call[0].includes('SELECT id FROM users'))).toHaveLength(2);
    expect((query as jest.Mock).mock.calls.filter(call => call[0].includes('SELECT * FROM pull_requests'))).toHaveLength(2);
    expect((await db.execute('SELECT COUNT(*) AS count FROM users')).rows[0].count).toBe(1);
    expect(result.lastSyncedAt).toBe('2026-09-07T12:00:00.000Z');
  });

  it('uses update time for old PRs and stops pagination below the successful watermark', async () => {
    await db.execute("INSERT INTO repository_sync_state VALUES (1, '2026-09-07T10:00:00.000Z', '2026-09-07T10:01:00.000Z')");
    api.getPullRequests.mockResolvedValue([
      pullRequest(1, { updated_at: '2026-09-07T11:00:00Z' }),
      ...Array.from({ length: 99 }, (_, i) => pullRequest(i + 2, { updated_at: '2026-09-06T00:00:00Z' })),
    ]);

    const result = await syncRepositoryPullRequests(client, 1, 'Org', 'repo');

    expect(result).toMatchObject({ processed: 1, created: 1, errors: [] });
    expect(api.getPullRequests).toHaveBeenCalledTimes(1);
    expect((await db.execute('SELECT number FROM pull_requests')).rows).toEqual([{ number: 1 }]);
  });

  it('retries failed reviews without duplicate PR writes and preserves categorization', async () => {
    api.getPullRequests.mockResolvedValue([pullRequest(1)]);
    api.getPullRequestReviews.mockRejectedValueOnce(new Error('GitHub temporarily unavailable'));
    const failed = await syncRepositoryPullRequests(client, 1, 'Org', 'repo');
    expect(failed.errors).toEqual([{ pr: 1, error: 'GitHub temporarily unavailable' }]);
    expect((await db.execute('SELECT * FROM repository_sync_state')).rows).toEqual([]);
    await db.executeMultiple("INSERT INTO categories (id, name) VALUES (9, 'Feature'); UPDATE pull_requests SET category_id = 9, category_confidence = 0.9");
    api.getPullRequestReviews.mockResolvedValue([{ id: 99, user: pullRequest(1).user, state: 'APPROVED', submitted_at: '2026-09-07T11:00:00Z' }]);
    (batch as jest.Mock).mockClear();

    const retried = await syncRepositoryPullRequests(client, 1, 'Org', 'repo');

    expect(retried).toMatchObject({ processed: 1, created: 0, updated: 0, unchanged: 1, errors: [] });
    expect((batch as jest.Mock).mock.calls.flatMap(call => call[0]).some(statement => statement.sql.includes('INSERT INTO pull_requests'))).toBe(false);
    expect((await db.execute('SELECT category_id, category_confidence FROM pull_requests')).rows[0]).toEqual({ category_id: 9, category_confidence: 0.9 });
    expect((await db.execute('SELECT COUNT(*) AS count FROM pr_reviews')).rows[0].count).toBe(1);
    expect((await db.execute('SELECT updated_through FROM repository_sync_state')).rows[0].updated_through).toBe('2026-09-07T12:00:00.000Z');
  });

  it('pages reviews and updates dismissed reviews without inserting duplicates', async () => {
    api.getPullRequests.mockResolvedValue([pullRequest(1)]);
    const reviews = Array.from({ length: 101 }, (_, index) => ({
      id: index + 1, user: pullRequest(1).user, state: 'APPROVED', submitted_at: '2026-09-07T11:00:00Z',
    }));
    api.getPullRequestReviews.mockImplementation((_owner, _repo, _number, page) => Promise.resolve(reviews.slice((page - 1) * 100, page * 100)));
    await syncRepositoryPullRequests(client, 1, 'Org', 'repo');
    reviews[0].state = 'DISMISSED';

    const result = await syncRepositoryPullRequests(client, 1, 'Org', 'repo');

    expect(result.errors).toEqual([]);
    expect((await db.execute('SELECT COUNT(*) AS count FROM pr_reviews')).rows[0].count).toBe(101);
    expect((await db.execute('SELECT state FROM pr_reviews WHERE github_id = 1')).rows[0].state).toBe('dismissed');
    expect(api.getPullRequestReviews.mock.calls.map(call => call[3])).toEqual([1, 2, 1, 2]);
  });

  it('does not advance the previous checkpoint after a failed write batch', async () => {
    await db.execute("INSERT INTO repository_sync_state VALUES (1, '2026-09-07T10:00:00.000Z', '2026-09-07T10:01:00.000Z')");
    api.getPullRequests.mockResolvedValue([pullRequest(1)]);
    (batch as jest.Mock).mockImplementation(async (statements: Array<{ sql: string }>) => {
      if (statements.some(statement => statement.sql.includes('INSERT INTO pull_requests'))) throw new Error('Write failed');
      return db.batch(statements, 'write');
    });

    const result = await syncRepositoryPullRequests(client, 1, 'Org', 'repo');

    expect(result.errors).toEqual([{ pr: 0, error: 'Write failed' }]);
    expect((await db.execute('SELECT updated_through FROM repository_sync_state')).rows[0].updated_through).toBe('2026-09-07T10:00:00.000Z');
  });
  it('checks 100 unchanged PRs with two reads and only the successful checkpoint write', async () => {
    const prs = Array.from({ length: 100 }, (_, index) => pullRequest(index + 1));
    api.getPullRequests.mockImplementation(async (_owner, _repo, _state, page) => page === 1 ? prs : []);
    await syncRepositoryPullRequests(client, 1, 'Org', 'repo');
    (query as jest.Mock).mockClear();
    (batch as jest.Mock).mockClear();

    expect(await syncRepositoryPullRequests(client, 1, 'Org', 'repo')).toMatchObject({ processed: 100, created: 0, updated: 0, unchanged: 100, errors: [] });
    expect(query).toHaveBeenCalledTimes(2); // Checkpoint + one existing-PR page.
    expect(batch).toHaveBeenCalledTimes(1);
    expect((batch as jest.Mock).mock.calls[0][0]).toHaveLength(1);
    expect((batch as jest.Mock).mock.calls[0][0][0].sql).toContain('repository_sync_state');
  });

  it('does not advance a checkpoint when a later PR page fails', async () => {
    await db.execute("INSERT INTO repository_sync_state VALUES (1, '2026-09-07T10:00:00.000Z', '2026-09-07T10:01:00.000Z')");
    api.getPullRequests.mockResolvedValueOnce(Array.from({ length: 100 }, (_, index) => pullRequest(index + 1)))
      .mockRejectedValueOnce(new Error('Page unavailable'));
    expect(await syncRepositoryPullRequests(client, 1, 'Org', 'repo')).toMatchObject({ processed: 100, created: 100, errors: [{ pr: 0, error: 'Page unavailable' }] });
    expect((await db.execute('SELECT updated_through FROM repository_sync_state')).rows[0].updated_through).toBe('2026-09-07T10:00:00.000Z');
  });

  it('keeps the successful watermark monotonic across overlapping syncs', async () => {
    await db.execute("INSERT INTO repository_sync_state VALUES (1, '2026-09-07T13:00:00.000Z', '2026-09-07T13:01:00.000Z')");
    const result = await syncRepositoryPullRequests(client, 1, 'Org', 'repo');
    expect(result.errors).toEqual([]);
    expect(result.lastSyncedAt).toBe('2026-09-07T13:01:00.000Z');
    expect((await db.execute('SELECT updated_through FROM repository_sync_state')).rows[0].updated_through).toBe('2026-09-07T13:00:00.000Z');
  });

  it('ignores a later since request that would skip changes after the saved checkpoint', async () => {
    await db.execute("INSERT INTO repository_sync_state VALUES (1, '2026-09-07T10:00:00.000Z', '2026-09-07T10:01:00.000Z')");
    api.getPullRequests.mockResolvedValue([pullRequest(1, { updated_at: '2026-09-07T11:00:00Z' })]);
    expect(await syncRepositoryPullRequests(client, 1, 'Org', 'repo', new Date('2026-09-07T12:00:00Z'))).toMatchObject({ created: 1, errors: [] });
  });

  it('handles concurrent retries without duplicate PRs, users, or reviews', async () => {
    api.getPullRequests.mockResolvedValue([pullRequest(1)]);
    api.getPullRequestReviews.mockResolvedValue([{
      id: 900, user: { id: 8, login: 'reviewer', avatar_url: '', html_url: '' },
      state: 'APPROVED', submitted_at: '2026-09-07T12:00:10Z',
    }]);
    const results = await Promise.all([
      syncRepositoryPullRequests(client, 1, 'Org', 'repo'),
      syncRepositoryPullRequests(client, 1, 'Org', 'repo'),
    ]);
    expect(results.every(result => result.errors.length === 0)).toBe(true);
    expect(results.reduce((sum, result) => sum + result.created, 0)).toBe(1);
    expect(results.reduce((sum, result) => sum + result.unchanged, 0)).toBe(1);
    expect((await db.execute('SELECT COUNT(*) AS count FROM pull_requests')).rows[0].count).toBe(1);
    expect((await db.execute('SELECT COUNT(*) AS count FROM pr_reviews')).rows[0].count).toBe(1);
    expect((await db.execute('SELECT COUNT(*) AS count FROM users')).rows[0].count).toBe(2);
  });

});
