import { batch, query } from '@/lib/db';
import type { GitHubClient } from '@/lib/github';
import type { GitHubOrganization, GitHubRepository, Organization, Repository } from '@/lib/types';
import type { RepositorySyncResult } from '@/lib/core/ports/github.port';
import { ensureSyncUsers } from './pull-request-sync';

export async function syncOrganizationAssociations(userId: string, organizations: GitHubOrganization[]): Promise<Organization[]> {
  if (organizations.length === 0) return [];
  await batch(organizations.flatMap(org => [{
    sql: `INSERT INTO organizations (github_id, name, avatar_url) VALUES (?, ?, ?)
      ON CONFLICT(github_id) DO UPDATE SET name = excluded.name, avatar_url = excluded.avatar_url
      WHERE organizations.name IS NOT excluded.name OR organizations.avatar_url IS NOT excluded.avatar_url`,
    args: [org.id, org.login, org.avatar_url],
  }, {
    sql: `INSERT INTO user_organizations (user_id, organization_id, role)
      SELECT ?, id, 'member' FROM organizations WHERE github_id = ?
      ON CONFLICT(user_id, organization_id) DO NOTHING`,
    args: [userId, org.id],
  }]));
  return query<Organization>(
    `SELECT * FROM organizations WHERE github_id IN (${organizations.map(() => '?').join(',')})`,
    organizations.map(org => org.id)
  );
}

export async function syncRepositoryPage(organizationId: number, repositories: Array<Pick<GitHubRepository, 'id' | 'name' | 'full_name' | 'description' | 'private'>>): Promise<RepositorySyncResult> {
  const result: RepositorySyncResult = { processed: repositories.length, created: 0, updated: 0, unchanged: 0, errors: [] };
  if (repositories.length === 0) return result;
  const existing = await query<Repository>(
    `SELECT * FROM repositories WHERE github_id IN (${repositories.map(() => '?').join(',')})`,
    repositories.map(repo => repo.id)
  );
  const byGitHubId = new Map(existing.map(repo => [repo.github_id, repo]));
  const changed = repositories.filter(repo => {
    const previous = byGitHubId.get(repo.id);
    return !previous || previous.organization_id !== organizationId || previous.name !== repo.name ||
      previous.full_name !== repo.full_name || previous.description !== (repo.description ?? null) ||
      Boolean(previous.private) !== repo.private;
  });
  if (changed.length > 0) await batch(changed.map(repo => ({
    sql: `INSERT INTO repositories (github_id, organization_id, name, full_name, description, private, is_tracked)
      VALUES (?, ?, ?, ?, ?, ?, 0) ON CONFLICT(github_id) DO UPDATE SET
      organization_id = excluded.organization_id, name = excluded.name, full_name = excluded.full_name,
      description = excluded.description, private = excluded.private, updated_at = datetime('now')`,
    args: [repo.id, organizationId, repo.name, repo.full_name, repo.description ?? null, repo.private ? 1 : 0],
  })));
  result.created = changed.filter(repo => !byGitHubId.has(repo.id)).length;
  result.updated = changed.length - result.created;
  result.unchanged = repositories.length - changed.length;
  return result;
}

export async function syncOrganizationRepositories(
  client: GitHubClient, organizationName: string, organizationId: number
): Promise<RepositorySyncResult> {
  const result: RepositorySyncResult = { processed: 0, created: 0, updated: 0, unchanged: 0, errors: [] };
  try {
    for (let page = 1; ; page++) {
      const repositories = await client.getOrganizationRepositories(organizationName, page);
      const counts = await syncRepositoryPage(organizationId, repositories);
      result.processed += counts.processed;
      result.created += counts.created;
      result.updated += counts.updated;
      result.unchanged += counts.unchanged;
      if (repositories.length < 100) break;
    }
  } catch (error) {
    result.errors.push({ repo: organizationName, error: error instanceof Error ? error.message : String(error) });
  }
  return result;
}

export async function syncOrganizationMembers(client: GitHubClient, organizationName: string, organizationId: number): Promise<void> {
  for (let page = 1; ; page++) {
    const members = await client.getOrganizationMembers(organizationName, page);
    await ensureSyncUsers(members);
    if (members.length > 0) await batch(members.map(member => ({
      sql: `INSERT INTO user_organizations (user_id, organization_id, role) VALUES (?, ?, 'member')
        ON CONFLICT(user_id, organization_id) DO NOTHING`,
      args: [String(member.id), organizationId],
    })));
    if (members.length < 100) return;
  }
}
