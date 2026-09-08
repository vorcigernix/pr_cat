/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { query } from '@/lib/db';
import { OptimizedTursoMetricsService } from '@/lib/infrastructure/adapters/turso/optimized-metrics.adapter';
import { OptimizedTursoPullRequestRepository } from '@/lib/infrastructure/adapters/turso/optimized-pull-request.adapter';
import { TimeRange } from '@/lib/core/domain/value-objects/time-range';

jest.mock('@/lib/db', () => ({ query: jest.fn() }));

describe('Consistent dashboard repository filters', () => {
  let client: Client;
  const metrics = new OptimizedTursoMetricsService();
  const pullRequests = new OptimizedTursoPullRequestRepository();
  const range = TimeRange.create(new Date('2026-08-24T12:00:00.000Z'), new Date('2026-09-07T12:00:00.000Z'));

  beforeAll(async () => {
    jest.useFakeTimers({ now: new Date('2026-09-07T12:00:00.000Z'), doNotFake: ['nextTick', 'setImmediate'] });
    client = createClient({ url: 'file::memory:' });
    await client.executeMultiple(readFileSync(join(process.cwd(), 'lib/schema.sql'), 'utf8'));
    await client.executeMultiple(`
      CREATE TABLE teams (id INTEGER PRIMARY KEY, organization_id INTEGER);
      CREATE TABLE team_members (team_id INTEGER, user_id TEXT, UNIQUE (team_id, user_id));
      INSERT INTO organizations (id, name) VALUES (1, 'one'), (2, 'two');
      INSERT INTO users (id, name) VALUES ('alice', 'Alice'), ('bob', 'Bob');
      INSERT INTO repositories (id, organization_id, name, full_name, is_tracked) VALUES
        (1, 1, 'app', 'one/app', 1), (2, 1, 'web', 'one/web', 1), (3, 2, 'app', 'two/app', 1);
      INSERT INTO categories (id, name, is_default) VALUES (1, 'Features', 1), (2, 'Bugs', 1);
      INSERT INTO teams VALUES (10, 1), (11, 1), (20, 2);
      INSERT INTO team_members VALUES (10, 'alice'), (11, 'bob'), (20, 'alice');
      INSERT INTO pull_requests (id, github_id, repository_id, number, title, author_id, state, created_at, updated_at, merged_at, additions, deletions, category_id) VALUES
        (1, 101, 1, 1, 'App feature', 'alice', 'merged', '2026-09-01T12:00:00.000Z', '2026-09-02T12:00:00.000Z', '2026-09-02T12:00:00.000Z', 80, 20, 1),
        (2, 102, 1, 2, 'App open PR', 'bob', 'open', '2026-09-03T12:00:00.000Z', '2026-09-03T12:00:00.000Z', NULL, 200, 0, NULL),
        (3, 103, 2, 1, 'Web bug', 'alice', 'merged', '2026-09-02T12:00:00.000Z', '2026-09-05T12:00:00.000Z', '2026-09-05T12:00:00.000Z', 200, 100, 2),
        (4, 104, 3, 1, 'Foreign PR', 'alice', 'merged', '2026-09-02T12:00:00.000Z', '2026-09-03T12:00:00.000Z', '2026-09-03T12:00:00.000Z', 5000, 0, 1),
        (5, 105, 1, 3, 'Old app PR', 'alice', 'merged', '2026-08-01T12:00:00.000Z', '2026-08-02T12:00:00.000Z', '2026-08-02T12:00:00.000Z', 9000, 0, 1);
      INSERT INTO pr_reviews (id, github_id, pull_request_id, reviewer_id, state, submitted_at) VALUES
        (1, 201, 1, 'bob', 'approved', '2026-09-02T12:00:00.000Z');
    `);
    jest.mocked(query).mockImplementation(async (sql, args) => (await client.execute({ sql, args })).rows);
  });

  afterAll(() => {
    client.close();
    jest.useRealTimers();
  });

  it('applies one repository selection to summary, recent PRs, category distribution and insights', async () => {
    expect(await metrics.getSummary('1', undefined, '14d', '2')).toMatchObject({
      trackedRepositories: 1, prsMergedThisWeek: 1, prsMergedLastWeek: 0,
      averagePRSize: 300, openPRCount: 0, categorizationRate: 100,
    });
    const recent = await pullRequests.getRecent('1', undefined, undefined, '14d', '2');
    expect(recent.data.map(pr => pr.id)).toEqual(['3']);
    expect(recent.pagination.total).toBe(1);
    expect(await pullRequests.getCategoryDistribution('1', range, undefined, '2')).toEqual([
      { categoryName: 'Bugs', count: 1, percentage: 100 },
    ]);
    const insights = await metrics.getRepositoryInsights('1', undefined, '14d', '2');
    expect(insights.repositories).toEqual([expect.objectContaining({
      repositoryId: '2', metrics: expect.objectContaining({ totalPRs: 1, avgPRSize: 300, avgCycleTime: 72 }),
    })]);
  });

  it('combines repository and team filters while excluding older data', async () => {
    expect(await metrics.getSummary('1', 10, '14d', '1')).toMatchObject({ averagePRSize: 100, openPRCount: 0, prsMergedThisWeek: 1 });
    const recent = await pullRequests.getRecent('1', undefined, 10, '14d', '1');
    expect(recent.data.map(pr => pr.id)).toEqual(['1']);
    expect(recent.pagination.total).toBe(1);
    expect(await pullRequests.getCategoryDistribution('1', range, 10, '1')).toEqual([
      { categoryName: 'Features', count: 1, percentage: 100 },
    ]);
    expect((await metrics.getRepositoryInsights('1', 10, '14d', '1')).repositories[0].metrics)
      .toMatchObject({ totalPRs: 1, avgPRSize: 100, reviewCoverage: 100 });
  });

  it.each([
    { repositoryId: '3', teamId: undefined },
    { repositoryId: '999', teamId: undefined },
    { repositoryId: '1', teamId: 20 },
    { repositoryId: '2', teamId: 11 },
  ])('returns no PR data for inaccessible or disjoint scopes $repositoryId / $teamId', async ({ repositoryId, teamId }) => {
    expect(await metrics.getSummary('1', teamId, '14d', repositoryId)).toMatchObject({
      prsMergedThisWeek: 0, prsMergedLastWeek: 0, averagePRSize: 0, openPRCount: 0, categorizationRate: 0,
    });
    const recent = await pullRequests.getRecent('1', undefined, teamId, '14d', repositoryId);
    expect(recent.data).toEqual([]);
    expect(recent.pagination.total).toBe(0);
    expect(await pullRequests.getCategoryDistribution('1', range, teamId, repositoryId)).toEqual([]);
    expect((await metrics.getRepositoryInsights('1', teamId, '14d', repositoryId)).repositories).toEqual([]);
  });

  it('applies the selected repository to throughput and category time series', async () => {
    const throughput = await metrics.getTimeSeries('1', 14, '2', 10);
    expect(throughput.reduce((sum, day) => sum + day.prThroughput, 0)).toBe(1);
    const categories = await pullRequests.getCategoryTimeSeries('1', 14, 10, '2');
    expect(categories.data.reduce((sum, day) => sum + Number(day.Bugs), 0)).toBe(1);
    expect(categories.data.reduce((sum, day) => sum + Number(day.Features), 0)).toBe(0);
  });
});
