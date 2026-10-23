import { beforeEach, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';

mock.module('ai', () => ({ generateText: mock() }));
mock.module('@ai-sdk/google', () => ({ createGoogle: mock() }));
mock.module('@ai-sdk/openai', () => ({ createOpenAI: mock() }));
mock.module('@ai-sdk/anthropic', () => ({ createAnthropic: mock() }));
mock.module('@/lib/github', () => ({ createGitHubClient: mock() }));
mock.module('@/lib/github-app', () => ({ createInstallationClient: mock() }));
mock.module('@/lib/repositories/settings-repository', () => ({
  getOrganizationAiSettings: mock(),
  getOrganizationApiKey: mock(),
}));
mock.module('@/lib/repositories/category-repository', () => ({
  getOrganizationCategories: mock(),
  findCategoryByNameAndOrg: mock(),
}));
mock.module('@/lib/repositories/organization-repository', () => ({ findOrganizationById: mock() }));
mock.module('@/lib/repositories/pr-repository', () => ({ updatePullRequest: mock() }));
mock.module('@/lib/repositories', () => ({
  ...require('@/lib/repositories/settings-repository'),
  ...require('@/lib/repositories/category-repository'),
  ...require('@/lib/repositories/organization-repository'),
  ...require('@/lib/repositories/pr-repository'),
  findPullRequestById: mock(),
  findRepositoryById: mock(),
  findPullRequestByNumber: mock(),
  findRepositoryByFullName: mock(),
  updatePullRequestCategory: mock(),
  findOrCreateOrganization: mock(),
  findOrCreateRepository: mock(),
  createPullRequest: mock(),
  findOrCreateUserByGitHubId: mock(),
}));

mock.module('@/auth', () => ({ auth: mock() }));

const { auth } = await import('@/auth');
const { createGoogle } = await import('@ai-sdk/google');
const { generateText } = await import('ai');
const { GET } = await import('@/app/api/debug/categorize-pr/route');
const { RealGitHubAPIService } = await import('@/lib/infrastructure/adapters/github/real-github.adapter');
const { createInstallationClient } = await import('@/lib/github-app');
const repositories = await import('@/lib/repositories');

const model = { modelId: 'gemini-3.8-flash' };
const provider = mock(() => model);
const pr = { id: 3, repository_id: 2, number: 42, title: 'Fix login', description: 'Handle expired sessions' };
const repository = { id: 2, organization_id: 1, name: 'pr-cat', full_name: 'acme/pr-cat', owner: { login: 'acme' } };

beforeEach(() => {
  mock.clearAllMocks();
  (auth as ReturnType<typeof mock>).mockResolvedValue({ user: { id: 'user-1' } });
  (createGoogle as ReturnType<typeof mock>).mockReturnValue(provider);
  (generateText as ReturnType<typeof mock>).mockResolvedValue({ text: 'Category: Bug Fix, Confidence: 0.9' });
  (createInstallationClient as ReturnType<typeof mock>).mockResolvedValue({
    getPullRequestDiff: mock().mockResolvedValue('+ fix expired sessions'),
  });
  (repositories.getOrganizationAiSettings as ReturnType<typeof mock>).mockResolvedValue({ provider: 'google', selectedModelId: model.modelId });
  (repositories.getOrganizationApiKey as ReturnType<typeof mock>).mockResolvedValue('test-google-key');
  (repositories.findPullRequestById as ReturnType<typeof mock>).mockResolvedValue(pr);
  (repositories.findPullRequestByNumber as ReturnType<typeof mock>).mockResolvedValue(pr);
  (repositories.findRepositoryById as ReturnType<typeof mock>).mockResolvedValue(repository);
  (repositories.findRepositoryByFullName as ReturnType<typeof mock>).mockResolvedValue(repository);
  (repositories.findOrganizationById as ReturnType<typeof mock>).mockResolvedValue({ id: 1, installation_id: 99 });
  (repositories.getOrganizationCategories as ReturnType<typeof mock>).mockResolvedValue([{ id: 4, name: 'Bug Fix' }]);
  (repositories.findCategoryByNameAndOrg as ReturnType<typeof mock>).mockResolvedValue({ id: 4, name: 'Bug Fix' });
});

it.each(['debug', 'webhook'])('categorizes through %s using the SDK 7 Google factory and instructions option', async (path) => {
  if (path === 'debug') {
    const response = await GET(new NextRequest('http://localhost/api/debug/categorize-pr?pr_id=3'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, category: { name: 'Bug Fix', confidence: 0.9 } });
  } else {
    const result = await new RealGitHubAPIService().processWebhookEvent('pull_request', {
      action: 'opened',
      repository,
      pull_request: { ...pr, body: pr.description, state: 'open' },
    });
    expect(result.processed).toBe(true);
  }

  expect(createGoogle).toHaveBeenCalledWith({ apiKey: 'test-google-key' });
  expect(provider).toHaveBeenCalledWith('gemini-3.8-flash');
  expect(generateText).toHaveBeenCalledWith({
    model,
    instructions: expect.stringContaining('Bug Fix'),
    prompt: expect.stringContaining('+ fix expired sessions'),
  });
  expect(repositories.updatePullRequestCategory).toHaveBeenCalledWith(3, 4, 0.9);
  expect(repositories.updatePullRequest).toHaveBeenCalledWith(3, { ai_status: 'completed' });
});
