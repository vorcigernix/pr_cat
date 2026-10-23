import { beforeEach, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';

mock.module('@/lib/services', () => ({ GitHubService: mock() }));
mock.module('@/lib/repositories', () => ({ findRepositoryById: mock() }));
mock.module('@/lib/repositories/user-repository', () => ({ getOrganizationRole: mock() }));

mock.module('@/auth', () => ({ auth: mock() }));

const { auth } = await import('@/auth');
const { GitHubService } = await import('@/lib/services');
const { findRepositoryById } = await import('@/lib/repositories');
const { getOrganizationRole } = await import('@/lib/repositories/user-repository');
const { POST } = await import('@/app/api/github/repositories/[repositoryId]/sync/route');

const syncRepositoryPullRequests = mock();
const request = new NextRequest('http://localhost/api/github/repositories/1/sync', { method: 'POST' });
const params = Promise.resolve({ repositoryId: '1' });

beforeEach(() => {
  mock.clearAllMocks();
  (auth as ReturnType<typeof mock>).mockResolvedValue({ user: { id: '7' }, accessToken: 'test-token' });
  (findRepositoryById as ReturnType<typeof mock>).mockResolvedValue({ id: 1, organization_id: 9, full_name: 'Org/repo' });
  (getOrganizationRole as ReturnType<typeof mock>).mockResolvedValue('member');
  (GitHubService as unknown as ReturnType<typeof mock>).mockReturnValue({ syncRepositoryPullRequests });
});

it('rejects synchronization outside the signed-in user organization', async () => {
  (getOrganizationRole as ReturnType<typeof mock>).mockResolvedValue(null);
  expect((await POST(request, { params })).status).toBe(403);
  expect(syncRepositoryPullRequests).not.toHaveBeenCalled();
});

it('returns failed status and partial counters without claiming successful synchronization', async () => {
  syncRepositoryPullRequests.mockResolvedValue({ processed: 3, created: 4, updated: 0, unchanged: 0, errors: [{ pr: 4, error: 'Reviews unavailable' }] });
  const response = await POST(request, { params });
  expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({ success: false, count: 3, created: 4, errors: [{ pr: 4, error: 'Reviews unavailable' }] });
});

it('returns successful compact counters and persisted completion time', async () => {
  syncRepositoryPullRequests.mockResolvedValue({ processed: 2, created: 0, updated: 1, unchanged: 1, errors: [], lastSyncedAt: '2026-09-07T12:00:00Z' });
  const response = await POST(request, { params });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true, count: 2, updated: 1, unchanged: 1, lastSyncedAt: '2026-09-07T12:00:00Z' });
  expect(syncRepositoryPullRequests).toHaveBeenCalledWith('Org', 'repo', 1);
});
