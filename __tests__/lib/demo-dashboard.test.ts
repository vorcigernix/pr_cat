/** @jest-environment node */

import { DemoMetricsService } from '@/lib/infrastructure/adapters/demo/metrics.adapter';
import { DemoPullRequestRepository } from '@/lib/infrastructure/adapters/demo/pull-request.adapter';
import { Pagination, TimeRange } from '@/lib/core/domain/value-objects';

describe('Demo dashboard filter compatibility', () => {
  const repository = new DemoPullRequestRepository();
  const metrics = new DemoMetricsService();

  beforeAll(() => {
    jest.useFakeTimers({ now: new Date('2040-06-20T12:00:00.000Z') });
  });
  afterAll(() => jest.useRealTimers());

  it('returns only the chosen repository with canonical IDs and both changed-line counts', async () => {
    const result = await repository.getRecent('demo-org-1', undefined, undefined, '14d', 'demo-repo-1');

    expect(result.pagination.total).toBe(1);
    expect(result.data).toEqual([expect.objectContaining({
      id: 'demo-pr-1', repository: { id: 'demo-repo-1', name: 'frontend-app' },
      linesAdded: 245, linesRemoved: 18, createdAt: '2040-06-08T12:00:00.000Z', cycleTime: 48,
    })]);
    expect(await repository.getById('demo-pr-1')).toMatchObject({
      repository: { id: 'demo-repo-1' }, linesRemoved: 18,
    });
    expect((await repository.getByRepository('demo-repo-1')).data.map(pr => pr.id)).toEqual(['demo-pr-1']);
  });

  it('filters relative dates before pagination and keeps the total scoped', async () => {
    const short = await repository.getRecent('demo-org-1', undefined, undefined, '7d', 'demo-repo-2');
    expect(short.data.map(pr => pr.id)).toEqual(['demo-pr-5', 'demo-pr-4', 'demo-pr-3']);
    expect(short.pagination.total).toBe(3);
    expect((await repository.getRecent('demo-org-1', undefined, undefined, '7d', 'demo-repo-1')).data).toEqual([]);
    const page = await repository.getRecent('demo-org-1', Pagination.create(2, 2), undefined, '14d', 'demo-repo-2');
    expect(page.data.map(pr => pr.id)).toEqual(['demo-pr-3', 'demo-pr-2']);
    expect(page.pagination).toMatchObject({ total: 4, totalPages: 2, hasNext: false, hasPrev: true });
  });

  it('uses the existing demo membership IDs for team selection', async () => {
    expect((await repository.getRecent('demo-org-1', undefined, 1, '14d')).data.map(pr => pr.id))
      .toEqual(['demo-pr-5', 'demo-pr-2', 'demo-pr-1']);
    expect((await repository.getRecent('demo-org-1', undefined, 2, '14d')).data.map(pr => pr.id)).toEqual(['demo-pr-3']);
    expect((await repository.getRecent('demo-org-1', undefined, 999, '14d')).data).toEqual([]);
  });

  it.each([
    ['other-org', 'demo-repo-1'], ['demo-org-1', 'demo-repo-999'], ['demo-org-1', 'demo-repo-3'],
  ])('returns an empty page for organization %s / repository %s without sample PRs', async (organizationId, repositoryId) => {
    const result = await repository.getRecent(organizationId, undefined, undefined, '14d', repositoryId);
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it('derives scoped category totals from the same relative PR fixtures', async () => {
    const range = TimeRange.create(new Date('2040-06-06T12:00:00.000Z'), new Date());
    expect(await repository.getCategoryDistribution('demo-org-1', range, 1, 'demo-repo-1')).toEqual([
      { categoryName: 'Feature Development', count: 1, percentage: 100 },
    ]);
    expect(await repository.getCategoryDistribution('demo-org-1', range, 2, 'demo-repo-1')).toEqual([]);
  });

  it('keeps simulated contribution scores equal to created plus reviewed and scopes contributors', async () => {
    const all = await metrics.getTeamPerformance('demo-org-1');
    for (const member of all.teamMembers) expect(member.contributionScore).toBe(member.prsCreated + member.prsReviewed);
    const frontend = await metrics.getTeamPerformance('demo-org-1', ['demo-repo-1'], 1);
    expect(frontend.teamMembers).toEqual([expect.objectContaining({ userId: 'demo-user-1', prsCreated: 18, prsReviewed: 24, contributionScore: 42 })]);
    expect((await metrics.getTeamPerformance('demo-org-1', ['demo-repo-1'], 2)).teamMembers).toEqual([]);
    expect(await metrics.getTeamPerformance('foreign-org')).toMatchObject({ teamMembers: [], totalContributors: 0, reviewCoverage: 0 });
  });

  it('limits simulated repository insight rows and averages to the selected repository', async () => {
    const result = await metrics.getRepositoryInsights('demo-org-1', undefined, '14d', 'demo-repo-2');
    expect(result.repositories.map(repo => repo.repositoryId)).toEqual(['demo-repo-2']);
    expect(result.organizationAverages.avgPRSize).toBe(220);
    const empty = await metrics.getRepositoryInsights('foreign-org');
    expect(empty.repositories).toEqual([]);
    expect(empty.organizationAverages).toEqual({ avgCycleTime: 0, avgPRSize: 0, avgCategorizationRate: 0, avgHealthScore: 0 });
  });
});
