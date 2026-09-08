import { fireEvent, render, screen, within } from '@testing-library/react';
import { PRQualityDetails } from '@/components/pr-quality-details';
import { usePullRequestsRecent } from '@/hooks/use-metrics';

jest.mock('@/hooks/use-team-filter', () => ({
  useTeamFilterParams: () => 'organizationId=1&teamId=2&repositoryId=3&timeRange=14d',
}));
jest.mock('@/hooks/use-metrics', () => ({ usePullRequestsRecent: jest.fn() }));
jest.mock('recharts', () => ({
  ...jest.requireActual('recharts'),
  ResponsiveContainer: () => null,
}));

const mockRecent = jest.mocked(usePullRequestsRecent);
const refresh = jest.fn();
const queryResult: ReturnType<typeof usePullRequestsRecent> = {
  data: [], error: undefined, isLoading: false, isValidating: false,
  refresh,
};
const basePR = {
  id: 1, number: 42, title: 'Update the application',
  developer: { id: 1, name: 'Ada' }, repository: { id: 1, name: 'pr-cat' },
  status: 'merged' as const, createdAt: '2026-09-01T10:00:00Z', mergedAt: '2026-09-02T10:00:00Z',
  linesAdded: 50, linesRemoved: 0, cycleTime: 12,
};

beforeEach(() => {
  mockRecent.mockReturnValue(queryResult);
});

it('finishes loading when there are no pull requests to analyze', () => {
  render(<PRQualityDetails />);
  expect(screen.getByText('No pull requests available to analyze')).toBeInTheDocument();
  expect(screen.queryByText('Loading quality data...')).not.toBeInTheDocument();
});

it.each([
  { description: 'small, fast insertion-only', added: 50, removed: 0, cycleTime: 12, score: 100 },
  { description: 'large, slow deletion-only', added: 0, removed: 1200, cycleTime: 200, score: 0 },
])('scores $description pull requests from their actual size and speed', ({ added, removed, cycleTime, score }) => {
  mockRecent.mockReturnValue({ ...queryResult, data: [{ ...basePR, linesAdded: added, linesRemoved: removed, cycleTime }] });
  render(<PRQualityDetails />);
  fireEvent.click(screen.getByRole('button', { name: 'View detailed quality factors' }));

  expect(screen.getByText(`Average PR size is ${added + removed} lines of code`)).toBeInTheDocument();
  expect(screen.getByText(`Average cycle time is ${cycleTime} hours`)).toBeInTheDocument();
  for (const factor of ['PR Size', 'Delivery Speed']) {
    const card = screen.getByText(factor).closest('[data-slot="card"]') as HTMLElement;
    expect(within(card).getByText(`${score}/100`)).toBeInTheDocument();
  }
});

it('reports the filtered factual sample and excludes unknown sizes and unmerged cycle times', () => {
  mockRecent.mockReturnValue({ ...queryResult, data: [
    basePR,
    { ...basePR, id: 2, status: 'open', linesAdded: undefined, linesRemoved: undefined, cycleTime: 999 },
    { ...basePR, id: 3, status: 'closed', linesAdded: undefined, linesRemoved: undefined, cycleTime: 999 },
  ] });
  render(<PRQualityDetails />);
  expect(mockRecent).toHaveBeenCalledWith('organizationId=1&teamId=2&repositoryId=3&timeRange=14d&limit=100');
  const card = screen.getByText('Pull request sample').closest('[data-slot="card"]') as HTMLElement;
  const sample = within(card);
  expect(sample.getByText('PRs analyzed').nextElementSibling).toHaveTextContent('3');
  for (const status of ['Merged', 'Open', 'Closed without merging']) expect(sample.getByText(status).nextElementSibling).toHaveTextContent('1');
  expect(sample.getByText('Average changed lines').nextElementSibling).toHaveTextContent('50');
  expect(sample.getByText('Average merged PR cycle time').nextElementSibling).toHaveTextContent('12 hours');
  expect(sample.getByText(/Size data: 1 of 3 PRs. Cycle time data: 1 of 1 merged PRs/)).toBeInTheDocument();
  expect(screen.queryByText(/Quality Distribution|High Quality|Medium Quality|Low Quality/)).not.toBeInTheDocument();
  expect(screen.getByText('Workflow heuristic score')).toBeInTheDocument();
});

it('does not score missing size and cycle-time data as perfect', () => {
  mockRecent.mockReturnValue({ ...queryResult, data: [{ ...basePR, status: 'open', linesAdded: undefined, linesRemoved: undefined }] });
  render(<PRQualityDetails />);
  fireEvent.click(screen.getByRole('button', { name: 'View detailed quality factors' }));
  for (const factor of ['PR Size', 'Delivery Speed']) {
    const card = screen.getByText(factor).closest('[data-slot="card"]') as HTMLElement;
    expect(within(card).getByText('Unavailable')).toBeInTheDocument();
    expect(within(card).queryByText('100/100')).not.toBeInTheDocument();
  }
});

it('retries a failed quality request', () => {
  mockRecent.mockReturnValue({ ...queryResult, error: new Error('HTTP 503') });
  render(<PRQualityDetails />);
  expect(screen.getByRole('alert')).toHaveTextContent('HTTP 503');
  fireEvent.click(screen.getByRole('button', { name: 'Retry quality data' }));
  expect(refresh).toHaveBeenCalledTimes(1);
});
