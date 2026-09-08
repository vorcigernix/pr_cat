import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { TeamFilterProvider, useTeamFilter, useTeamFilterParams } from '@/hooks/use-team-filter';
import { useDashboardQuery } from '@/hooks/use-metrics';

jest.mock('next/navigation', () => {
  const React = jest.requireActual('react');
  return {
    useSearchParams: () => {
      const search = React.useSyncExternalStore(
        (notify: () => void) => {
          window.addEventListener('popstate', notify);
          window.addEventListener('test-url-change', notify);
          return () => { window.removeEventListener('popstate', notify); window.removeEventListener('test-url-change', notify); };
        },
        () => window.location.search,
      );
      return React.useMemo(() => new URLSearchParams(search), [search]);
    },
  };
});

const originalFetch = global.fetch;
const originalPush = window.history.pushState;
const originalReplace = window.history.replaceState;
const mockFetch = jest.fn();
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const organizations = [{ id: 1, name: 'First org' }, { id: '2', name: 'Second org' }];
const teams = {
  '1': [{ id: 11, organization_id: 1, name: 'First team' }],
  '2': [{ id: 22, organization_id: 2, name: 'Second team' }],
};

function defaultResponse(url: string): Promise<Response> {
  const parsed = new URL(url, window.location.origin);
  if (parsed.pathname === '/api/organizations') return Promise.resolve(json(organizations));
  const orgId = parsed.searchParams.get('organizationId') || parsed.pathname.split('/')[3];
  if (parsed.pathname.endsWith('/teams')) return Promise.resolve(json(teams[orgId as keyof typeof teams]));
  if (parsed.pathname === '/api/repositories') return Promise.resolve(json({ repositories: [{ id: orgId === '1' ? '101' : '202', name: `Repo ${orgId}`, last_synced_at: '2026-09-01T12:00:00Z' }] }));
  if (parsed.pathname === '/api/metrics/summary') return Promise.resolve(json({ label: `Metric ${orgId}` }));
  return Promise.reject(new Error(`Unexpected request: ${url}`));
}

function Dashboard() {
  const filters = useTeamFilter();
  const params = useTeamFilterParams();
  const query = useDashboardQuery<{ label: string }>('/api/metrics/summary');
  return <>
    <output data-testid="params">{params}</output>
    <output data-testid="organization">{filters.selectedOrganization?.name ?? 'none'}</output>
    <output data-testid="team">{filters.selectedTeam?.name ?? 'all'}</output>
    <output data-testid="repository">{filters.selectedRepositoryId}</output>
    <output data-testid="ready">{String(filters.ready)}</output>
    <output data-testid="refreshed">{filters.lastRefreshed ?? 'never'}</output>
    <output data-testid="synced">{filters.repositories[0]?.last_synced_at ?? 'never'}</output>
    <output data-testid="metric">{query.data?.label ?? 'pending'}</output>
    {filters.error && <p role="alert">{filters.error}</p>}
    <button onClick={() => filters.setSelectedOrganization(filters.organizations[1])}>Second organization</button>
    <button onClick={() => filters.setSelectedTeam(filters.teams[0])}>Select team</button>
    <button onClick={() => filters.setSelectedRepositoryId(filters.repositories[0].id)}>Select repository</button>
    <button onClick={() => filters.setTimeRange('30d')}>Last month</button>
    <button onClick={() => void filters.refreshData()} disabled={filters.refreshing}>Refresh</button>
  </>;
}

function renderDashboard() {
  const cache = new Map();
  return render(<SWRConfig value={{ provider: () => cache, dedupingInterval: 0, shouldRetryOnError: false, revalidateOnFocus: false, revalidateOnReconnect: false }}><TeamFilterProvider><Dashboard /></TeamFilterProvider></SWRConfig>);
}

beforeEach(() => {
  localStorage.clear();
  originalReplace.call(window.history, null, '', '/dashboard');
  jest.spyOn(window.history, 'pushState').mockImplementation((...args) => {
    originalPush.apply(window.history, args);
    window.dispatchEvent(new Event('test-url-change'));
  });
  jest.spyOn(window.history, 'replaceState').mockImplementation((...args) => {
    originalReplace.apply(window.history, args);
    window.dispatchEvent(new Event('test-url-change'));
  });
  global.fetch = mockFetch;
  mockFetch.mockReset().mockImplementation(defaultResponse);
});

afterEach(() => jest.restoreAllMocks());
afterAll(() => { global.fetch = originalFetch; });

it('restores valid saved filters before saving or fetching scoped metrics', async () => {
  const saved = { organizationId: '2', teamId: '22', repositoryId: '202', timeRange: '90d' };
  localStorage.setItem('pr_cat_dashboard_filters', JSON.stringify(saved));
  renderDashboard();
  expect(await screen.findByText('Metric 2')).toBeInTheDocument();
  expect(screen.getByTestId('params')).toHaveTextContent('organizationId=2&timeRange=90d&teamId=22&repositoryId=202');
  expect(JSON.parse(localStorage.getItem('pr_cat_dashboard_filters')!)).toEqual(saved);
  expect(mockFetch.mock.calls.some(([url]) => String(url).includes('organizationId=1'))).toBe(false);
});

it('gives explicit URL filters precedence over saved selections', async () => {
  window.history.replaceState(null, '', '/dashboard?organizationId=1&timeRange=7d');
  localStorage.setItem('pr_cat_dashboard_filters', JSON.stringify({ organizationId: '2', teamId: '22', repositoryId: '202', timeRange: '90d' }));
  renderDashboard();
  expect(await screen.findByText('Metric 1')).toBeInTheDocument();
  expect(screen.getByTestId('params')).toHaveTextContent('organizationId=1&timeRange=7d');
  expect(screen.getByTestId('team')).toHaveTextContent('all');
  expect(screen.getByTestId('repository')).toHaveTextContent('all');
});

it('clears stale team and repository filters when the organization changes', async () => {
  window.history.replaceState(null, '', '/dashboard?organizationId=1&teamId=11&repositoryId=101&timeRange=14d');
  renderDashboard();
  expect(await screen.findByText('Metric 1')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Second organization' }));
  expect(await screen.findByText('Metric 2')).toBeInTheDocument();
  expect(window.location.search).toBe('?organizationId=2&timeRange=14d');
  expect(screen.getByTestId('team')).toHaveTextContent('all');
  expect(screen.getByTestId('repository')).toHaveTextContent('all');
});

it('restores selections on browser Back and Forward', async () => {
  window.history.replaceState(null, '', '/dashboard?organizationId=1&timeRange=14d');
  renderDashboard();
  expect(await screen.findByText('Metric 1')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Select team' }));
  await waitFor(() => expect(screen.getByTestId('team')).toHaveTextContent('First team'));
  fireEvent.click(screen.getByRole('button', { name: 'Last month' }));
  await waitFor(() => expect(screen.getByTestId('params')).toHaveTextContent('timeRange=30d'));
  act(() => window.history.back());
  await waitFor(() => expect(screen.getByTestId('params')).toHaveTextContent('timeRange=14d&teamId=11'));
  act(() => window.history.forward());
  await waitFor(() => expect(screen.getByTestId('params')).toHaveTextContent('timeRange=30d&teamId=11'));
});

it('restores the saved selection when navigation drops all filter parameters', async () => {
  window.history.replaceState(null, '', '/dashboard?organizationId=2&teamId=22&timeRange=30d');
  renderDashboard();
  expect(await screen.findByText('Metric 2')).toBeInTheDocument();
  act(() => window.history.pushState(null, '', '/dashboard/lifecycle'));
  await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
  expect(screen.getByTestId('params')).toHaveTextContent('organizationId=2&timeRange=30d&teamId=22');
});

it('removes invalid team/repository and time-range values before metric requests', async () => {
  window.history.replaceState(null, '', '/dashboard?organizationId=1&teamId=22&repositoryId=202&timeRange=invalid');
  renderDashboard();
  expect(await screen.findByText('Metric 1')).toBeInTheDocument();
  expect(screen.getByTestId('params')).toHaveTextContent('organizationId=1&timeRange=14d');
  expect(mockFetch.mock.calls.filter(([url]) => String(url).startsWith('/api/metrics/')).map(([url]) => url)).toEqual(['/api/metrics/summary?organizationId=1&timeRange=14d']);
});

it('ignores a late team response from the previous organization', async () => {
  let resolveTeams!: (response: Response) => void;
  mockFetch.mockImplementation((url: string) => url === '/api/organizations/1/teams'
    ? new Promise<Response>(resolve => { resolveTeams = resolve; })
    : defaultResponse(url));
  renderDashboard();
  await waitFor(() => expect(screen.getByTestId('organization')).toHaveTextContent('First org'));
  fireEvent.click(screen.getByRole('button', { name: 'Second organization' }));
  expect(await screen.findByText('Metric 2')).toBeInTheDocument();
  await act(async () => resolveTeams(json(teams['1'])));
  fireEvent.click(screen.getByRole('button', { name: 'Select team' }));
  await waitFor(() => expect(screen.getByTestId('team')).toHaveTextContent('Second team'));
  expect(screen.getByTestId('params')).toHaveTextContent('organizationId=2&timeRange=14d&teamId=22');
});

it('refreshes mounted metric queries without inventing a GitHub sync timestamp', async () => {
  renderDashboard();
  expect(await screen.findByText('Metric 1')).toBeInTheDocument();
  mockFetch.mockImplementation((url: string) => String(url).startsWith('/api/metrics/') ? Promise.resolve(json({ label: 'Updated metric' })) : defaultResponse(url));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  expect(await screen.findByText('Updated metric')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByTestId('refreshed')).not.toHaveTextContent('never'));
  expect(screen.getByTestId('synced')).toHaveTextContent('2026-09-01T12:00:00Z');
});

it('reports a failed metric revalidation without claiming a successful refresh', async () => {
  renderDashboard();
  expect(await screen.findByText('Metric 1')).toBeInTheDocument();
  mockFetch.mockImplementation((url: string) => String(url).startsWith('/api/metrics/') ? Promise.resolve(json({ error: 'Unavailable' }, 503)) : defaultResponse(url));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Some dashboard data could not be refreshed');
  expect(screen.getByTestId('refreshed')).toHaveTextContent('never');
  expect(screen.getByTestId('metric')).toHaveTextContent('Metric 1');
  expect(screen.getByTestId('synced')).toHaveTextContent('2026-09-01T12:00:00Z');
});

it('does not apply an old refresh timestamp after changing organizations', async () => {
  renderDashboard();
  expect(await screen.findByText('Metric 1')).toBeInTheDocument();
  let resolveRefresh!: (response: Response) => void;
  mockFetch.mockImplementation((url: string) => String(url).startsWith('/api/metrics/') && String(url).includes('organizationId=1')
    ? new Promise<Response>(resolve => { resolveRefresh = resolve; })
    : defaultResponse(url));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Second organization' }));
  expect(await screen.findByText('Metric 2')).toBeInTheDocument();
  await act(async () => resolveRefresh(json({ label: 'Old refreshed metric' })));
  expect(screen.getByTestId('metric')).toHaveTextContent('Metric 2');
  expect(screen.getByTestId('refreshed')).toHaveTextContent('never');
});

it('clears a refresh error when retry successfully revalidates the metrics', async () => {
  renderDashboard();
  expect(await screen.findByText('Metric 1')).toBeInTheDocument();
  mockFetch.mockImplementation((url: string) => String(url).startsWith('/api/metrics/') ? Promise.resolve(json({}, 503)) : defaultResponse(url));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  mockFetch.mockImplementation(defaultResponse);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await waitFor(() => expect(screen.getByTestId('refreshed')).not.toHaveTextContent('never'));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
