import { fireEvent, render, screen } from '@testing-library/react';
import { SectionCardsEngineering } from '@/components/section-cards-engineering';
import { useMetricsSummary } from '@/hooks/use-metrics';

jest.mock('@/hooks/use-team-filter', () => ({ useTeamFilterParams: () => 'organizationId=2&repositoryId=20&timeRange=7d' }));
jest.mock('@/hooks/use-metrics', () => ({ useMetricsSummary: jest.fn() }));
const mockSummary = jest.mocked(useMetricsSummary);
const refresh = jest.fn();
const summary = {
  trackedRepositories: 1, prsMergedThisWeek: 8, prsMergedLastWeek: 5,
  weeklyPRVolumeChange: 60, averagePRSize: 137, sizedPRCount: 4, openPRCount: 2,
  categorizationRate: 75, dataUpToDate: '', lastUpdated: '', cacheStrategy: '', nextUpdateDue: '',
};
const result: ReturnType<typeof useMetricsSummary> = { data: summary, error: undefined, isLoading: false, isValidating: false, refresh };
beforeEach(() => { jest.clearAllMocks(); mockSummary.mockReturnValue(result); });

it('displays recorded metrics instead of invented delivery or focus hours', () => {
  render(<SectionCardsEngineering />);
  expect(screen.getByText('137 LOC')).toBeInTheDocument();
  expect(screen.getByText('8')).toBeInTheDocument();
  expect(screen.getByText('75%')).toBeInTheDocument();
  expect(screen.getByText('5 in the preceding period of the same length.')).toBeInTheDocument();
  expect(screen.queryByText(/48 hrs|24 hrs|Flow State Time|first commit to production/)).not.toBeInTheDocument();
  expect(mockSummary).toHaveBeenCalledWith('organizationId=2&repositoryId=20&timeRange=7d');
});

it.each([[0, 'Not available'], [1, '0 LOC']] as const)('handles size coverage %i without inventing a size', (sizedPRCount, expected) => {
  mockSummary.mockReturnValue({ ...result, data: { ...summary, averagePRSize: 0, sizedPRCount } });
  render(<SectionCardsEngineering />);
  expect(screen.getByText(expected)).toBeInTheDocument();
});

it('keeps last good data visible on failed refresh and offers retry', () => {
  mockSummary.mockReturnValue({ ...result, error: new Error('Unavailable') });
  render(<SectionCardsEngineering />);
  expect(screen.getByRole('alert')).toHaveTextContent('Showing the last loaded values');
  expect(screen.getByText('137 LOC')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(refresh).toHaveBeenCalledTimes(1);
});
