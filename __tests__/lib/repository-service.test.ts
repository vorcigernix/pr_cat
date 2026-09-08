/** @jest-environment node */

import { createClient, type Client } from '@libsql/client';
import { query } from '@/lib/db';
import { RepositoryService } from '@/lib/services/repository-service';

jest.mock('@/lib/db', () => ({ query: jest.fn() }));

describe('Repository loading for user organizations', () => {
  let client: Client;

  beforeEach(async () => {
    client = createClient({ url: 'file::memory:' });
    await client.executeMultiple(`
      CREATE TABLE organizations (id INTEGER PRIMARY KEY, name TEXT, github_id INTEGER, avatar_url TEXT);
      CREATE TABLE user_organizations (user_id TEXT, organization_id INTEGER, PRIMARY KEY (user_id, organization_id));
      CREATE TABLE repositories (
        id INTEGER PRIMARY KEY, github_id INTEGER, organization_id INTEGER, name TEXT,
        full_name TEXT, description TEXT, private INTEGER DEFAULT 0, is_tracked INTEGER DEFAULT 0,
        created_at TEXT DEFAULT '2026-01-01', updated_at TEXT DEFAULT '2026-01-02'
      );
      INSERT INTO organizations VALUES
        (1, 'Zulu', 101, 'zulu.png'), (2, 'Alpha', 102, 'alpha.png'),
        (3, 'Empty', 103, NULL), (4, 'Foreign', 104, NULL);
      INSERT INTO user_organizations VALUES ('viewer', 1), ('viewer', 2), ('viewer', 3), ('outsider', 4);
      INSERT INTO repositories (id, github_id, organization_id, name, full_name, is_tracked, created_at) VALUES
        (1, 1001, 1, 'Beta', 'Zulu/Beta', 1, '2025-01-01'),
        (2, 1002, 1, 'Alpha', 'Zulu/Alpha', 0, '2026-01-01'),
        (3, 1003, 2, 'Untracked', 'Alpha/Untracked', 0, '2026-01-01'),
        (4, 1004, 4, 'Foreign', 'Foreign/Foreign', 1, '2026-01-01'),
        (5, 1005, NULL, 'Unassigned', 'Unassigned/Repo', 1, '2026-01-01');
    `);
    (query as jest.Mock).mockReset();
    (query as jest.Mock).mockImplementation(async (sql, args) => (await client.execute({ sql, args })).rows);
  });

  afterEach(() => client.close());

  it('retains organization metadata, empty organizations, and repository ordering without exposing other organizations', async () => {
    const groups = await RepositoryService.getRepositoriesForUserOrganizations('viewer');

    expect(groups.map(group => group.organization.name)).toEqual(['Alpha', 'Empty', 'Zulu']);
    expect(groups[2].organization).toEqual({ id: 1, name: 'Zulu', github_id: 101, avatar_url: 'zulu.png' });
    expect(groups.map(group => group.repositories.map(repository => repository.id))).toEqual([[3], [], [2, 1]]);
  });

  it('keeps organizations that have no tracked repositories when filtering', async () => {
    const groups = await RepositoryService.getRepositoriesForUserOrganizations('viewer', { includeTrackedOnly: true });

    expect(groups.map(group => group.organization.name)).toEqual(['Alpha', 'Empty', 'Zulu']);
    expect(groups.map(group => group.repositories.map(repository => repository.id))).toEqual([[], [], [1]]);
  });

  it.each([
    { orderBy: 'name', orderDir: 'DESC' as const },
    { orderBy: 'created_at', orderDir: 'ASC' as const },
  ])('preserves repository sort options $orderBy $orderDir', async (options) => {
    const groups = await RepositoryService.getRepositoriesForUserOrganizations('viewer', options);

    expect(groups.map(group => group.organization.name)).toEqual(['Alpha', 'Empty', 'Zulu']);
    expect(groups[2].repositories.map(repository => repository.id)).toEqual([1, 2]);
  });

  it('returns an empty list in one query for a user with no organizations', async () => {
    expect(await RepositoryService.getRepositoriesForUserOrganizations('unknown-user')).toEqual([]);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('resolves local organization zero by GitHub ID, preserves sorting/tracking, and stops at inaccessible organizations', async () => {
    await client.executeMultiple(`
      INSERT INTO organizations VALUES (0, 'Zero', 100, 'zero.png');
      INSERT INTO user_organizations VALUES ('zero-viewer', 0), ('zero-viewer', 1);
      INSERT INTO repositories (id, github_id, organization_id, name, full_name, is_tracked) VALUES
        (0, 1000, 0, 'Zulu', 'Zero/Zulu', 1),
        (6, 1006, 0, 'Alpha', 'Zero/Alpha', 0),
        (7, 1007, 0, 'Beta', 'Zero/Beta', 1);
    `);
    const group = await RepositoryService.getRepositoriesForSingleOrganization('zero-viewer', 100);
    expect(group?.organization).toEqual({ id: 0, name: 'Zero', github_id: 100, avatar_url: 'zero.png' });
    expect(group?.repositories.map(repository => repository.id)).toEqual([6, 7, 0]);
    expect(query).toHaveBeenCalledTimes(2);

    const tracked = await RepositoryService.getRepositoriesForSingleOrganization('zero-viewer', 100, { includeTrackedOnly: true, orderDir: 'DESC' });
    expect(tracked?.repositories.map(repository => repository.id)).toEqual([0, 7]);
    jest.mocked(query).mockClear();
    expect(await RepositoryService.getRepositoriesForSingleOrganization('zero-viewer', 104)).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each([1, 5, 50])('loads repositories for %i organizations in two queries', async (organizationCount) => {
    await client.execute({
      sql: `WITH RECURSIVE organization_ids(id) AS (
        SELECT 10 UNION ALL SELECT id + 1 FROM organization_ids WHERE id < ?
      ) INSERT INTO organizations (id, name, github_id)
      SELECT id, 'Organization ' || id, 100 + id FROM organization_ids`,
      args: [organizationCount + 9],
    });
    await client.executeMultiple(`
      INSERT INTO user_organizations SELECT 'scale-user', id FROM organizations WHERE id >= 10;
      INSERT INTO repositories (id, github_id, organization_id, name, full_name)
      SELECT id, 1000 + id, id, 'Repo', 'Org/Repo' FROM organizations WHERE id >= 10;
    `);

    const groups = await RepositoryService.getRepositoriesForUserOrganizations('scale-user');

    expect(groups).toHaveLength(organizationCount);
    expect(groups.every(group => group.repositories.length === 1)).toBe(true);
    expect(query).toHaveBeenCalledTimes(2);
  });
});
