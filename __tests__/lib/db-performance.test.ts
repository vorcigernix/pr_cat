/** @jest-environment node */

import { createClient, type Client } from '@libsql/client';
import { query } from '@/lib/db';
import { getTeamsByOrganizationWithMembers } from '@/lib/repositories/team-repository';

jest.mock('@/lib/db', () => ({ query: jest.fn() }));

describe('Team loading through the canonical repository', () => {
  let client: Client;

  beforeEach(async () => {
    client = createClient({ url: 'file::memory:' });
    await client.executeMultiple(`
      CREATE TABLE teams (
        id INTEGER PRIMARY KEY, organization_id INTEGER, name TEXT, description TEXT, color TEXT,
        created_at TEXT DEFAULT '2026-01-01', updated_at TEXT DEFAULT '2026-01-02'
      );
      CREATE TABLE users (
        id TEXT PRIMARY KEY, name TEXT, email TEXT, image TEXT,
        created_at TEXT DEFAULT '2025-01-01', updated_at TEXT DEFAULT '2025-01-02'
      );
      CREATE TABLE team_members (
        id INTEGER PRIMARY KEY, team_id INTEGER, user_id TEXT, role TEXT,
        joined_at TEXT DEFAULT '2026-03-01',
        created_at TEXT DEFAULT '2026-03-02', updated_at TEXT DEFAULT '2026-03-03'
      );
      INSERT INTO teams (id, organization_id, name, description, color) VALUES
        (1, 1, 'Zulu', NULL, NULL), (2, 1, 'Alpha', 'Product team', '#123456'),
        (3, 1, 'Empty', NULL, NULL), (4, 2, 'Other organization', NULL, NULL);
      INSERT INTO users (id, name, email, image) VALUES
        ('zoe', 'Zoe', 'zoe@example.com', NULL),
        ('alice', 'Alice', 'alice@example.com', 'alice.png'),
        ('', NULL, NULL, NULL), ('outsider', 'Other user', NULL, NULL);
      INSERT INTO team_members (id, team_id, user_id, role) VALUES
        (0, 2, '', 'admin'), (2, 2, 'zoe', 'member'), (3, 2, 'alice', 'lead'),
        (4, 1, 'alice', 'member'), (5, 3, 'missing-user', 'member'),
        (6, 4, 'outsider', 'member');
    `);
    (query as jest.Mock).mockReset();
    (query as jest.Mock).mockImplementation(async (sql, args) => (await client.execute({ sql, args })).rows);
  });

  afterEach(() => client.close());

  it('preserves ordered teams, ordered members, timestamps, and empty teams within the organization', async () => {
    const teams = await getTeamsByOrganizationWithMembers(1);

    expect(teams.map(team => team.name)).toEqual(['Alpha', 'Empty', 'Zulu']);
    expect(teams.map(team => team.member_count)).toEqual([3, 0, 1]);
    expect(teams.every(team => team.organization_id === 1)).toBe(true);
    expect(teams[0]).toMatchObject({
      id: 2, description: 'Product team', color: '#123456',
      created_at: '2026-01-01', updated_at: '2026-01-02',
    });
    expect(teams[0].members.map(member => member.user.name)).toEqual([null, 'Alice', 'Zoe']);
    expect(teams[0].members[1]).toEqual({
      id: 3, team_id: 2, user_id: 'alice', role: 'lead',
      joined_at: '2026-03-01', created_at: '2026-03-02', updated_at: '2026-03-03',
      user: {
        id: 'alice', name: 'Alice', email: 'alice@example.com', image: 'alice.png',
        created_at: '2025-01-01', updated_at: '2025-01-02',
      },
    });
    expect(teams[1].members).toEqual([]);
    expect(teams[2].members[0].user_id).toBe('alice');
  });

  it('returns an empty list in one query for an organization without teams', async () => {
    expect(await getTeamsByOrganizationWithMembers(999)).toEqual([]);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each([1, 5, 50])('loads %i populated teams in one query', async (teamCount) => {
    await client.execute({
      sql: `WITH RECURSIVE team_ids(id) AS (
        SELECT 10 UNION ALL SELECT id + 1 FROM team_ids WHERE id < ?
      )
      INSERT INTO teams (id, organization_id, name)
      SELECT id, 3, 'Team ' || id FROM team_ids`,
      args: [teamCount + 9],
    });
    await client.execute(`
      INSERT INTO team_members (team_id, user_id, role)
      SELECT id, 'alice', 'member' FROM teams WHERE organization_id = 3
    `);

    const teams = await getTeamsByOrganizationWithMembers(3);

    expect(teams).toHaveLength(teamCount);
    expect(teams.every(team => team.member_count === 1 && team.members[0].user.id === 'alice')).toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
