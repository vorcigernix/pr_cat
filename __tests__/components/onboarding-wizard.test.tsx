import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding-wizard';
import { SWRConfig } from 'swr';

jest.mock('next-auth/react', () => ({ useSession: jest.fn(), signIn: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/components/ui/install-github-app', () => ({
  InstallGitHubAppButton: () => <button>Install GitHub App</button>,
}));

const originalFetch = global.fetch;
const mockFetch = jest.fn();
const push = jest.fn();
const organizations = [{ id: 1, login: 'acme' }];
const repositories = [{ id: 10, name: 'production-app', full_name: 'acme/production-app', private: true }];
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  global.fetch = mockFetch;
  jest.mocked(useSession).mockReturnValue({ data: { user: { id: 'user-1' }, accessToken: 'test-token', expires: '2099-01-01' }, status: 'authenticated', update: jest.fn() });
  jest.mocked(useRouter).mockReturnValue({ push, back: jest.fn(), forward: jest.fn(), refresh: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), bfcacheId: 'test-route' });
});

afterAll(() => { global.fetch = originalFetch; });

function verifiedInstallation() {
  mockFetch.mockResolvedValueOnce(json({ organizations }));
  mockFetch.mockResolvedValueOnce(json({ installations: [{ hasAppInstalled: true }] }));
}

function startGitHubCheck() {
  const view = render(<SWRConfig value={{ provider: () => new Map() }}><OnboardingWizard /></SWRConfig>);
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check GitHub access' }));
  return view;
}

it('shows organization failures, blocks progress, and recovers through retry without fictional data', async () => {
  verifiedInstallation();
  mockFetch.mockResolvedValueOnce(json({ message: 'Bad credentials' }, 401));
  startGitHubCheck();

  expect(await screen.findByRole('alert')).toHaveTextContent('Bad credentials');
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  expect(screen.queryByText('Example-Organization')).not.toBeInTheDocument();
  expect(screen.queryByText('example-repo')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reconnect GitHub' }));
  expect(signIn).toHaveBeenCalledWith('github', { callbackUrl: '/onboarding' });

  mockFetch.mockResolvedValueOnce(json(organizations)).mockResolvedValueOnce(json(repositories));
  fireEvent.click(screen.getByRole('button', { name: 'Retry organizations' }));
  expect(await screen.findByText('production-app')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByText('GitHub access checked')).toBeInTheDocument();
  expect(screen.getByText(/Those settings have not been configured by this check/)).toBeInTheDocument();
  expect(screen.queryByText('Setup Complete!')).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/API Key/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Settings' }));
  expect(push).toHaveBeenCalledWith('/dashboard/settings');
});

it('shows repository errors and retries the selected organization', async () => {
  verifiedInstallation();
  mockFetch.mockResolvedValueOnce(json(organizations)).mockResolvedValueOnce(json({ message: 'API rate limit exceeded' }, 403));
  startGitHubCheck();
  expect(await screen.findByRole('alert')).toHaveTextContent('API rate limit exceeded');
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  expect(screen.queryByText('example-repo')).not.toBeInTheDocument();

  mockFetch.mockResolvedValueOnce(json(repositories));
  fireEvent.click(screen.getByRole('button', { name: 'Retry repositories' }));
  expect(await screen.findByText('production-app')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  expect(mockFetch).toHaveBeenLastCalledWith('https://api.github.com/orgs/acme/repos?per_page=100', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }));
});

it('does not treat an installation-page visit as proof of installation', async () => {
  sessionStorage.setItem('githubAppInstallStarted', 'true');
  mockFetch.mockResolvedValueOnce(json({ organizations })).mockResolvedValueOnce(json({ installations: [{ hasAppInstalled: false }] }));
  startGitHubCheck();
  expect(await screen.findByRole('alert')).toHaveTextContent('No PR Cat GitHub App installation was found');
  expect(screen.getByRole('button', { name: 'Retry GitHub check' })).toBeEnabled();
  expect(screen.queryByText('Check repositories')).not.toBeInTheDocument();
  expect(screen.queryByText('GitHub App installed successfully!')).not.toBeInTheDocument();
  sessionStorage.removeItem('githubAppInstallStarted');
});

it('stops when organization synchronization fails and verifies again on retry', async () => {
  mockFetch.mockResolvedValueOnce(json({ error: 'Organization sync unavailable' }, 503));
  startGitHubCheck();
  expect(await screen.findByRole('alert')).toHaveTextContent('Organization sync unavailable');
  expect(mockFetch).toHaveBeenCalledTimes(1);
  verifiedInstallation();
  mockFetch.mockResolvedValueOnce(json(organizations)).mockResolvedValueOnce(json(repositories));
  fireEvent.click(screen.getByRole('button', { name: 'Retry GitHub check' }));
  expect(await screen.findByText('production-app')).toBeInTheDocument();
});

it('offers reconnection without issuing requests when the session token is missing', async () => {
  jest.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated', update: jest.fn() });
  startGitHubCheck();
  expect(await screen.findByRole('alert')).toHaveTextContent('GitHub authorization is missing');
  expect(mockFetch).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Reconnect GitHub' })).toBeInTheDocument();
});

it.each(['organizations', 'repositories'])('does not advance when GitHub returns no %s', async (emptyList) => {
  verifiedInstallation();
  mockFetch.mockResolvedValueOnce(json(emptyList === 'organizations' ? [] : organizations));
  if (emptyList === 'repositories') mockFetch.mockResolvedValueOnce(json([]));
  startGitHubCheck();
  expect(await screen.findByText(emptyList === 'organizations' ? /No GitHub organizations found/ : /No repositories found for acme/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  expect(screen.getByRole('button', { name: `Retry ${emptyList}` })).toBeInTheDocument();
});

it('ignores an old repository response after switching organizations', async () => {
  verifiedInstallation();
  mockFetch.mockResolvedValueOnce(json([...organizations, { id: 2, login: 'other' }]));
  let resolveOldRequest!: (response: Response) => void;
  mockFetch.mockImplementationOnce(() => new Promise<Response>(resolve => { resolveOldRequest = resolve; }));
  startGitHubCheck();
  const other = await screen.findByRole('button', { name: 'O other' });
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  mockFetch.mockResolvedValueOnce(json([{ ...repositories[0], id: 20, name: 'other-app' }]));
  fireEvent.click(other);
  expect(await screen.findByText('other-app')).toBeInTheDocument();
  await act(async () => resolveOldRequest(json(repositories)));
  expect(screen.queryByText('production-app')).not.toBeInTheDocument();
  expect(screen.getByText('other-app')).toBeInTheDocument();
  fireEvent.click(other);
  expect(screen.getByText('other-app')).toBeInTheDocument();
});

it('reloads GitHub access for a changed session instead of showing the previous account’s repositories', async () => {
  verifiedInstallation();
  mockFetch.mockResolvedValueOnce(json(organizations)).mockResolvedValueOnce(json(repositories));
  const view = startGitHubCheck();
  expect(await screen.findByText('production-app')).toBeInTheDocument();

  let resolveOrganizations!: (response: Response) => void;
  mockFetch.mockImplementationOnce(() => new Promise<Response>(resolve => { resolveOrganizations = resolve; }));
  mockFetch.mockResolvedValueOnce(json([{ ...repositories[0], name: 'new-account-app' }]));
  jest.mocked(useSession).mockReturnValue({ data: { user: { id: 'user-2' }, accessToken: 'new-token', expires: '2099-01-01' }, status: 'authenticated', update: jest.fn() });
  view.rerender(<SWRConfig value={{ provider: () => new Map() }}><OnboardingWizard /></SWRConfig>);
  expect(screen.queryByText('production-app')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

  await act(async () => resolveOrganizations(json(organizations)));
  expect(await screen.findByText('new-account-app')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  expect(mockFetch).toHaveBeenLastCalledWith('https://api.github.com/orgs/acme/repos?per_page=100', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer new-token' }) }));
});
