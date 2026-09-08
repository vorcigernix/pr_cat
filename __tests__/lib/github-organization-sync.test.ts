/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { createClient, type Client, type InStatement } from '@libsql/client';
import { batch, query } from '@/lib/db';
import { GitHubClient } from '@/lib/github';
import { GitHubService } from '@/lib/services/github-service';
import type { GitHubRepository } from '@/lib/types';
import { syncOrganizationRepositories, syncOrganizationMembers } from '@/lib/infrastructure/adapters/github/organization-sync';

jest.mock('@/lib/db', () => ({ query: jest.fn(), batch: jest.fn() }));
jest.mock('@/lib/github', () => ({ GitHubClient: jest.fn() }));
jest.mock('@/lib/github-app', () => ({ createInstallationClient: jest.fn() }));

function repository(id: number): GitHubRepository {
  return {
    id, name: `repo-${id}`, full_name: `Org/repo-${id}`, owner: { id: 100, login: 'Org', type: 'Organization' },
    html_url: '', description: 'Description', private: false, default_branch: 'main',
    created_at: '2020-01-01T00:00:00Z', updated_at: '2026-09-07T12:00:00Z', pushed_at: '2026-09-07T12:00:00Z',
  };
}

describe('Paged organization synchronization', () => {
  let db: Client;
  const api = { getUserOrganizations: jest.fn(), getOrganizationRepositories: jest.fn(), getOrganizationMembers: jest.fn() };
  const client = api as unknown as GitHubClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    api.getUserOrganizations.mockReset().mockResolvedValue([]);
    api.getOrganizationRepositories.mockReset().mockResolvedValue([]);
    api.getOrganizationMembers.mockReset().mockResolvedValue([]);
    (GitHubClient as jest.Mock).mockReturnValue(client);
    db = createClient({ url: 'file::memory:' });
    await db.executeMultiple(readFileSync('lib/schema.sql', 'utf8'));
    await db.executeMultiple(`
      INSERT INTO users (id, name) VALUES ('7', 'Signed in user');
      INSERT INTO organizations (id, github_id, name, installation_id) VALUES (1, 100, 'Org', 42);
      INSERT INTO user_organizations (user_id, organization_id, role) VALUES ('7', 1, 'owner');
    `);
    (query as jest.Mock).mockImplementation(async (sql, args) => (await db.execute({ sql, args })).rows);
    (batch as jest.Mock).mockImplementation((statements: InStatement[]) => db.batch(statements, 'write'));
  });

  afterEach(() => db.close());

  it('bootstraps all organization associations without loading repositories or members during sign-in', async () => {
    const organizations = Array.from({ length: 101 }, (_, index) => ({ id: 100 + index, login: `Org-${index}`, avatar_url: '' }));
    api.getUserOrganizations.mockResolvedValueOnce(organizations.slice(0, 100)).mockResolvedValueOnce(organizations.slice(100));

    const result = await new GitHubService('test-token').syncUserOrganizations('7', { includeDetails: false });

    expect(result).toHaveLength(101);
    expect(api.getUserOrganizations.mock.calls).toEqual([[1], [2]]);
    expect(api.getOrganizationRepositories).not.toHaveBeenCalled();
    expect(api.getOrganizationMembers).not.toHaveBeenCalled();
    expect((await db.execute('SELECT COUNT(*) AS count FROM user_organizations')).rows[0].count).toBe(101);
    expect((await db.execute('SELECT role FROM user_organizations WHERE organization_id = 1')).rows[0].role).toBe('owner');
    expect((await db.execute('SELECT role FROM user_organizations WHERE organization_id = 2')).rows[0].role).toBe('member');
    expect((await db.execute('SELECT installation_id FROM organizations WHERE id = 1')).rows[0].installation_id).toBe(42);
    expect(batch).toHaveBeenCalledTimes(2);
  });

  it('synchronizes 101 repositories in two page lookups and skips all unchanged writes on retry', async () => {
    const repositories = Array.from({ length: 101 }, (_, index) => repository(index + 1));
    api.getOrganizationRepositories.mockImplementation(async (_name, page) => repositories.slice((page - 1) * 100, page * 100));
    expect(await syncOrganizationRepositories(client, 'Org', 1)).toEqual({ processed: 101, created: 101, updated: 0, unchanged: 0, errors: [] });
    expect(query).toHaveBeenCalledTimes(2);
    expect(batch).toHaveBeenCalledTimes(2);
    await db.execute('UPDATE repositories SET is_tracked = 1 WHERE github_id = 1');
    (batch as jest.Mock).mockClear();
    expect(await syncOrganizationRepositories(client, 'Org', 1)).toEqual({ processed: 101, created: 0, updated: 0, unchanged: 101, errors: [] });
    expect(batch).not.toHaveBeenCalled();
    repositories[0].description = 'Changed description';
    expect(await syncOrganizationRepositories(client, 'Org', 1)).toMatchObject({ updated: 1, unchanged: 100, errors: [] });
    const row = (await db.execute('SELECT description, is_tracked FROM repositories WHERE github_id = 1')).rows[0];
    expect(row).toMatchObject({ description: 'Changed description', is_tracked: 1 });
  });

  it('reports partial page failures with completed counts and retries without duplicated writes', async () => {
    api.getOrganizationRepositories.mockResolvedValueOnce(Array.from({ length: 100 }, (_, index) => repository(index + 1)))
      .mockRejectedValueOnce(new Error('GitHub unavailable'));
    expect(await syncOrganizationRepositories(client, 'Org', 1)).toMatchObject({ processed: 100, created: 100, errors: [{ repo: 'Org', error: 'GitHub unavailable' }] });
    expect((await db.execute('SELECT COUNT(*) AS count FROM repositories')).rows[0].count).toBe(100);
  });

  it('pages members, batches new users, and preserves an existing owner role', async () => {
    const members = Array.from({ length: 101 }, (_, index) => ({ id: index + 7, login: `user-${index}`, avatar_url: '', html_url: '' }));
    api.getOrganizationMembers.mockResolvedValueOnce(members.slice(0, 100)).mockResolvedValueOnce(members.slice(100));
    await syncOrganizationMembers(client, 'Org', 1);
    expect(query).toHaveBeenCalledTimes(2);
    expect((await db.execute('SELECT COUNT(*) AS count FROM user_organizations')).rows[0].count).toBe(101);
    expect((await db.execute("SELECT role FROM user_organizations WHERE user_id = '7'")).rows[0].role).toBe('owner');
  });

  it('keeps heavy discovery on explicit sync and propagates member API failures', async () => {
    api.getUserOrganizations.mockResolvedValue([{ id: 100, login: 'Org', avatar_url: '' }]);
    api.getOrganizationMembers.mockRejectedValue(new Error('Members unavailable'));
    await expect(new GitHubService('test-token').syncUserOrganizations('7')).rejects.toThrow('Members unavailable');
    expect(api.getOrganizationRepositories).toHaveBeenCalledWith('Org', 1);
    expect(api.getOrganizationMembers).toHaveBeenCalledWith('Org', 1);
  });
});
