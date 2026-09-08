/** @jest-environment node */

import { createClient, type Client } from '@libsql/client';
import { query } from '@/lib/db';
import { OptimizedTursoMetricsService } from '@/lib/infrastructure/adapters/turso/optimized-metrics.adapter';

jest.mock('@/lib/db', () => ({ query: jest.fn() }));

describe('Scoped team performance aggregation', () => {
  let client: Client;
  const service = new OptimizedTursoMetricsService();

  beforeAll(async () => {
    jest.useFakeTimers({ now: new Date('2026-09-07T12:00:00.000Z'), doNotFake: ['nextTick', 'setImmediate'] });
    client = createClient({ url: 'file::memory:' });
    await client.executeMultiple(`
      CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT);
      CREATE TABLE repositories (id INTEGER PRIMARY KEY, organization_id INTEGER);
      CREATE TABLE teams (id INTEGER PRIMARY KEY, organization_id INTEGER);
      CREATE TABLE team_members (team_id INTEGER, user_id TEXT, UNIQUE (team_id, user_id));
      CREATE TABLE pull_requests (
        id INTEGER PRIMARY KEY, repository_id INTEGER, author_id TEXT, state TEXT,
        created_at TEXT, merged_at TEXT, additions INTEGER, deletions INTEGER
      );
      CREATE TABLE pr_reviews (id INTEGER PRIMARY KEY, pull_request_id INTEGER, reviewer_id TEXT, submitted_at TEXT);
      CREATE INDEX idx_pr_reviews_pull_request_id ON pr_reviews(pull_request_id);
      INSERT INTO users VALUES ('alice', 'Alice'), ('bob', 'Bob'), ('carol', 'Carol'), ('dave', 'Dave'), ('eve', 'Eve');
      INSERT INTO repositories VALUES (1, 1), (2, 1), (3, 2);
      INSERT INTO teams VALUES (10, 1), (11, 1), (20, 2);
      INSERT INTO team_members VALUES (10, 'alice'), (10, 'carol'), (11, 'bob'), (20, 'alice'), (20, 'carol');
      INSERT INTO pull_requests VALUES
        (1, 1, 'alice', 'merged', '2026-09-01T12:00:00Z', '2026-09-02T12:00:00Z', 80, 20),
        (2, 1, 'alice', 'merged', '2026-09-02T12:00:00Z', '2026-09-05T12:00:00Z', 200, 100),
        (3, 1, 'bob', 'merged', '2026-09-03T12:00:00Z', '2026-09-07T12:00:00Z', 200, 0),
        (4, 1, 'bob', 'open', '2026-09-04T12:00:00Z', NULL, 400, NULL),
        (5, 2, 'alice', 'merged', '2026-09-01T12:00:00Z', '2026-09-03T12:00:00Z', 1000, 0),
        (6, 3, 'bob', 'merged', '2026-09-01T12:00:00Z', '2026-09-06T12:00:00Z', 5000, 0),
        (7, 1, 'alice', 'merged', '2026-08-01T12:00:00Z', '2026-08-02T12:00:00Z', 9000, 0),
        (8, 1, NULL, 'merged', '2026-09-01T12:00:00Z', '2026-09-02T12:00:00Z', 50, 0),
        (9, 1, 'alice', 'open', '2026-09-08T12:00:00Z', NULL, 8000, 0),
        (10, 1, 'bob', 'merged', '2026-08-24T12:00:00Z', '2026-08-25T12:00:00Z', 600, 0);
      INSERT INTO pr_reviews VALUES
        (1, 1, 'carol', '2026-09-02T12:00:00Z'),
        (2, 1, 'carol', '2026-09-03T12:00:00Z'),
        (3, 1, 'alice', '2026-09-03T12:00:00Z'),
        (4, 2, 'bob', '2026-09-05T12:00:00Z'),
        (5, 3, 'alice', '2026-09-06T12:00:00Z'),
        (6, 5, 'carol', '2026-09-06T12:00:00Z'),
        (7, 6, 'carol', '2026-09-06T12:00:00Z'),
        (8, 7, 'carol', '2026-09-05T12:00:00Z'),
        (9, 8, 'dave', '2026-09-05T12:00:00Z'),
        (10, 2, 'carol', '2026-08-01T12:00:00Z'),
        (11, 4, 'carol', '2026-09-08T12:00:00Z'),
        (12, 10, 'bob', '2026-08-25T12:00:00Z'),
        (13, 10, 'eve', '2026-08-24T12:00:00Z'),
        (14, 2, NULL, '2026-09-05T12:00:00Z');
    `);
    jest.mocked(query).mockImplementation(async (sql, args) => (await client.execute({ sql, args })).rows);
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(() => {
    client.close();
    jest.useRealTimers();
  });

  it('counts distinct reviewed PRs by submission date and includes reviewer-only contributors', async () => {
    const result = await service.getTeamPerformance('1', ['1']);

    expect(result.teamMembers).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: 'alice', prsCreated: 2, prsReviewed: 1, avgCycleTime: 48, avgPRSize: 200 }),
      expect.objectContaining({ userId: 'bob', prsCreated: 3, prsReviewed: 1, avgCycleTime: 60, avgPRSize: 400 }),
      expect.objectContaining({ userId: 'carol', prsCreated: 0, prsReviewed: 2 }),
      expect.objectContaining({ userId: 'dave', prsCreated: 0, prsReviewed: 1 }),
      expect.objectContaining({ userId: 'eve', prsCreated: 0, prsReviewed: 1 }),
    ]));
    expect(result).toMatchObject({ totalContributors: 5, avgTeamCycleTime: 54, avgTeamPRSize: 320, collaborationIndex: 1.2, reviewCoverage: 80 });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('checks membership on the contributor without restricting the author of reviewed PRs', async () => {
    const result = await service.getTeamPerformance('1', ['1'], 10);

    expect(result.teamMembers.map(member => member.userId)).toEqual(['alice', 'carol']);
    expect(result.teamMembers[0]).toMatchObject({ prsCreated: 2, prsReviewed: 1 });
    expect(result.teamMembers[1]).toMatchObject({ prsCreated: 0, prsReviewed: 2 });
    expect(result).toMatchObject({ avgTeamCycleTime: 48, avgTeamPRSize: 200, collaborationIndex: 1.5, reviewCoverage: 100 });
  });

  it('weights organization cycle and size averages by PR counts', async () => {
    expect(await service.getTeamPerformance('1')).toMatchObject({
      totalContributors: 5, avgTeamCycleTime: 52.8, avgTeamPRSize: 433,
      collaborationIndex: 1.17, reviewCoverage: 83.3,
    });
  });

  it('restricts authors and reviews to selected repositories while retaining organization isolation', async () => {
    const result = await service.getTeamPerformance('1', ['2', '3']);

    expect(result.teamMembers).toEqual([
      expect.objectContaining({ userId: 'alice', prsCreated: 1, prsReviewed: 0 }),
      expect.objectContaining({ userId: 'carol', prsCreated: 0, prsReviewed: 1 }),
    ]);
    expect(result).toMatchObject({ totalContributors: 2, avgTeamCycleTime: 48, avgTeamPRSize: 1000, collaborationIndex: 1, reviewCoverage: 100 });
  });

  it.each([20, 999])('returns no contributors for foreign or missing team %i', async teamId => {
    expect(await service.getTeamPerformance('1', ['1'], teamId)).toEqual({
      teamMembers: [], totalContributors: 0, avgTeamCycleTime: 0,
      avgTeamPRSize: 0, collaborationIndex: 0, reviewCoverage: 0,
    });
  });

  it('uses the requested window for review activity independently of the PR creation date', async () => {
    const result = await service.getTeamPerformance('1', ['1'], undefined, '7d');

    expect(result.teamMembers.map(member => member.userId)).not.toContain('eve');
    expect(result.teamMembers.find(member => member.userId === 'carol')).toMatchObject({ prsCreated: 0, prsReviewed: 2 });
    expect(result).toMatchObject({ avgTeamCycleTime: 64, avgTeamPRSize: 250, collaborationIndex: 1.25, reviewCoverage: 75 });
  });
});
