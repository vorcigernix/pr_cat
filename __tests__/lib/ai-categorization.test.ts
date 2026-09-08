/** @jest-environment node */

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { createGoogle } from '@ai-sdk/google';
import { generateText } from 'ai';
import { GET } from '@/app/api/debug/categorize-pr/route';
import { RealGitHubAPIService } from '@/lib/infrastructure/adapters/github/real-github.adapter';
import { createInstallationClient } from '@/lib/github-app';
import * as repositories from '@/lib/repositories';

jest.mock('ai', () => ({ generateText: jest.fn() }));
jest.mock('@ai-sdk/google', () => ({ createGoogle: jest.fn() }));
jest.mock('@ai-sdk/openai', () => ({ createOpenAI: jest.fn() }));
jest.mock('@ai-sdk/anthropic', () => ({ createAnthropic: jest.fn() }));
jest.mock('@/lib/github', () => ({ createGitHubClient: jest.fn() }));
jest.mock('@/lib/github-app', () => ({ createInstallationClient: jest.fn() }));
jest.mock('@/lib/repositories/settings-repository', () => ({
  getOrganizationAiSettings: jest.fn(),
  getOrganizationApiKey: jest.fn(),
}));
jest.mock('@/lib/repositories/category-repository', () => ({
  getOrganizationCategories: jest.fn(),
  findCategoryByNameAndOrg: jest.fn(),
}));
jest.mock('@/lib/repositories/organization-repository', () => ({ findOrganizationById: jest.fn() }));
jest.mock('@/lib/repositories/pr-repository', () => ({ updatePullRequest: jest.fn() }));
jest.mock('@/lib/repositories', () => ({
  ...jest.requireMock('@/lib/repositories/settings-repository'),
  ...jest.requireMock('@/lib/repositories/category-repository'),
  ...jest.requireMock('@/lib/repositories/organization-repository'),
  ...jest.requireMock('@/lib/repositories/pr-repository'),
  findPullRequestById: jest.fn(),
  findRepositoryById: jest.fn(),
  findPullRequestByNumber: jest.fn(),
  findRepositoryByFullName: jest.fn(),
  updatePullRequestCategory: jest.fn(),
}));

const model = { modelId: 'gemini-3.8-flash' };
const provider = jest.fn(() => model);
const pr = { id: 3, repository_id: 2, number: 42, title: 'Fix login', description: 'Handle expired sessions' };
const repository = { id: 2, organization_id: 1, name: 'pr-cat', full_name: 'acme/pr-cat', owner: { login: 'acme' } };

beforeEach(() => {
  jest.clearAllMocks();
  (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
  (createGoogle as jest.Mock).mockReturnValue(provider);
  (generateText as jest.Mock).mockResolvedValue({ text: 'Category: Bug Fix, Confidence: 0.9' });
  (createInstallationClient as jest.Mock).mockResolvedValue({
    getPullRequestDiff: jest.fn().mockResolvedValue('+ fix expired sessions'),
  });
  (repositories.getOrganizationAiSettings as jest.Mock).mockResolvedValue({ provider: 'google', selectedModelId: model.modelId });
  (repositories.getOrganizationApiKey as jest.Mock).mockResolvedValue('test-google-key');
  (repositories.findPullRequestById as jest.Mock).mockResolvedValue(pr);
  (repositories.findPullRequestByNumber as jest.Mock).mockResolvedValue(pr);
  (repositories.findRepositoryById as jest.Mock).mockResolvedValue(repository);
  (repositories.findRepositoryByFullName as jest.Mock).mockResolvedValue(repository);
  (repositories.findOrganizationById as jest.Mock).mockResolvedValue({ id: 1, installation_id: 99 });
  (repositories.getOrganizationCategories as jest.Mock).mockResolvedValue([{ id: 4, name: 'Bug Fix' }]);
  (repositories.findCategoryByNameAndOrg as jest.Mock).mockResolvedValue({ id: 4, name: 'Bug Fix' });
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
