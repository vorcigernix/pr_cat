/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import type { Client } from '@libsql/client';
import { auth } from '@/auth';
import { getDbClient } from '@/lib/db';
import { DIContainer, ServiceLocator } from '@/lib/core/container';
import type { IRepository, IGitHubService, IGitHubAppService } from '@/lib/core/ports';
import { EnvironmentConfig } from '@/lib/infrastructure/config/environment';
import { DemoAuthService, DemoGitHubService } from '@/lib/infrastructure/adapters/demo';
import { TursoAuthService } from '@/lib/infrastructure/adapters/turso/auth.adapter';
import { OptimizedTursoMetricsService } from '@/lib/infrastructure/adapters/turso/optimized-metrics.adapter';
import { OptimizedTursoPullRequestRepository } from '@/lib/infrastructure/adapters/turso/optimized-pull-request.adapter';
import { RealGitHubAPIService } from '@/lib/infrastructure/adapters/github/real-github.adapter';
import { GitHubAppService } from '@/lib/infrastructure/adapters/github/github-app.adapter';

// Only external SDK calls are replaced; the container, adapters and database are real.
jest.mock('ai', () => ({ generateText: jest.fn() }));
jest.mock('@ai-sdk/google', () => ({ createGoogle: jest.fn() }));
jest.mock('@ai-sdk/openai', () => ({ createOpenAI: jest.fn() }));
jest.mock('@ai-sdk/anthropic', () => ({ createAnthropic: jest.fn() }));
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    users: { getAuthenticated: jest.fn().mockResolvedValue({ data: {
      id: 42, login: 'github-alice', name: 'Alice from GitHub', avatar_url: 'https://example.com/avatar',
      html_url: 'https://github.com/github-alice', created_at: '2020-01-01', updated_at: '2026-01-01',
    } }) },
  })),
}));

const environment = { ...process.env };
let db: Client;

beforeAll(async () => {
  process.env = { ...environment, TURSO_URL: 'file::memory:', TURSO_POOL_SIZE: '1' };
  db = getDbClient();
  await db.executeMultiple(readFileSync('lib/schema.sql', 'utf8'));
  await db.executeMultiple(`
    INSERT INTO users (id, name) VALUES ('alice', 'Alice');
    INSERT INTO organizations (id, name, installation_id) VALUES (0, 'Acme', 99), (1, 'Foreign', NULL);
    INSERT INTO user_organizations (user_id, organization_id, role) VALUES ('alice', 0, 'owner');
    INSERT INTO repositories (id, organization_id, name, full_name, is_tracked) VALUES (10, 0, 'app', 'Acme/app', 1), (20, 1, 'private', 'Foreign/private', 1);
  `);
  await db.execute({
    sql: 'INSERT INTO pull_requests (id, github_id, repository_id, number, title, author_id, state, created_at, updated_at, additions, deletions) VALUES (1, 1, 10, 7, ?, ?, ?, ?, ?, 8, 2)',
    args: ['Persisted PR', 'alice', 'open', new Date().toISOString(), new Date().toISOString()],
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...environment, TURSO_URL: 'file::memory:', TURSO_POOL_SIZE: '1', DEMO_MODE: 'false' };
  DIContainer.reset();
  (auth as jest.Mock).mockResolvedValue({ user: { id: 'alice' }, expires: '2099-01-01', accessToken: 'session-token' });
  jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected external request'));
});

afterEach(() => jest.restoreAllMocks());

afterAll(() => {
  DIContainer.reset();
  db.close();
  process.env = environment;
  EnvironmentConfig.getInstance().refresh();
});

it.each(['forced demo', 'missing database', 'missing GitHub App'])('resolves a working demo dashboard with %s', async mode => {
  if (mode === 'forced demo') process.env.DEMO_MODE = 'true';
  if (mode === 'missing database') delete process.env.TURSO_URL;
  if (mode === 'missing GitHub App') delete process.env.GITHUB_APP_ID;
  EnvironmentConfig.getInstance().refresh();
  const databaseExecute = jest.spyOn(db, 'execute');
  const authService = await ServiceLocator.getAuthService();
  expect(authService).toBeInstanceOf(DemoAuthService);
  const session = await authService.getSession();
  expect(session?.primaryOrganization.id).toMatch(/^demo-/);
  const organizationId = session!.primaryOrganization.id;
  const organizations = await ServiceLocator.getOrganizationRepository();
  const repositories = await organizations.getRepositories(organizationId);
  expect(repositories.length).toBeGreaterThan(0);
  const repository = await DIContainer.getInstance().get<IRepository>('Repository');
  expect(await repository.getById(repositories[0].id)).toMatchObject({ id: repositories[0].id, organizationId });
  const prs = await (await ServiceLocator.getPullRequestRepository()).getRecent(organizationId);
  expect(prs.data.length).toBeGreaterThan(0);
  const metrics = await (await ServiceLocator.getMetricsService()).getSummary(organizationId);
  expect(metrics.trackedRepositories).toBeGreaterThan(0);
  const github = await DIContainer.getInstance().get<IGitHubService>('GitHubService');
  expect(github).toBeInstanceOf(DemoGitHubService);
  expect(await github.getUser('unused-token')).toMatchObject({ id: session!.user.id });
  expect(await DIContainer.getInstance().get('GitHubAppService')).toBeInstanceOf(GitHubAppService);
  expect(ServiceLocator.getContainerStatus()).toMatchObject({ mode: 'demo', initialized: true });
  expect(databaseExecute).not.toHaveBeenCalled();
  expect(auth).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it('wires production services to persisted identity, permissions, repositories and metrics', async () => {
  process.env.GITHUB_APP_PRIVATE_KEY = generateKeyPairSync('rsa', {
    modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' },
  }).privateKey;
  EnvironmentConfig.getInstance().refresh();
  const container = DIContainer.getInstance();
  const authService = await ServiceLocator.getAuthService();
  expect(authService).toBeInstanceOf(TursoAuthService);
  expect(await authService.getSession()).toMatchObject({
    user: { id: 'alice', name: 'Alice', hasGithubApp: true }, organizations: [{ id: '0' }], primaryOrganization: { id: '0' },
  });
  expect(await authService.getUserPermissions('alice', '0')).toMatchObject({ canAdmin: true, canWrite: true, canRead: true });
  expect(await authService.getUserPermissions('alice', '1')).toMatchObject({ canAdmin: false, canWrite: false, canRead: false });
  const organizations = await ServiceLocator.getOrganizationRepository();
  expect(await organizations.getRepositories('0')).toMatchObject([{ id: '10', name: 'app', isTracked: true }]);
  const repository = await container.get<IRepository>('Repository');
  expect(await repository.getById('10')).toMatchObject({ fullName: 'Acme/app', organizationId: '0', isPrivate: false, isTracked: true });
  const prs = await ServiceLocator.getPullRequestRepository();
  expect(prs).toBeInstanceOf(OptimizedTursoPullRequestRepository);
  expect((await prs.getRecent('0')).data).toMatchObject([{ id: '1', title: 'Persisted PR', repository: { id: '10' } }]);
  const metrics = await ServiceLocator.getMetricsService();
  expect(metrics).toBeInstanceOf(OptimizedTursoMetricsService);
  expect(await metrics.getSummary('0')).toMatchObject({ trackedRepositories: 1, openPRCount: 1, averagePRSize: 10 });
  const github = await container.get<IGitHubService>('GitHubService');
  expect(github).toBeInstanceOf(RealGitHubAPIService);
  expect(await github.getUser('external-test-token')).toMatchObject({ id: '42', login: 'github-alice', name: 'Alice from GitHub' });
  const app = await container.get<IGitHubAppService>('GitHubAppService');
  expect(await app.validateConfiguration()).toMatchObject({ isValid: true, errors: [], hasPrivateKey: true });
  expect(ServiceLocator.getContainerStatus()).toMatchObject({ mode: 'production', initialized: true });
  expect(fetch).not.toHaveBeenCalled();
});

it('shares the registered singleton when two requests resolve it concurrently', async () => {
  process.env.DEMO_MODE = 'true';
  EnvironmentConfig.getInstance().refresh();
  const [first, second] = await Promise.all([ServiceLocator.getAuthService(), ServiceLocator.getAuthService()]);
  expect(first).toBe(second);
  expect(await first.getSession()).toBe(await second.getSession());
});

it('allows service construction to recover after a rejected initialization', async () => {
  EnvironmentConfig.getInstance().refresh();
  const container = DIContainer.getInstance();
  let unavailable = true;
  container.register('AuthService', () => {
    if (unavailable) throw new Error('Temporary initialization failure');
    return new DemoAuthService();
  });
  await expect(ServiceLocator.getAuthService()).rejects.toThrow('Temporary initialization failure');
  unavailable = false;
  const service = await ServiceLocator.getAuthService();
  expect(await service.getSession()).toMatchObject({ user: { id: 'demo-user-1' } });
  expect(await ServiceLocator.getAuthService()).toBe(service);
});
