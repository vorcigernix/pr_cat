/** @jest-environment node */

import { createClient, type Client } from '@libsql/client';
import { batch, query, execute } from '@/lib/db';
import { runMigrations } from '@/lib/migrate';
import {
  findTeamById, createTeam, updateTeam, deleteTeam, addTeamMember,
  removeTeamMember, updateTeamMember, getTeamWithMembers, searchUsers,
} from '@/lib/repositories/team-repository';
import { updateCategory } from '@/lib/repositories/category-repository';
import { updateUser } from '@/lib/repositories/user-repository';
import { updateOrganization } from '@/lib/repositories/organization-repository';
import { updateRepository, setRepositoryTracking } from '@/lib/repositories/repository-repository';

jest.mock('@/lib/db', () => ({ batch: jest.fn(), query: jest.fn(), execute: jest.fn() }));

describe('Repository write persistence', () => {
  let client: Client;

  beforeEach(async () => {
    client = createClient({ url: 'file::memory:' });
    jest.mocked(batch).mockImplementation(statements => client.batch(statements, 'write'));
    jest.mocked(query).mockImplementation(async (sql, args) => (await client.execute({ sql, args })).rows);
    jest.mocked(execute).mockImplementation(async (sql, args) => {
      const result = await client.execute({ sql, args });
      return { rowsAffected: result.rowsAffected, lastInsertId: Number(result.lastInsertRowid) };
    });
    await runMigrations();
    await client.executeMultiple(`
      INSERT INTO organizations (id, name) VALUES (1, 'one'), (2, 'two');
      INSERT INTO users (id, name, email) VALUES ('alice', 'Alice', 'alice@example.com'), ('outsider', 'Other', 'other@example.com');
      INSERT INTO user_organizations (user_id, organization_id) VALUES ('alice', 1), ('outsider', 2);
      INSERT INTO teams (id, organization_id, name, description, color) VALUES
        (1, 1, 'Engineering', 'Keep this', '#123456'), (2, 2, 'Other team', NULL, NULL);
    `);
    jest.clearAllMocks();
  });

  afterEach(() => client.close());

  it.each([
    { table: 'categories', id: 1, write: () => updateCategory(1, { name: 'Renamed category', description: null, is_default: true }), expected: { name: 'Renamed category', description: null, is_default: 1 } },
    { table: 'users', id: 'alice', write: () => updateUser('alice', { name: 'Renamed user', email: 'new@example.com' }), expected: { name: 'Renamed user', email: 'new@example.com' } },
    { table: 'organizations', id: 1, write: () => updateOrganization(1, { name: 'Renamed org', installation_id: 99 }), expected: { name: 'Renamed org', installation_id: 99 } },
    { table: 'repositories', id: 1, write: () => updateRepository(1, { name: 'renamed-repo', description: null, private: true }), expected: { name: 'renamed-repo', description: null, private: 1 } },
    { table: 'repositories', id: 1, write: () => setRepositoryTracking(1, true), expected: { is_tracked: 1 } },
  ])('updates $table with $expected and a valid timestamp without touching other rows', async ({ table, id, write, expected }) => {
    await client.executeMultiple(`
      INSERT INTO categories (id, organization_id, name, description) VALUES (1, 1, 'First', 'Old description'), (2, 2, 'Other', NULL);
      INSERT INTO repositories (id, organization_id, name, full_name, description) VALUES (1, 1, 'first', 'one/first', 'Old description'), (2, 2, 'other', 'two/other', NULL);
      UPDATE ${table} SET updated_at = '2000-01-01 00:00:00';
    `);
    const before = (await client.execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [id] })).rows[0];
    const untouched = (await client.execute({ sql: `SELECT * FROM ${table} WHERE id != ?`, args: [id] })).rows;

    const result = await write();

    expect(result).toMatchObject({ id, ...expected, created_at: before.created_at });
    expect(Date.parse(`${result?.updated_at}Z`)).toBeGreaterThan(Date.parse('2000-01-01T00:00:00Z'));
    expect((await client.execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [id] })).rows[0]).toEqual(result);
    expect((await client.execute({ sql: `SELECT * FROM ${table} WHERE id != ?`, args: [id] })).rows).toEqual(untouched);
  });

  it('persists a new team and updates supplied fields without erasing omitted values', async () => {
    const created = await createTeam({ organization_id: 1, name: 'Product', description: 'Keep this', color: '#123456' });
    expect(await findTeamById(created.id)).toEqual(created);

    expect(await updateTeam(created.id, { name: 'Renamed', description: undefined, color: null })).toMatchObject({
      id: created.id, organization_id: 1, name: 'Renamed', description: 'Keep this', color: null, created_at: created.created_at,
    });
    expect(await findTeamById(1)).toMatchObject({ name: 'Engineering', color: '#123456' });
  });

  it('keeps empty updates read-only and returns null for a missing team', async () => {
    const before = await findTeamById(1);
    expect(await updateTeam(1, {})).toEqual(before);
    expect(execute).not.toHaveBeenCalled();
    expect(await getTeamWithMembers(999)).toBeNull();
  });

  it('rejects duplicate names within one organization', async () => {
    await expect(createTeam({ organization_id: 1, name: 'Engineering', description: null, color: null }))
      .rejects.toThrow(/UNIQUE constraint/);
    expect((await client.execute('SELECT COUNT(*) AS count FROM teams')).rows[0].count).toBe(2);
  });

  it('returns stored membership and user details, rejects duplicates, and removes only that membership', async () => {
    const member = await addTeamMember({ team_id: 1, user_id: 'alice', role: 'lead', joined_at: '2024-01-01' });
    await addTeamMember({ team_id: 2, user_id: 'outsider', role: 'member' });
    const user = (await client.execute("SELECT * FROM users WHERE id = 'alice'")).rows[0];

    expect(await getTeamWithMembers(1)).toMatchObject({
      id: 1, member_count: 1, members: [{ ...member, joined_at: '2024-01-01', user }],
    });
    expect(await updateTeamMember(1, 'alice', { role: 'admin' })).toMatchObject({
      id: member.id, role: 'admin', joined_at: '2024-01-01', created_at: member.created_at,
    });
    await expect(addTeamMember({ team_id: 1, user_id: 'alice', role: 'member' }))
      .rejects.toThrow('User is already a member of this team');
    expect(await removeTeamMember(1, 'alice')).toBe(true);
    expect(await removeTeamMember(1, 'alice')).toBe(false);
    expect(await getTeamWithMembers(1)).toMatchObject({ member_count: 0, members: [] });
    expect(await getTeamWithMembers(2)).toMatchObject({ member_count: 1 });
  });

  it('deletes a team and cascades its memberships without affecting another team', async () => {
    await addTeamMember({ team_id: 1, user_id: 'alice', role: 'member' });
    expect(await deleteTeam(1)).toBe(true);
    expect(await deleteTeam(1)).toBe(false);
    expect((await client.execute('SELECT * FROM team_members')).rows).toEqual([]);
    expect(await findTeamById(2)).toMatchObject({ name: 'Other team' });
  });

  it('searches names and email case-insensitively within the organization', async () => {
    expect((await searchUsers(1, 'ALICE')).map(user => user.id)).toEqual(['alice']);
    expect((await searchUsers(1, '@EXAMPLE.COM')).map(user => user.id)).toEqual(['alice']);
    expect(await searchUsers(1, 'Other')).toEqual([]);
  });

  it('limits actual matching search results to 20', async () => {
    await client.executeMultiple(`
      WITH RECURSIVE ids(id) AS (SELECT 1 UNION ALL SELECT id + 1 FROM ids WHERE id < 25)
      INSERT INTO users (id, name) SELECT 'search-' || id, 'Search ' || id FROM ids;
      INSERT INTO user_organizations (user_id, organization_id) SELECT id, 1 FROM users WHERE id LIKE 'search-%';
    `);
    expect(await searchUsers(1, 'Search')).toHaveLength(20);
  });
});
