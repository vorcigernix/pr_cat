/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import { createClient, type Client } from '@libsql/client';
import { Octokit } from '@octokit/rest';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import type { Session } from 'next-auth';
import { GET as list, POST as syncAll } from '@/app/api/github-app/installations/route';
import { GET, POST, DELETE } from '@/app/api/github-app/installations/[installationId]/route';

jest.mock('@libsql/client', () => ({ ...jest.requireActual('@libsql/client'), createClient: jest.fn() }));
jest.mock('@octokit/rest', () => ({ Octokit: jest.fn() }));
jest.mock('ai', () => ({ generateText: jest.fn() }));
jest.mock('@ai-sdk/google', () => ({ createGoogle: jest.fn() }));
jest.mock('@ai-sdk/openai', () => ({ createOpenAI: jest.fn() }));
jest.mock('@ai-sdk/anthropic', () => ({ createAnthropic: jest.fn() }));

let db: Client;
const mockAuth = auth as unknown as jest.MockedFunction<() => Promise<Session | null>>;
const originalEnvironment = { GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY, DEMO_MODE: process.env.DEMO_MODE };
const installation = (id: number, organizationId: number, login: string) => ({
  id, account: { id: organizationId, login, type: 'Organization', avatar_url: '' },
  permissions: { contents: 'read' }, repository_selection: 'all', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-08T00:00:00Z',
});
const own = installation(42, 100, 'Org');
const foreign = installation(99, 200, 'Other');
const newlyInstalled = installation(88, 300, 'NewOrg');
const repository = { id: 500, name: 'repo', full_name: 'Org/repo', description: 'Private repository', private: true, owner: { id: 100 }, html_url: '', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-08T00:00:00Z' };
const api = {
  listInstallations: jest.fn(), getInstallation: jest.fn(), createInstallationAccessToken: jest.fn(),
  listReposAccessibleToInstallation: jest.fn(), listInstallationsForAuthenticatedUser: jest.fn(), listForAuthenticatedUser: jest.fn(),
};
const params = (id = '42') => ({ params: Promise.resolve({ installationId: id }) });
const request = (method = 'GET', search = '') => new NextRequest(`http://localhost/api/github-app/installations/42${search}`, { method });

beforeAll(async () => {
  db = jest.requireActual<typeof import('@libsql/client')>('@libsql/client').createClient({ url: 'file::memory:' });
  jest.mocked(createClient).mockReturnValue(db);
  await db.executeMultiple(readFileSync('lib/schema.sql', 'utf8'));
  process.env.GITHUB_APP_PRIVATE_KEY = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
  process.env.DEMO_MODE = 'false';
});

beforeEach(async () => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: 'viewer' }, expires: '2099-01-01' });
  (Octokit as unknown as jest.Mock).mockImplementation(() => ({ apps: api, request: api.createInstallationAccessToken, orgs: { listForAuthenticatedUser: api.listForAuthenticatedUser } }));
  api.listInstallations.mockReset().mockResolvedValue({ data: [own, foreign] });
  api.getInstallation.mockReset().mockImplementation(async ({ installation_id }) => ({ data: [own, foreign, newlyInstalled].find(item => item.id === installation_id) }));
  api.createInstallationAccessToken.mockReset().mockResolvedValue({ data: { token: 'installation-token', expires_at: '2099-01-01T00:00:00Z' } });
  api.listReposAccessibleToInstallation.mockReset().mockResolvedValue({ data: { repositories: [repository] } });
  api.listInstallationsForAuthenticatedUser.mockReset().mockResolvedValue({ data: { installations: [] } });
  api.listForAuthenticatedUser.mockReset().mockResolvedValue({ data: [] });
  await db.executeMultiple(`DELETE FROM repositories; DELETE FROM user_organizations; DELETE FROM organizations; DELETE FROM users;
    INSERT INTO users (id, name) VALUES ('viewer', 'Viewer');
    INSERT INTO organizations (id, github_id, name, installation_id) VALUES (1, 100, 'Org', 42), (2, 200, 'Other', 99);
    INSERT INTO user_organizations (user_id, organization_id, role) VALUES ('viewer', 1, 'member');`);
});

afterAll(() => {
  db.close();
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

it('requires authentication for list, bulk sync, details, sync, and cache clearing', async () => {
  mockAuth.mockResolvedValue(null);
  const responses = await Promise.all([list(), syncAll(), GET(request(), params()), POST(request('POST'), params()), DELETE(request('DELETE'), params())]);
  expect(responses.map(response => response.status)).toEqual([401, 401, 401, 401, 401]);
  expect(api.listInstallations).not.toHaveBeenCalled();
  expect(api.getInstallation).not.toHaveBeenCalled();
});

it('lists only installations belonging to the signed-in user organizations', async () => {
  const response = await list();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.installations.map((item: { id: number }) => item.id)).toEqual([42]);
  expect(body).toMatchObject({ total: 1, configured: true });
});

it('denies foreign installation details, synchronization, and credential cache operations', async () => {
  const responses = await Promise.all([GET(request(), params('99')), POST(request('POST'), params('99')), DELETE(request('DELETE'), params('99'))]);
  expect(responses.map(response => response.status)).toEqual([404, 404, 404]);
  expect(api.listReposAccessibleToInstallation).not.toHaveBeenCalled();
  expect((await db.execute('SELECT COUNT(*) AS count FROM repositories')).rows[0].count).toBe(0);
});

it.each(['42suffix', '-1', '0', '1.5', '9007199254740992'])('rejects malformed installation ID %s before GitHub access', async id => {
  const responses = await Promise.all([GET(request(), params(id)), POST(request('POST'), params(id)), DELETE(request('DELETE'), params(id))]);
  expect(responses.map(response => response.status)).toEqual([400, 400, 400]);
  expect(api.getInstallation).not.toHaveBeenCalled();
});

it('synchronizes authorized repositories through the actual adapter and preserves tracking', async () => {
  const response = await POST(request('POST'), params());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true, repositories: { count: 1 } });
  expect((await db.execute('SELECT organization_id, full_name, private, is_tracked FROM repositories')).rows).toEqual([
    { organization_id: 1, full_name: 'Org/repo', private: 1, is_tracked: 0 },
  ]);
  await db.execute('UPDATE repositories SET is_tracked = 1');
  expect((await POST(request('POST'), params())).status).toBe(200);
  expect((await db.execute('SELECT COUNT(*) AS count, MAX(is_tracked) AS tracked FROM repositories')).rows[0]).toEqual({ count: 1, tracked: 1 });
});

it('bulk synchronization excludes foreign installations from both persistence and counts', async () => {
  const response = await syncAll();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.totalInstallations).toBe(1);
  expect(body.synced.map((item: { installationId: number }) => item.installationId)).toEqual([42]);
  expect((await db.execute('SELECT organization_id FROM repositories')).rows).toEqual([{ organization_id: 1 }]);
});

it('reports partial repository synchronization as failure and allows retry', async () => {
  api.listReposAccessibleToInstallation.mockRejectedValueOnce(new Error('GitHub unavailable'));
  const response = await POST(request('POST'), params());
  expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({ success: false, repositories: { count: 0 }, errors: [expect.stringContaining('GitHub unavailable')] });
  expect((await POST(request('POST'), params())).status).toBe(200);
  expect((await db.execute('SELECT COUNT(*) AS count FROM repositories')).rows[0].count).toBe(1);
});

it('reports requested repository lookup failures instead of returning incomplete success', async () => {
  api.listReposAccessibleToInstallation.mockRejectedValueOnce(new Error('GitHub unavailable'));
  expect((await GET(request('GET', '?include_repositories=true'), params())).status).toBe(502);
});

it('supports a new installation only after GitHub confirms both organization membership and installation access', async () => {
  mockAuth.mockResolvedValue({ user: { id: 'viewer' }, accessToken: 'user-token', expires: '2099-01-01' });
  api.listForAuthenticatedUser.mockResolvedValue({ data: [{ id: 300, login: 'NewOrg' }] });
  api.listInstallationsForAuthenticatedUser.mockResolvedValue({ data: { installations: [newlyInstalled] } });
  api.listReposAccessibleToInstallation.mockResolvedValue({ data: { repositories: [] } });
  const response = await POST(request('POST'), params('88'));
  expect(response.status).toBe(200);
  expect((await db.execute('SELECT github_id, installation_id FROM organizations WHERE github_id = 300')).rows).toEqual([{ github_id: 300, installation_id: 88 }]);
  expect((await db.execute("SELECT uo.role FROM user_organizations uo JOIN organizations o ON o.id = uo.organization_id WHERE uo.user_id = 'viewer' AND o.github_id = 300")).rows).toEqual([{ role: 'member' }]);
});

it('does not turn outside-collaborator installation access into organization-wide access', async () => {
  mockAuth.mockResolvedValue({ user: { id: 'viewer' }, accessToken: 'user-token', expires: '2099-01-01' });
  api.listInstallationsForAuthenticatedUser.mockResolvedValue({ data: { installations: [foreign] } });
  expect((await GET(request(), params('99'))).status).toBe(404);
});

it('clears only an authorized installation token cache', async () => {
  expect((await DELETE(request('DELETE'), params())).status).toBe(200);
  expect((await GET(request('GET', '?include_repositories=true'), params())).status).toBe(200);
  expect(api.createInstallationAccessToken).toHaveBeenCalledTimes(1);
  mockAuth.mockResolvedValue({ user: { id: 'outsider' }, expires: '2099-01-01' });
  expect((await DELETE(request('DELETE'), params())).status).toBe(404);
  mockAuth.mockResolvedValue({ user: { id: 'viewer' }, expires: '2099-01-01' });
  expect((await GET(request('GET', '?include_repositories=true'), params())).status).toBe(200);
  expect(api.createInstallationAccessToken).toHaveBeenCalledTimes(1);
  expect((await DELETE(request('DELETE'), params())).status).toBe(200);
  expect((await GET(request('GET', '?include_repositories=true'), params())).status).toBe(200);
  expect(api.createInstallationAccessToken).toHaveBeenCalledTimes(2);
});

it('reports bulk sync failures accurately', async () => {
  api.listReposAccessibleToInstallation.mockRejectedValueOnce(new Error('GitHub unavailable'));
  const response = await syncAll();
  expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({ success: false, totalInstallations: 1, totalErrors: 1 });
});

it('returns not found consistently when GitHub no longer has the installation', async () => {
  api.getInstallation.mockRejectedValue(new Error('Not Found'));
  const responses = await Promise.all([GET(request(), params()), POST(request('POST'), params()), DELETE(request('DELETE'), params())]);
  expect(responses.map(response => response.status)).toEqual([404, 404, 404]);
});
