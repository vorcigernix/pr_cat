import { fireEvent, render, screen } from '@testing-library/react';
import { DashboardHeader } from '@/components/dashboard-header';
import { useTeamFilter, type TeamFilterContextType } from '@/hooks/use-team-filter';

jest.mock('@/hooks/use-team-filter', () => ({ useTeamFilter: jest.fn() }));
jest.mock('@/components/ui/sidebar', () => ({ SidebarTrigger: () => <button>Toggle sidebar</button> }));
jest.mock('@/components/ui/mode-toggle', () => ({ ModeToggle: () => <button>Toggle theme</button> }));

const older = '2026-09-01T12:00:00Z';
const newer = '2026-09-05T14:00:00Z';
const refreshData = jest.fn().mockResolvedValue(undefined);
const filters: TeamFilterContextType = {
  organizations: [{ id: 1, name: 'Acme' }], teams: [],
  repositories: [{ id: '101', name: 'Older repo', last_synced_at: older }, { id: '102', name: 'Newer repo', last_synced_at: newer }, { id: '103', name: 'Not synced', last_synced_at: null }],
  selectedOrganization: { id: 1, name: 'Acme' }, selectedTeam: null, selectedRepositoryId: 'all',
  timeRange: '14d', loading: false, ready: true, error: null, refreshing: false, lastRefreshed: null,
  setSelectedOrganization: jest.fn(), setSelectedTeam: jest.fn(), setSelectedRepositoryId: jest.fn(), setTimeRange: jest.fn(), refreshData,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useTeamFilter).mockReturnValue(filters);
});

it('reports the newest actual repository sync and partial coverage', () => {
  render(<DashboardHeader />);
  expect(screen.getByText(/Latest successful repository sync/)).toHaveTextContent('(2/3 repositories have synced)');
  expect(document.querySelector('time')).toHaveAttribute('dateTime', newer);
  expect(screen.queryByText(/Dashboard refreshed/)).not.toBeInTheDocument();
});

it('scopes sync time and coverage to the selected repository', () => {
  jest.mocked(useTeamFilter).mockReturnValue({ ...filters, selectedRepositoryId: '101' });
  render(<DashboardHeader />);
  expect(screen.getByText(/Latest successful repository sync/)).toHaveTextContent('(1/1 repositories have synced)');
  expect(document.querySelector('time')).toHaveAttribute('dateTime', older);
});

it('does not treat missing or invalid timestamps as successful syncs', () => {
  jest.mocked(useTeamFilter).mockReturnValue({ ...filters, repositories: [{ id: '101', name: 'Invalid date', last_synced_at: 'invalid' }, { id: '102', name: 'Never synced' }] });
  render(<DashboardHeader />);
  expect(screen.getByText('No successful repository sync recorded.')).toBeInTheDocument();
  expect(document.querySelector('time')).not.toBeInTheDocument();
});

it('keeps refresh status separate from GitHub sync and exposes named filter controls', () => {
  const { rerender } = render(<DashboardHeader />);
  for (const label of ['Team', 'Repository', 'Retrospective period']) expect(screen.getByRole('combobox', { name: label })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh dashboard data' }));
  expect(refreshData).toHaveBeenCalledTimes(1);
  jest.mocked(useTeamFilter).mockReturnValue({ ...filters, refreshing: true });
  rerender(<DashboardHeader />);
  expect(screen.getByRole('button', { name: 'Refreshing dashboard data' })).toBeDisabled();
  jest.mocked(useTeamFilter).mockReturnValue({ ...filters, lastRefreshed: '2026-09-07T15:00:00Z' });
  rerender(<DashboardHeader />);
  expect(document.querySelectorAll('time')[0]).toHaveAttribute('dateTime', newer);
  expect(document.querySelectorAll('time')[1]).toHaveAttribute('dateTime', '2026-09-07T15:00:00Z');
});

it('offers organization recovery even when only one organization is available', () => {
  jest.mocked(useTeamFilter).mockReturnValue({ ...filters, selectedOrganization: null, ready: false, error: 'This organization is unavailable. Select another organization.' });
  render(<DashboardHeader />);
  expect(screen.getByRole('alert')).toHaveTextContent('This organization is unavailable');
  expect(screen.getByRole('combobox', { name: 'Organization' })).toBeInTheDocument();
});
