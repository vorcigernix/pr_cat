/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/pull-requests/category-distribution/route';
import { ServiceLocator } from '@/lib/core';

jest.mock('@/lib/core', () => ({
  ...jest.requireActual('@/lib/core/domain/value-objects/time-range'),
  ServiceLocator: { getPullRequestRepository: jest.fn() },
  withAuth: (handler: (context: { organizationId: string }, request: NextRequest) => Promise<Response>) =>
    (request: NextRequest) => handler({ organizationId: '1' }, request),
}));

const repository = {
  getCategoryDistribution: jest.fn(),
  getCategoryTimeSeries: jest.fn(),
};

describe('Category distribution filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T12:00:00Z'));
    (ServiceLocator.getPullRequestRepository as jest.Mock).mockResolvedValue(repository);
    repository.getCategoryDistribution.mockResolvedValue([]);
    repository.getCategoryTimeSeries.mockResolvedValue({ data: [], categories: [] });
  });

  afterEach(() => jest.useRealTimers());

  it('uses the selected 14 days and team for category totals', async () => {
    const response = await GET(new NextRequest('http://localhost/api/pull-requests/category-distribution?timeRange=14d&teamId=10'));

    expect(response.status).toBe(200);
    const [organizationId, range, teamId] = repository.getCategoryDistribution.mock.calls[0];
    expect(organizationId).toBe('1');
    expect(range.toFilter()).toEqual({ from: '2026-08-24T12:00:00.000Z', to: '2026-09-07T12:00:00.000Z' });
    expect(teamId).toBe(10);
  });

  it.each([7, 14, 30, 90])('uses exactly %i days for the category chart', async (days) => {
    const response = await GET(new NextRequest(`http://localhost/api/pull-requests/category-distribution?format=timeseries&timeRange=${days}d&teamId=10`));

    expect(response.status).toBe(200);
    expect(repository.getCategoryTimeSeries).toHaveBeenCalledWith('1', days, 10, undefined);
  });

  it.each(['timeRange=invalid', 'timeRange=__proto__', 'format=unknown', 'teamId=abc', 'teamId=-1', 'teamId=1.5', 'teamId=1abc'])('rejects invalid filters %s before calling the repository', async (filters) => {
    const response = await GET(new NextRequest(`http://localhost/api/pull-requests/category-distribution?${filters}`));

    expect(response.status).toBe(400);
    expect(ServiceLocator.getPullRequestRepository).not.toHaveBeenCalled();
  });
});
