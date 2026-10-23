import { expect, it, mock } from 'bun:test';
import '../setup-dom';
const { render, screen } = await import('@testing-library/react');

import { SWRConfig } from 'swr';

mock.module('@/hooks/use-team-filter', () => ({
  useTeamFilter: () => ({ timeRange: '14d' }),
  useTeamFilterParams: () => 'organizationId=1&timeRange=14d',
}));

mock.module('recharts', () => ({
  Bar: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  BarChart: ({ data }: { data: { date: string }[] }) => (
    <div data-testid="chart-dates">{data.map(point => point.date).join(',')}</div>
  ),
}));

mock.module('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ChartLegend: () => null,
  ChartLegendContent: () => null,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

const { InvestmentAreaDistribution } = await import('@/components/investment-area-distribution');

it('uses the selected 14 days for the shared request and chart label', async () => {
  const recentDate = new Date(Date.now() - 10 * 86400000).toISOString();
  const data = {
    categories: [{ key: 'feature', label: 'Features', color: '#3b82f6' }],
    data: [{ date: recentDate, feature: 2 }],
  };
  const originalFetch = global.fetch;
  global.fetch = Object.assign(mock().mockResolvedValue(new Response(JSON.stringify(data))), { preconnect: mock() });

  try {
    render(<SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}><InvestmentAreaDistribution /></SWRConfig>);

    expect((await screen.findAllByText(/Last 14 days/)).length).toBeGreaterThan(0);
    expect(screen.getByTestId('chart-dates')).toHaveTextContent(recentDate);
    expect(global.fetch).toHaveBeenCalledWith('/api/pull-requests/category-distribution?organizationId=1&timeRange=14d&format=timeseries', { cache: 'no-store' });
  } finally {
    global.fetch = originalFetch;
  }
});
