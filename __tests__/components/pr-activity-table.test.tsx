import { act, fireEvent, render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { PRActivityTable } from '@/components/pr-activity-table';
import { useTeamFilterParams } from '@/hooks/use-team-filter';

jest.mock('@/hooks/use-team-filter', () => ({
  useTeamFilterParams: jest.fn(),
}));

const mockFilterParams = jest.mocked(useTeamFilterParams);
const mockFetch = jest.fn();
const originalFetch = global.fetch;

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status });
}

function pullRequest(title: string) {
  return {
    id: 1,
    number: 42,
    title,
    developer: { id: 1, name: 'Ada' },
    repository: { id: 1, name: 'pr-cat' },
    status: 'merged',
    createdAt: '2026-09-01T10:00:00Z',
    mergedAt: '2026-09-01T12:00:00Z',
    cycleTime: 2,
  };
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
      {children}
    </SWRConfig>
  );
}

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch;
  mockFilterParams.mockReturnValue('organizationId=1&timeRange=14d');
});

afterAll(() => {
  global.fetch = originalFetch;
});

it('renders paginated pull requests for the selected filters', async () => {
  mockFetch.mockResolvedValue(response({ data: [pullRequest('Ship an improvement')] }));
  render(<PRActivityTable />, { wrapper: Wrapper });

  expect(await screen.findByText('#42 Ship an improvement')).toBeInTheDocument();
  expect(mockFetch).toHaveBeenCalledWith(
    '/api/pull-requests/recent?organizationId=1&timeRange=14d',
    expect.any(Object),
  );
});

it('explains how to recover when filters return no pull requests', async () => {
  mockFetch.mockResolvedValue(response([]));
  render(<PRActivityTable />, { wrapper: Wrapper });

  expect(await screen.findByText(/Try a longer period or select All Teams/)).toBeInTheDocument();
});

it('retries a failed request in place', async () => {
  mockFetch
    .mockResolvedValueOnce(response({ error: 'Unavailable' }, 503))
    .mockResolvedValueOnce(response([pullRequest('Recovered request')]));
  render(<PRActivityTable />, { wrapper: Wrapper });

  expect(await screen.findByRole('alert')).toHaveTextContent('503');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

  expect(await screen.findByText('#42 Recovered request')).toBeInTheDocument();
  expect(mockFetch).toHaveBeenCalledTimes(2);
});

it('does not overwrite a new filter selection with a late response', async () => {
  let resolvePrevious!: (value: Response) => void;
  const previousRequest = new Promise<Response>((resolve) => {
    resolvePrevious = resolve;
  });
  mockFetch
    .mockReturnValueOnce(previousRequest)
    .mockResolvedValueOnce(response({ data: [pullRequest('Current team')] }));
  const view = render(<PRActivityTable />, { wrapper: Wrapper });

  mockFilterParams.mockReturnValue('organizationId=1&teamId=2&timeRange=14d');
  view.rerender(<PRActivityTable />);
  expect(await screen.findByText('#42 Current team')).toBeInTheDocument();

  await act(async () => {
    resolvePrevious(response({ data: [pullRequest('Previous team')] }));
  });

  expect(screen.getByText('#42 Current team')).toBeInTheDocument();
  expect(screen.queryByText('#42 Previous team')).not.toBeInTheDocument();
});
