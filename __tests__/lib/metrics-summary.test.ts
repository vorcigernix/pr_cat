/** @jest-environment node */

import { createClient, type Client } from '@libsql/client';
import { query } from '@/lib/db';
import { OptimizedTursoMetricsService } from '@/lib/infrastructure/adapters/turso/optimized-metrics.adapter';

jest.mock('@/lib/db', () => ({ query: jest.fn() }));

describe('Dashboard summary database queries', () => {
  let client: Client;
  const service = new OptimizedTursoMetricsService();

  beforeAll(async () => {
    jest.useFakeTimers({ now: new Date('2026-09-07T12:00:00.000Z'), doNotFake: ['nextTick', 'setImmediate'] });
    client = createClient({ url: 'file::memory:' });
    await client.executeMultiple(`
      CREATE TABLE repositories (id INTEGER PRIMARY KEY, organization_id INTEGER, is_tracked INTEGER);
      CREATE TABLE teams (id INTEGER PRIMARY KEY, organization_id INTEGER);
      CREATE TABLE team_members (team_id INTEGER, user_id TEXT, UNIQUE(team_id, user_id));
      CREATE TABLE pull_requests (
        id INTEGER PRIMARY KEY, repository_id INTEGER, author_id TEXT, state TEXT,
        created_at TEXT, merged_at TEXT, additions INTEGER, deletions INTEGER, category_id INTEGER
      );
      INSERT INTO repositories VALUES (1, 1, 1), (2, 1, 0), (3, 2, 1), (4, 3, 1);
      INSERT INTO teams VALUES (10, 1), (20, 2);
      INSERT INTO team_members VALUES (10, 'alice'), (20, 'alice');
      INSERT INTO pull_requests VALUES
        (1, 1, 'alice', 'merged', '2026-08-25T12:00:00.000Z', '2026-09-01T12:00:00.000Z', 10, 5, 1),
        (2, 1, 'alice', 'merged', '2026-08-30T12:00:00.000Z', '2026-08-30T12:00:00.000Z', 20, 0, NULL),
        (3, 1, 'bob', 'merged', '2026-08-10T12:00:00.000Z', '2026-08-20T12:00:00.000Z', 100, 100, 1),
        (4, 1, 'alice', 'merged', '2026-08-10T12:00:00.000Z', '2026-08-15T12:00:00.000Z', 100, 100, NULL),
        (5, 1, 'alice', 'open', '2026-09-02T12:00:00.000Z', NULL, NULL, 10, 1),
        (6, 2, 'bob', 'open', '2026-09-03T12:00:00.000Z', NULL, 30, 10, NULL),
        (7, 3, 'alice', 'merged', '2026-09-02T12:00:00.000Z', '2026-09-02T12:00:00.000Z', 999, 999, 1),
        (8, 1, 'bob', 'closed', '2026-09-04T12:00:00.000Z', NULL, NULL, NULL, 1),
        (9, 1, 'alice', 'merged', '2026-06-01T12:00:00.000Z', '2026-06-01T12:00:00.000Z', 999, 999, NULL),
        (10, 1, 'alice', 'merged', '2026-07-01T12:00:00.000Z', '2026-08-26T12:00:00.000Z', 1000, 0, NULL),
        (11, 1, 'bob', 'merged', '2026-08-24T12:00:00.000Z', '2026-08-24T12:00:00.000Z', 5, 5, 1),
        (12, 1, 'bob', 'merged', '2026-08-01T12:00:00.000Z', '2026-08-10T12:00:00.000Z', 100, 0, NULL),
        (13, 4, 'bob', 'open', '2026-09-02T12:00:00.000Z', NULL, NULL, NULL, NULL),
        (14, 4, 'bob', 'open', '2026-09-02T12:00:00.000Z', NULL, 0, 0, NULL);
    `);
    (query as jest.Mock).mockImplementation(async (sql, args) => (await client.execute({ sql, args })).rows);
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(() => {
    client.close();
    jest.useRealTimers();
  });

  it('loads current and previous periods in three queries, preserving distinct creation and merge dates', async () => {
    expect(await service.getSummary('1')).toMatchObject({
      trackedRepositories: 1,
      prsMergedThisWeek: 4,
      prsMergedLastWeek: 3,
      weeklyPRVolumeChange: 33.3,
      averagePRSize: 21, sizedPRCount: 4,
      openPRCount: 2,
      categorizationRate: 66.7,
      lastUpdated: '2026-09-07T12:00:00.000Z',
    });
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('keeps team statistics isolated while counting tracked repositories for the organization', async () => {
    expect(await service.getSummary('1', 10, '14d')).toMatchObject({
      trackedRepositories: 1,
      prsMergedThisWeek: 3,
      prsMergedLastWeek: 1,
      weeklyPRVolumeChange: 200,
      averagePRSize: 18, sizedPRCount: 2,
      openPRCount: 1,
      categorizationRate: 66.7,
    });
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('uses the requested seven-day comparison window', async () => {
    expect(await service.getSummary('1', undefined, '7d')).toMatchObject({
      prsMergedThisWeek: 1, prsMergedLastWeek: 3, weeklyPRVolumeChange: -66.7,
      averagePRSize: 40, sizedPRCount: 1, openPRCount: 2, categorizationRate: 66.7,
    });
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('distinguishes recorded zero-line changes from missing size data', async () => {
    expect(await service.getSummary('3')).toMatchObject({ averagePRSize: 0, sizedPRCount: 1, openPRCount: 2 });
  });

  it.each([
    ['1', 20, 1], ['1', 999, 1], ['999', undefined, 0],
  ] as const)('returns zero PR metrics for organization %s and foreign, missing, or empty team %s', async (organizationId, teamId, trackedRepositories) => {
    expect(await service.getSummary(organizationId, teamId)).toMatchObject({
      trackedRepositories,
      prsMergedThisWeek: 0, prsMergedLastWeek: 0, weeklyPRVolumeChange: 0,
      averagePRSize: 0, sizedPRCount: 0, openPRCount: 0, categorizationRate: 0,
    });
    expect(query).toHaveBeenCalledTimes(3);
  });
});
