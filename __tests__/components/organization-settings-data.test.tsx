import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { OrganizationCategoryManager } from '@/components/ui/organization-category-manager';
import { OrganizationSettingsTab } from '@/components/ui/organization-settings-tab';
import { GitHubOrganizationRepositories } from '@/components/ui/github-organization-repositories';
import type { Category } from '@/lib/types';

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
jest.mock('sonner', () => ({ toast: { info: jest.fn(), success: jest.fn(), warning: jest.fn(), error: jest.fn() } }));

const originalFetch = global.fetch;
const organizations = [
  { id: 0, github_id: 100, name: 'Alpha', avatar_url: null, hasAppInstalled: true, installationId: 1000 },
  { id: 1, github_id: 101, name: 'Beta', avatar_url: null, hasAppInstalled: true, installationId: 1001 },
];
const category: Category = {
  id: 10, organization_id: 0, name: 'Operations', description: null, color: null, is_default: false,
  created_at: '2026-01-01', updated_at: '2026-01-01',
};
const repository = { id: 10, github_id: 1000, organization_id: 0, name: 'app', full_name: 'Alpha/app', private: false, is_tracked: false };

function Wrapper({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false, revalidateOnFocus: false, revalidateOnReconnect: false }}>{children}</SWRConfig>;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSession).mockReturnValue({ status: 'authenticated', data: { user: { id: 'alice' }, expires: '2099-01-01' }, update: jest.fn() });
});

afterEach(() => { global.fetch = originalFetch; });

it('loads organization zero and refreshes categories after create, update and delete', async () => {
  let categories: Category[] = [];
  global.fetch = jest.fn(async (_url, options) => {
    if (options?.method === 'POST') categories = [{ ...category, ...JSON.parse(String(options.body)) }];
    if (options?.method === 'PUT') categories = [{ ...categories[0], ...JSON.parse(String(options.body)) }];
    if (options?.method === 'DELETE') categories = [];
    return new Response(JSON.stringify(categories));
  });
  render(<OrganizationCategoryManager organizationId={0} organizationName="Alpha" />, { wrapper: Wrapper });
  fireEvent.click(await screen.findByRole('button', { name: /Add New/ }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  Operations  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Edit category Operations' }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Reliability' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Delete category Reliability' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Category' }));
  expect(await screen.findByText('No custom categories defined for this organization yet.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Edit category/ })).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith('/api/organizations/0/categories', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Operations', description: null, color: null }) }));
});

it('offers retry for category fetch failures and preserves a rejected category draft', async () => {
  let failRead = true;
  global.fetch = jest.fn(async (_url, options) => {
    if (options?.method === 'POST') return new Response(JSON.stringify({ error: 'Category already exists' }), { status: 409 });
    return failRead ? new Response('{}', { status: 503 }) : new Response('[]');
  });
  render(<OrganizationCategoryManager organizationId={0} organizationName="Alpha" />, { wrapper: Wrapper });
  expect(await screen.findByRole('alert')).toHaveTextContent('503');
  failRead = false;
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  fireEvent.click(await screen.findByRole('button', { name: /Add New/ }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Operations' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
  expect(await screen.findByText('Category already exists')).toBeInTheDocument();
  expect(screen.getByLabelText('Name')).toHaveValue('Operations');
});

it('resets category drafts by organization and ignores a previous organization’s late save', async () => {
  let completeSave!: (response: Response) => void;
  const pendingSave = new Promise<Response>(resolve => { completeSave = resolve; });
  global.fetch = jest.fn(async (_url, options) => options?.method === 'POST' ? pendingSave : new Response('[]'));
  render(<OrganizationSettingsTab organizations={organizations} selectedOrganization={organizations[0]} />, { wrapper: Wrapper });
  fireEvent.click(await screen.findByRole('button', { name: /Add New/ }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alpha draft' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.click(screen.getByRole('button', { name: /Beta/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Add New/ }));
  expect(screen.getByLabelText('Name')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Beta draft' } });
  await act(async () => { completeSave(new Response(JSON.stringify(category))); await pendingSave; });
  expect(screen.getByRole('dialog')).toHaveTextContent('Create a new category specific to Beta');
  expect(screen.getByLabelText('Name')).toHaveValue('Beta draft');
  expect(screen.getByRole('button', { name: 'Add Category' })).toBeEnabled();
});

it.each(['loading', 'unauthenticated'] as const)('does not fetch repository data while the session is %s', status => {
  jest.mocked(useSession).mockReturnValue({ status, data: null, update: jest.fn() });
  global.fetch = jest.fn();
  render(<GitHubOrganizationRepositories organizationId={100} organizationName="Alpha" />, { wrapper: Wrapper });
  expect(screen.getByText(status === 'loading' ? 'Loading repositories...' : 'Sign in to manage repository webhooks.')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

it.each(['array', 'repositories', 'grouped'])('reads the %s response and refreshes webhook tracking after an authorized toggle', async shape => {
  let tracked = false;
  global.fetch = jest.fn(async (url, options) => {
    if (options?.method === 'POST') { tracked = true; return new Response('{}'); }
    if (String(url).endsWith('/accessible-repositories')) return new Response(JSON.stringify({ accessibleRepositories: ['Alpha/app'] }));
    const rows = [{ ...repository, is_tracked: tracked }];
    const data = shape === 'array' ? rows : shape === 'repositories' ? { repositories: rows } : {
      organizationsWithRepositories: [
        { organization: organizations[1], repositories: [{ ...repository, name: 'foreign' }] },
        { organization: organizations[0], repositories: rows },
      ],
    };
    return new Response(JSON.stringify(data));
  });
  render(<GitHubOrganizationRepositories organizationId={100} organizationName="Alpha" />, { wrapper: Wrapper });
  fireEvent.click(await screen.findByRole('button', { name: 'Enable webhook tracking for app' }));
  expect(await screen.findByRole('button', { name: 'Disable webhook tracking for app' })).toBeEnabled();
  expect(screen.queryByText('foreign')).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith('/api/github/repositories/1000/webhook', expect.objectContaining({ method: 'POST' }));
});

it('refreshes changed tracking and reports a partial initial-sync failure without a success toast', async () => {
  let tracked = false;
  const message = 'Tracking enabled, but initial PR sync failed. Retry synchronization.';
  global.fetch = jest.fn(async (url, options) => {
    if (options?.method === 'POST') {
      tracked = true;
      return new Response(JSON.stringify({ success: false, message }));
    }
    if (String(url).endsWith('/accessible-repositories')) return new Response(JSON.stringify({ accessibleRepositories: ['Alpha/app'] }));
    return new Response(JSON.stringify({ repositories: [{ ...repository, is_tracked: tracked }] }));
  });
  render(<GitHubOrganizationRepositories organizationId={100} organizationName="Alpha" />, { wrapper: Wrapper });
  fireEvent.click(await screen.findByRole('button', { name: 'Enable webhook tracking for app' }));
  expect(await screen.findByRole('button', { name: 'Disable webhook tracking for app' })).toBeEnabled();
  expect(toast.warning).toHaveBeenCalledWith(message);
  expect(toast.success).not.toHaveBeenCalled();
});

it('retries access checks and disables cached access when a later refresh fails', async () => {
  let failAccess = true;
  global.fetch = jest.fn(async url => String(url).endsWith('/accessible-repositories')
    ? failAccess ? new Response('{}', { status: 503 }) : new Response(JSON.stringify({ accessibleRepositories: ['Alpha/app'] }))
    : new Response(JSON.stringify({ repositories: [repository] })));
  render(<GitHubOrganizationRepositories organizationId={100} organizationName="Alpha" />, { wrapper: Wrapper });
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not check repository access');
  expect(screen.getByRole('button', { name: 'No access to app' })).toBeDisabled();
  failAccess = false;
  fireEvent.click(screen.getByRole('button', { name: 'Retry Access Check' }));
  expect(await screen.findByRole('button', { name: 'Enable webhook tracking for app' })).toBeEnabled();
  failAccess = true;
  fireEvent.click(screen.getByRole('button', { name: 'Sync Repos' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not check repository access');
  const toggle = screen.getByRole('button', { name: 'No access to app' });
  expect(toggle).toBeDisabled();
  fireEvent.click(toggle);
  expect(global.fetch).not.toHaveBeenCalledWith('/api/github/repositories/1000/webhook', expect.anything());
});

it('retries repository errors and refreshes repository/access data after organization sync', async () => {
  let failed = true;
  let synced = false;
  global.fetch = jest.fn(async (url, options) => {
    if (options?.method === 'POST') { synced = true; return new Response('{}'); }
    if (String(url).endsWith('/accessible-repositories')) return new Response(JSON.stringify({ accessibleRepositories: synced ? ['Alpha/app'] : [] }));
    return failed ? new Response('{}', { status: 503 }) : new Response(JSON.stringify({ repositories: synced ? [repository] : [] }));
  });
  render(<GitHubOrganizationRepositories organizationId={100} organizationName="Alpha" />, { wrapper: Wrapper });
  const retry = await screen.findByRole('button', { name: 'Retry Fetch' });
  failed = false;
  fireEvent.click(retry);
  fireEvent.click(await screen.findByRole('button', { name: 'Sync Repos' }));
  expect(await screen.findByRole('button', { name: 'Enable webhook tracking for app' })).toBeEnabled();
  expect(global.fetch).toHaveBeenCalledWith('/api/github/organizations/Alpha/sync', expect.objectContaining({ method: 'POST' }));
});

it('keeps repository results scoped when an old organization request completes late', async () => {
  let completeAlpha!: (response: Response) => void;
  const alpha = new Promise<Response>(resolve => { completeAlpha = resolve; });
  global.fetch = jest.fn(async url => {
    if (String(url).endsWith('/accessible-repositories')) return new Response(JSON.stringify({ accessibleRepositories: [] }));
    return String(url).includes('orgId=100') ? alpha : new Response(JSON.stringify({ repositories: [{ ...repository, name: 'beta-app', full_name: 'Beta/app' }] }));
  });
  const { rerender } = render(<GitHubOrganizationRepositories organizationId={100} organizationName="Alpha" />, { wrapper: Wrapper });
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/github/organizations/repositories?orgId=100', expect.anything()));
  rerender(<GitHubOrganizationRepositories organizationId={101} organizationName="Beta" />);
  expect(await screen.findByText('beta-app')).toBeInTheDocument();
  await act(async () => { completeAlpha(new Response(JSON.stringify({ repositories: [repository] }))); await alpha; });
  expect(screen.getByText('beta-app')).toBeInTheDocument();
  expect(screen.queryByText('app')).not.toBeInTheDocument();
});
