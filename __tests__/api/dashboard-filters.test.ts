import * as actualTimeRange from '@/lib/core/domain/value-objects/time-range';
import * as actualPagination from '@/lib/core/domain/value-objects/pagination';
import { beforeEach, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';

mock.module('@/lib/core', () => ({
  ...actualPagination,
  ...actualTimeRange,
  ServiceLocator: { getMetricsService: mock(), getPullRequestRepository: mock() },
  withAuth: (handler: (context: { organizationId: string }, request: NextRequest) => Promise<Response>) =>
    (request: NextRequest) => handler({ organizationId: '2' }, request),
}));

const { GET: summary } = await import('@/app/api/metrics/summary/route');
const { GET: series } = await import('@/app/api/metrics/time-series/route');
const { GET: team } = await import('@/app/api/metrics/team-performance/route');
const { GET: recommendations } = await import('@/app/api/metrics/recommendations/route');
const { GET: insights } = await import('@/app/api/metrics/repository-insights/route');
const { GET: recent } = await import('@/app/api/pull-requests/recent/route');
const { GET: categories } = await import('@/app/api/pull-requests/category-distribution/route');
const { ServiceLocator } = await import('@/lib/core');

const services = {
  getSummary: mock(), getTimeSeries: mock(), getTeamPerformance: mock(),
  getRecommendations: mock(), getRepositoryInsights: mock(), getRecent: mock(),
  getCategoryDistribution: mock(), getCategoryTimeSeries: mock(),
};
const routes = [summary, series, team, recommendations, insights, recent, categories];
const request = (params = '') => new NextRequest(`http://localhost/api/test?${params}`);

beforeEach(() => {
  mock.clearAllMocks();
  Object.values(services).forEach(mock => mock.mockResolvedValue([]));
  (ServiceLocator.getMetricsService as ReturnType<typeof mock>).mockResolvedValue(services);
  (ServiceLocator.getPullRequestRepository as ReturnType<typeof mock>).mockResolvedValue(services);
});

it.each([
  [summary, 'getSummary'], [recommendations, 'getRecommendations'], [insights, 'getRepositoryInsights'],
] as const)('passes organization, team, period and repository to %s', async (route, method) => {
  const response = await route(request('teamId=10&repositoryId=20&timeRange=7d'));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(services[method]).toHaveBeenCalledWith('2', 10, '7d', '20');
});

it('uses the same 14-day default across dashboard endpoints', async () => {
  await Promise.all(routes.map(route => route(request())));
  expect(services.getSummary).toHaveBeenCalledWith('2', undefined, '14d', undefined);
  expect(services.getTimeSeries).toHaveBeenCalledWith('2', 14, undefined, undefined);
  expect(services.getTeamPerformance).toHaveBeenCalledWith('2', undefined, undefined, '14d');
  expect(services.getRecommendations).toHaveBeenCalledWith('2', undefined, '14d', undefined);
  expect(services.getRepositoryInsights).toHaveBeenCalledWith('2', undefined, '14d', undefined);
  expect(services.getRecent).toHaveBeenCalledWith('2', expect.objectContaining({ page: 1, limit: 10 }), undefined, '14d', undefined);
  const range = services.getCategoryDistribution.mock.calls[0][1];
  expect(range.end.getTime() - range.start.getTime()).toBe(14 * 86400000);
});

it('preserves explicit days and legacy repository list while accepting the shared repository filter', async () => {
  await series(request('days=30&timeRange=7d&repositoryId=20&teamId=10'));
  expect(services.getTimeSeries).toHaveBeenCalledWith('2', 30, '20', 10);
  await team(request('repositoryIds=20,21&timeRange=7d'));
  expect(services.getTeamPerformance).toHaveBeenLastCalledWith('2', ['20', '21'], undefined, '7d');
  await team(request('repositoryId=22&repositoryIds=20,21&timeRange=14d&teamId=10'));
  expect(services.getTeamPerformance).toHaveBeenLastCalledWith('2', ['22'], 10, '14d');
  await recent(request('page=2&limit=100&repositoryId=20&teamId=10&timeRange=7d'));
  expect(services.getRecent).toHaveBeenCalledWith('2', expect.objectContaining({ page: 2, limit: 100 }), 10, '7d', '20');
  await categories(request('format=timeseries&repositoryId=20&teamId=10&timeRange=7d'));
  expect(services.getCategoryTimeSeries).toHaveBeenCalledWith('2', 7, 10, '20');
});

it.each(['teamId=abc', 'teamId=1.5', 'teamId=0', 'repositoryId=abc', 'repositoryId=1abc', 'repositoryId=9007199254740992', 'timeRange=365d'])('rejects %s on all dashboard endpoints', async params => {
  const responses = await Promise.all(routes.map(route => route(request(params))));
  responses.forEach(response => expect(response.status).toBe(400));
  expect(ServiceLocator.getMetricsService).not.toHaveBeenCalled();
  expect(ServiceLocator.getPullRequestRepository).not.toHaveBeenCalled();
});

it.each(['days=0', 'days=-1', 'days=367', 'days=NaN', 'days=1.5'])('bounds the time-series query: %s', async params => {
  expect((await series(request(params))).status).toBe(400);
  expect(ServiceLocator.getMetricsService).not.toHaveBeenCalled();
});

it.each(['page=0', 'page=NaN', 'limit=101', 'limit=0', 'limit=2.5'])('rejects invalid pagination: %s', async params => {
  expect((await recent(request(params))).status).toBe(400);
  expect(ServiceLocator.getPullRequestRepository).not.toHaveBeenCalled();
});
