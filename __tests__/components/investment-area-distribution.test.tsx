import { render, screen } from '@testing-library/react';
import { InvestmentAreaDistribution } from '@/components/investment-area-distribution';
import { SWRConfig } from 'swr';

jest.mock('@/hooks/use-team-filter', () => ({
  useTeamFilter: () => ({ timeRange: '14d' }),
  useTeamFilterParams: () => 'organizationId=1&timeRange=14d',
}));

jest.mock('recharts', () => ({
  Bar: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  BarChart: ({ data }: { data: { date: string }[] }) => (
    <div data-testid="chart-dates">{data.map(point => point.date).join(',')}</div>
  ),
}));

jest.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ChartLegend: () => null,
  ChartLegendContent: () => null,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

it('uses the selected 14 days for the shared request and chart label', async () => {
  const recentDate = new Date(Date.now() - 10 * 86400000).toISOString();
  const data = {
    categories: [{ key: 'feature', label: 'Features', color: '#3b82f6' }],
    data: [{ date: recentDate, feature: 2 }],
  };
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(data)));

  try {
    render(<SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}><InvestmentAreaDistribution /></SWRConfig>);

    expect((await screen.findAllByText(/Last 14 days/)).length).toBeGreaterThan(0);
    expect(screen.getByTestId('chart-dates')).toHaveTextContent(recentDate);
    expect(global.fetch).toHaveBeenCalledWith('/api/pull-requests/category-distribution?organizationId=1&timeRange=14d&format=timeseries', { cache: 'no-store' });
  } finally {
    global.fetch = originalFetch;
  }
});
