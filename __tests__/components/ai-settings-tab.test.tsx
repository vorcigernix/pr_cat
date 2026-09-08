import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { Toaster, toast } from 'sonner';
import { AiSettingsTab } from '@/components/ui/ai-settings-tab';
import type { OrganizationWithInstallation } from '@/components/ui/github-org-setup-item';
import type { AiSettings, UpdateAiSettingsPayload } from '@/lib/repositories/settings-repository';

const originalFetch = global.fetch;
const originalResizeObserver = global.ResizeObserver;
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
const mockFetch = jest.fn();
const organizations: OrganizationWithInstallation[] = [
  { id: 1, github_id: 10, name: 'Acme', avatar_url: null, hasAppInstalled: true, installationId: 100 },
  { id: 2, github_id: 20, name: 'Beta', avatar_url: null, hasAppInstalled: true, installationId: 200 },
];
const baseSettings: AiSettings = {
  provider: 'google', selectedModelId: 'gemini-3.8-flash', categoryThreshold: 80,
  isGoogleKeySet: true, isOpenAiKeySet: false, isAnthropicKeySet: false,
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

beforeEach(() => {
  toast.dismiss();
  mockFetch.mockReset();
  global.fetch = mockFetch;
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  HTMLElement.prototype.scrollIntoView = () => {};
});
afterAll(() => {
  global.fetch = originalFetch;
  global.ResizeObserver = originalResizeObserver;
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
});

function SettingsHarness({ initialOrganization }: { initialOrganization: OrganizationWithInstallation | null }) {
  const [selectedOrganization, setSelectedOrganization] = useState(initialOrganization);
  return <AiSettingsTab organizations={organizations} selectedOrganization={selectedOrganization} onOrganizationSelected={setSelectedOrganization} />;
}

function renderSettings(initialOrganization: OrganizationWithInstallation | null = organizations[0]) {
  return render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, revalidateOnReconnect: false }}><SettingsHarness initialOrganization={initialOrganization} /></SWRConfig>);
}

it('preserves a saved API key for unrelated edits and removes it only after an explicit action', async () => {
  const updates: UpdateAiSettingsPayload[] = [];
  const settings = { ...baseSettings };
  mockFetch.mockImplementation(async (_url: string, options?: RequestInit) => {
    if (options?.method === 'PUT') {
      const update: UpdateAiSettingsPayload = JSON.parse(options.body as string);
      updates.push(update);
      settings.categoryThreshold = update.categoryThreshold!;
      if (update.googleApiKey === null) settings.isGoogleKeySet = false;
      return json({ message: 'AI settings saved' });
    }
    return json(settings);
  });
  renderSettings();
  expect(await screen.findByLabelText(/Google AI API Key/)).toHaveValue('');
  fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
  fireEvent.click(screen.getByRole('button', { name: 'Save AI Settings' }));
  await waitFor(() => expect(updates).toHaveLength(1));
  expect(updates[0]).toEqual({ provider: 'google', selectedModelId: 'gemini-3.8-flash', categoryThreshold: 85 });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save AI Settings' })).toBeEnabled());

  fireEvent.click(screen.getByRole('button', { name: 'Remove saved API key' }));
  expect(screen.getByRole('status')).toHaveTextContent('The saved key will be removed when you save');
  fireEvent.click(screen.getByRole('button', { name: 'Save AI Settings' }));
  await waitFor(() => expect(updates).toHaveLength(2));
  expect(updates[1].googleApiKey).toBeNull();
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove saved API key' })).not.toBeInTheDocument());
});

it('waits for an explicit organization selection before fetching or showing an editable form', async () => {
  mockFetch.mockResolvedValue(json(baseSettings));
  renderSettings(null);
  expect(screen.getByText(/Please select an organization from the list/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save AI Settings' })).not.toBeInTheDocument();
  expect(mockFetch).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: /Beta/ }));
  expect(await screen.findByText('AI Settings for Beta')).toBeInTheDocument();
  expect(mockFetch).toHaveBeenCalledWith('/api/organizations/2/ai-settings', { cache: 'no-store' });
});

it('keeps the form unavailable after a failed GET and loads it through Retry', async () => {
  mockFetch.mockResolvedValueOnce(json({ error: 'Unavailable' }, 503));
  renderSettings();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load AI settings for Acme');
  expect(screen.queryByRole('combobox', { name: 'AI Provider' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save AI Settings' })).not.toBeInTheDocument();

  mockFetch.mockResolvedValueOnce(json(baseSettings));
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByLabelText(/Google AI API Key/)).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '80');
});

it('ignores a late settings response from the previous organization', async () => {
  let resolveAcme!: (response: Response) => void;
  mockFetch.mockImplementationOnce(() => new Promise<Response>(resolve => { resolveAcme = resolve; }));
  mockFetch.mockResolvedValueOnce(json({ ...baseSettings, categoryThreshold: 55, isGoogleKeySet: false }));
  renderSettings();
  expect(screen.getByText('Loading AI settings for Acme...')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Beta/ }));
  expect(await screen.findByText('AI Settings for Beta')).toBeInTheDocument();
  await act(async () => resolveAcme(json(baseSettings)));

  expect(screen.getByText('AI Settings for Beta')).toBeInTheDocument();
  expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '55');
  expect(screen.queryByRole('button', { name: 'Remove saved API key' })).not.toBeInTheDocument();
});

it('keeps the new organization draft when the previous organization finishes saving', async () => {
  const settings = { 1: { ...baseSettings }, 2: { ...baseSettings, categoryThreshold: 55 } };
  let finishSave!: (response: Response) => void;
  let savedPayload!: UpdateAiSettingsPayload;
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    const id = url.includes('/1/') ? 1 : 2;
    if (options?.method === 'PUT') {
      savedPayload = JSON.parse(options.body as string);
      settings[id].categoryThreshold = savedPayload.categoryThreshold!;
      return new Promise<Response>(resolve => { finishSave = resolve; });
    }
    return Promise.resolve(json(settings[id]));
  });
  renderSettings();
  await screen.findByText('AI Settings for Acme');
  fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
  fireEvent.click(screen.getByRole('button', { name: 'Save AI Settings' }));
  expect(savedPayload.categoryThreshold).toBe(85);
  fireEvent.click(screen.getByRole('button', { name: /Beta/ }));
  await screen.findByText('AI Settings for Beta');
  fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
  fireEvent.change(screen.getByLabelText(/Google AI API Key/), { target: { value: 'beta-draft-key' } });

  await act(async () => finishSave(json({ message: 'AI settings saved' })));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save AI Settings' })).toBeEnabled());
  expect(screen.getByText('AI Settings for Beta')).toBeInTheDocument();
  expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '60');
  expect(screen.getByLabelText(/Google AI API Key/)).toHaveValue('beta-draft-key');

  // A successful save must refresh the saved organization, without waiting for another visit.
  expect(mockFetch.mock.calls.filter(([url, options]) => url === '/api/organizations/1/ai-settings' && options?.method !== 'PUT')).toHaveLength(2);
});

it('reports a failed post-save reload without discarding the visible draft', async () => {
  mockFetch.mockResolvedValueOnce(json(baseSettings));
  mockFetch.mockResolvedValueOnce(json({ message: 'AI settings saved' }));
  mockFetch.mockResolvedValueOnce(json({ error: 'Read temporarily unavailable' }, 503));
  renderSettings();
  render(<Toaster />);
  await screen.findByText('AI Settings for Acme');
  fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
  fireEvent.change(screen.getByLabelText(/Google AI API Key/), { target: { value: 'submitted-key' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save AI Settings' }));
  expect(await screen.findByText('Settings saved for Acme, but reloading failed. Your edits are still shown.')).toBeInTheDocument();
  expect(screen.queryByText('AI settings saved for Acme.')).not.toBeInTheDocument();
  expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '85');
  expect(screen.getByLabelText(/Google AI API Key/)).toHaveValue('submitted-key');
  expect(screen.getByRole('button', { name: 'Save AI Settings' })).toBeEnabled();
});

it('resets the model when changing providers instead of submitting the old provider’s model', async () => {
  mockFetch.mockResolvedValueOnce(json(baseSettings));
  mockFetch.mockResolvedValueOnce(json({ message: 'AI settings saved' }));
  mockFetch.mockResolvedValueOnce(json({ ...baseSettings, provider: 'openai', selectedModelId: null }));
  renderSettings();
  await screen.findByText('AI Settings for Acme');
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'AI Provider' }), { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name: 'OpenAI' }));
  expect(screen.getByRole('combobox', { name: 'AI Model' })).toHaveTextContent('Select a model');
  expect(screen.getByLabelText(/OpenAI API Key/)).toHaveValue('');
  fireEvent.click(screen.getByRole('button', { name: 'Save AI Settings' }));
  await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/organizations/1/ai-settings', expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ provider: 'openai', selectedModelId: null, categoryThreshold: 80 }),
  })));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save AI Settings' })).toBeEnabled());
});
