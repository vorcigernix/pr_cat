/** @jest-environment node */

import { createClient, type Client } from '@libsql/client';
import { query } from '@/lib/db';
import { OptimizedTursoMetricsService } from '@/lib/infrastructure/adapters/turso/optimized-metrics.adapter';

jest.mock('@/lib/db', () => ({ query: jest.fn() }));

describe('Repository insights aggregation', () => {
  let client: Client;

  beforeAll(async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-07T12:00:00.000Z').getTime());
    client = createClient({ url: 'file::memory:' });
    await client.executeMultiple(`
      CREATE TABLE repositories (id INTEGER PRIMARY KEY, organization_id INTEGER, name TEXT, full_name TEXT, is_tracked INTEGER);
      CREATE TABLE pull_requests (
        id INTEGER PRIMARY KEY, repository_id INTEGER, author_id TEXT, state TEXT,
        created_at TEXT, merged_at TEXT, additions INTEGER, deletions INTEGER, category_id INTEGER
      );
      CREATE TABLE pr_reviews (id INTEGER PRIMARY KEY, pull_request_id INTEGER);
      CREATE INDEX idx_pr_reviews_pull_request ON pr_reviews(pull_request_id);
      INSERT INTO repositories VALUES
        (1, 1, 'app', 'acme/app', 1), (2, 2, 'other', 'other/app', 1),
        (3, 1, 'untracked', 'acme/untracked', 0), (4, 1, 'empty', 'acme/empty', 1);
      INSERT INTO pull_requests VALUES
        (1, 1, 'alice', 'open', '2026-09-01T12:00:00.000Z', NULL, 10, 0, 1),
        (2, 1, 'bob', 'merged', '2026-09-01T12:00:00.000Z', '2026-09-02T12:00:00.000Z', 20, 10, NULL),
        (3, 1, 'alice', 'open', '2026-01-01T12:00:00.000Z', NULL, 1000, 0, 1),
        (4, 2, 'alice', 'open', '2026-09-01T12:00:00.000Z', NULL, 1000, 0, 1),
        (5, 3, 'alice', 'open', '2026-09-01T12:00:00.000Z', NULL, 1000, 0, 1);
      INSERT INTO pr_reviews VALUES (1, 1), (2, 1), (3, 1);
    `);
    (query as jest.Mock).mockImplementation(async (sql, args) => (await client.execute({ sql, args })).rows);
  });

  afterAll(() => {
    client.close();
    jest.restoreAllMocks();
  });

  it('counts each PR once and keeps metrics unchanged when a reviewed PR receives more reviews', async () => {
    const service = new OptimizedTursoMetricsService();
    const result = await service.getRepositoryInsights('1');

    expect(result.repositories).toHaveLength(1);
    expect(result.repositories[0]).toMatchObject({
      repositoryId: '1',
      metrics: {
        totalPRs: 2, openPRs: 1, avgCycleTime: 24, avgPRSize: 20,
        categorizationRate: 50, contributorCount: 2, reviewCoverage: 50,
      },
    });
    expect(query).toHaveBeenCalledTimes(1);

    await client.execute(`
      WITH RECURSIVE review_ids(id) AS (
        SELECT 4 UNION ALL SELECT id + 1 FROM review_ids WHERE id < 103
      ) INSERT INTO pr_reviews SELECT id, 1 FROM review_ids
    `);
    jest.clearAllMocks();
    expect(await service.getRepositoryInsights('1')).toEqual(result);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
