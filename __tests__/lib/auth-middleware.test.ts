/** @jest-environment node */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withOptionalAuth } from '@/lib/core/application/auth-middleware';
import { ServiceLocator } from '@/lib/core/container';
import type { IAuthService } from '@/lib/core/ports';

jest.mock('@/lib/core/container', () => ({
  ServiceLocator: { getAuthService: jest.fn() },
}));

const authService = {
  getSession: jest.fn(),
  getUserPermissions: jest.fn(),
};

describe('Authentication context permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(ServiceLocator.getAuthService).mockResolvedValue(authService as unknown as IAuthService);
    authService.getSession.mockResolvedValue({
      user: { id: 'user-1' },
      organizations: [{ id: '1' }],
      primaryOrganization: { id: '1' },
    });
    authService.getUserPermissions.mockResolvedValue({
      canRead: false, canWrite: false, canAdmin: false, role: 'viewer',
    });
  });

  it('does not run a protected handler when organization access is denied', async () => {
    const handler = jest.fn(async () => NextResponse.json({ private: true }));
    const response = await withAuth(handler)(new NextRequest('http://localhost/api/metrics/summary'));

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('uses anonymous context for optional auth when organization access is denied', async () => {
    const handler = jest.fn(async () => NextResponse.json({ ok: true }));
    const request = new NextRequest('http://localhost/api/public');
    await withOptionalAuth(handler)(request);

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ isAnonymous: true }), request);
  });

  it('allows viewers with read permission and preserves their organization context', async () => {
    authService.getUserPermissions.mockResolvedValue({
      canRead: true, canWrite: false, canAdmin: false, role: 'viewer',
    });
    const handler = jest.fn(async () => NextResponse.json({ ok: true }));
    const request = new NextRequest('http://localhost/api/metrics/summary');
    const response = await withAuth(handler)(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ organizationId: '1' }), request);
    expect(authService.getUserPermissions).toHaveBeenCalledWith('user-1', '1');
  });

  it('uses the selected member organization and its permissions instead of the primary organization', async () => {
    authService.getSession.mockResolvedValue({
      user: { id: 'user-1' }, organizations: [{ id: '1' }, { id: '2' }], primaryOrganization: { id: '1' },
    });
    const permissions = { canRead: true, canWrite: true, canAdmin: false, role: 'member' };
    authService.getUserPermissions.mockResolvedValue(permissions);
    const handler = jest.fn(async () => NextResponse.json({ ok: true }));
    const request = new NextRequest('http://localhost/api/metrics/summary?organizationId=2');

    expect((await withAuth(handler)(request)).status).toBe(200);

    expect(authService.getUserPermissions).toHaveBeenCalledTimes(1);
    expect(authService.getUserPermissions).toHaveBeenCalledWith('user-1', '2');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: '2', primaryOrganization: { id: '2' }, permissions,
    }), request);
  });

  it('does not substitute primary-organization permissions for denied selected-organization access', async () => {
    authService.getSession.mockResolvedValue({
      user: { id: 'user-1' }, organizations: [{ id: '1' }, { id: '2' }], primaryOrganization: { id: '1' },
    });
    authService.getUserPermissions.mockImplementation(async (_userId, organizationId) => ({
      canRead: organizationId === '1', canWrite: organizationId === '1', canAdmin: organizationId === '1', role: 'admin',
    }));
    const handler = jest.fn(async () => NextResponse.json({ private: true }));

    const response = await withAuth(handler)(new NextRequest('http://localhost/api/metrics/summary?organizationId=2'));

    expect(response.status).toBe(401);
    expect(authService.getUserPermissions).toHaveBeenCalledWith('user-1', '2');
    expect(handler).not.toHaveBeenCalled();
  });

  it.each(['', '999', 'invalid', '-1', '1.5', '01'])('rejects foreign or invalid selected organization %s before requesting permissions', async organizationId => {
    authService.getUserPermissions.mockResolvedValue({ canRead: true, canWrite: true, canAdmin: true, role: 'admin' });
    const handler = jest.fn(async () => NextResponse.json({ private: true }));

    const response = await withAuth(handler)(new NextRequest(`http://localhost/api/metrics/summary?organizationId=${organizationId}`));

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    expect(authService.getUserPermissions).not.toHaveBeenCalled();
  });

  it('falls back to the first member organization only when no selection or primary organization exists', async () => {
    authService.getSession.mockResolvedValue({ user: { id: 'user-1' }, organizations: [{ id: '2' }] });
    authService.getUserPermissions.mockResolvedValue({ canRead: true, canWrite: false, canAdmin: false, role: 'viewer' });
    const handler = jest.fn(async () => NextResponse.json({ ok: true }));
    const request = new NextRequest('http://localhost/api/metrics/summary');

    expect((await withAuth(handler)(request)).status).toBe(200);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ organizationId: '2' }), request);
  });
});
