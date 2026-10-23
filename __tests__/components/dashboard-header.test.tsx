import { beforeEach, expect, it, mock, type Mock } from 'bun:test';
import '../setup-dom';
const { fireEvent, render, screen } = await import('@testing-library/react');

import type { TeamFilterContextType } from '@/hooks/use-team-filter';

mock.module('@/hooks/use-team-filter', () => ({ useTeamFilter: mock() }));
mock.module('@/components/ui/sidebar', () => ({ SidebarTrigger: () => <button>Toggle sidebar</button> }));
mock.module('@/components/ui/mode-toggle', () => ({ ModeToggle: () => <button>Toggle theme</button> }));

const { DashboardHeader } = await import('@/components/dashboard-header');
const { useTeamFilter } = await import('@/hooks/use-team-filter');

const older = '2026-09-01T12:00:00Z';
const newer = '2026-09-05T14:00:00Z';
const refreshData = mock().mockResolvedValue(undefined);
const filters: TeamFilterContextType = {
  organizations: [{ id: 1, name: 'Acme' }], teams: [],
  repositories: [{ id: '101', name: 'Older repo', last_synced_at: older }, { id: '102', name: 'Newer repo', last_synced_at: newer }, { id: '103', name: 'Not synced', last_synced_at: null }],
  selectedOrganization: { id: 1, name: 'Acme' }, selectedTeam: null, selectedRepositoryId: 'all',
  timeRange: '14d', loading: false, ready: true, error: null, refreshing: false, lastRefreshed: null,
  setSelectedOrganization: mock(), setSelectedTeam: mock(), setSelectedRepositoryId: mock(), setTimeRange: mock(), refreshData,
};

beforeEach(() => {
  mock.clearAllMocks();
  (useTeamFilter as Mock<typeof useTeamFilter>).mockReturnValue(filters);
});

it('reports the newest actual repository sync and partial coverage', () => {
  render(<DashboardHeader />);
  expect(screen.getByText(/Latest successful repository sync/)).toHaveTextContent('(2/3 repositories have synced)');
  expect(document.querySelector('time')).toHaveAttribute('dateTime', newer);
  expect(screen.queryByText(/Dashboard refreshed/)).not.toBeInTheDocument();
});

it('scopes sync time and coverage to the selected repository', () => {
  (useTeamFilter as Mock<typeof useTeamFilter>).mockReturnValue({ ...filters, selectedRepositoryId: '101' });
  render(<DashboardHeader />);
  expect(screen.getByText(/Latest successful repository sync/)).toHaveTextContent('(1/1 repositories have synced)');
  expect(document.querySelector('time')).toHaveAttribute('dateTime', older);
});

it('does not treat missing or invalid timestamps as successful syncs', () => {
  (useTeamFilter as Mock<typeof useTeamFilter>).mockReturnValue({ ...filters, repositories: [{ id: '101', name: 'Invalid date', last_synced_at: 'invalid' }, { id: '102', name: 'Never synced' }] });
  render(<DashboardHeader />);
  expect(screen.getByText('No successful repository sync recorded.')).toBeInTheDocument();
  expect(document.querySelector('time')).not.toBeInTheDocument();
});

it('keeps refresh status separate from GitHub sync and exposes named filter controls', () => {
  const { rerender } = render(<DashboardHeader />);
  for (const label of ['Team', 'Repository', 'Retrospective period']) expect(screen.getByRole('combobox', { name: label })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh dashboard data' }));
  expect(refreshData).toHaveBeenCalledTimes(1);
  (useTeamFilter as Mock<typeof useTeamFilter>).mockReturnValue({ ...filters, refreshing: true });
  rerender(<DashboardHeader />);
  expect(screen.getByRole('button', { name: 'Refreshing dashboard data' })).toBeDisabled();
  (useTeamFilter as Mock<typeof useTeamFilter>).mockReturnValue({ ...filters, lastRefreshed: '2026-09-07T15:00:00Z' });
  rerender(<DashboardHeader />);
  expect(document.querySelectorAll('time')[0]).toHaveAttribute('dateTime', newer);
  expect(document.querySelectorAll('time')[1]).toHaveAttribute('dateTime', '2026-09-07T15:00:00Z');
});

it('offers organization recovery even when only one organization is available', () => {
  (useTeamFilter as Mock<typeof useTeamFilter>).mockReturnValue({ ...filters, selectedOrganization: null, ready: false, error: 'This organization is unavailable. Select another organization.' });
  render(<DashboardHeader />);
  expect(screen.getByRole('alert')).toHaveTextContent('This organization is unavailable');
  expect(screen.getByRole('combobox', { name: 'Organization' })).toBeInTheDocument();
});
