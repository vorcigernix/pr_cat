/** @jest-environment node */

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { GitHubService } from '@/lib/services';
import { findRepositoryById } from '@/lib/repositories';
import { getOrganizationRole } from '@/lib/repositories/user-repository';
import { POST } from '@/app/api/github/repositories/[repositoryId]/sync/route';

jest.mock('@/lib/services', () => ({ GitHubService: jest.fn() }));
jest.mock('@/lib/repositories', () => ({ findRepositoryById: jest.fn() }));
jest.mock('@/lib/repositories/user-repository', () => ({ getOrganizationRole: jest.fn() }));

const syncRepositoryPullRequests = jest.fn();
const request = new NextRequest('http://localhost/api/github/repositories/1/sync', { method: 'POST' });
const params = Promise.resolve({ repositoryId: '1' });

beforeEach(() => {
  jest.clearAllMocks();
  (auth as jest.Mock).mockResolvedValue({ user: { id: '7' }, accessToken: 'test-token' });
  (findRepositoryById as jest.Mock).mockResolvedValue({ id: 1, organization_id: 9, full_name: 'Org/repo' });
  (getOrganizationRole as jest.Mock).mockResolvedValue('member');
  (GitHubService as jest.Mock).mockReturnValue({ syncRepositoryPullRequests });
});

it('rejects synchronization outside the signed-in user organization', async () => {
  (getOrganizationRole as jest.Mock).mockResolvedValue(null);
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
