/** @jest-environment node */

import { createClient, type Client } from '@libsql/client';
import { query } from '@/lib/db';
import { OptimizedTursoPullRequestRepository } from '@/lib/infrastructure/adapters/turso/optimized-pull-request.adapter';
import { TimeRange } from '@/lib/core/domain/value-objects/time-range';

jest.mock('@/lib/db', () => ({ query: jest.fn() }));

describe('Category distribution database filtering', () => {
  let client: Client;
  const repository = new OptimizedTursoPullRequestRepository();
  const range = TimeRange.create(new Date('2026-08-24T00:00:00Z'), new Date('2026-09-07T00:00:00Z'));

  beforeAll(async () => {
    client = createClient({ url: 'file::memory:' });
    await client.executeMultiple(`
      CREATE TABLE repositories (id INTEGER PRIMARY KEY, organization_id INTEGER);
      CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT);
      CREATE TABLE teams (id INTEGER PRIMARY KEY, organization_id INTEGER);
      CREATE TABLE team_members (team_id INTEGER, user_id TEXT);
      CREATE TABLE pull_requests (id INTEGER PRIMARY KEY, repository_id INTEGER, author_id TEXT, category_id INTEGER, created_at TEXT);
      INSERT INTO repositories VALUES (1, 1), (2, 2);
      INSERT INTO categories VALUES (1, 'Features'), (2, 'Bugs');
      INSERT INTO teams VALUES (10, 1), (11, 1), (20, 2);
      INSERT INTO team_members VALUES (10, 'alice'), (11, 'bob'), (20, 'alice');
      INSERT INTO pull_requests VALUES
        (1, 1, 'alice', 1, '2026-09-01T00:00:00.000Z'),
        (2, 1, 'alice', 1, '2026-09-02T00:00:00.000Z'),
        (3, 1, 'bob', 2, '2026-09-02T00:00:00.000Z'),
        (4, 2, 'alice', 1, '2026-09-02T00:00:00.000Z'),
        (5, 1, 'alice', 2, '2026-08-01T00:00:00.000Z'),
        (6, 1, 'bob', NULL, '2026-09-02T00:00:00.000Z');
    `);
    (query as jest.Mock).mockImplementation(async (sql, args) => (await client.execute({ sql, args })).rows);
  });

  afterAll(() => client.close());

  it('counts only the selected team within the organization and date range', async () => {
    expect(await repository.getCategoryDistribution('1', range, 10)).toEqual([
      { categoryName: 'Features', count: 2, percentage: 100 },
    ]);
  });

  it('keeps organization-wide totals when no team is selected', async () => {
    expect(await repository.getCategoryDistribution('1', range)).toEqual(expect.arrayContaining([
      { categoryName: 'Features', count: 2, percentage: 50 },
      { categoryName: 'Bugs', count: 1, percentage: 25 },
      { categoryName: 'Uncategorized', count: 1, percentage: 25 },
    ]));
  });

  it.each([20, 999])('returns no data for a team outside this organization or missing team %i', async (teamId) => {
    expect(await repository.getCategoryDistribution('1', range, teamId)).toEqual([]);
  });
});
