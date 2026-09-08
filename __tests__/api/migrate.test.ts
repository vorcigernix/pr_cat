/** @jest-environment node */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/migrate/route';
import { runMigrations } from '@/lib/migrate';

jest.mock('@/lib/migrate', () => ({ runMigrations: jest.fn() }));

const secret = 'test-migration-secret-long-enough';
const originalEnv = process.env.NODE_ENV;
const originalSecret = process.env.MIGRATION_SECRET;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(runMigrations).mockResolvedValue({ success: true });
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
  delete process.env.MIGRATION_SECRET;
});

afterEach(() => {
  Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  if (originalSecret === undefined) delete process.env.MIGRATION_SECRET;
  else process.env.MIGRATION_SECRET = originalSecret;
});

it.each([
  [undefined, undefined],
  [secret, undefined],
  [secret, 'Bearer wrong-secret'],
  [secret, `Basic ${secret}`],
])('rejects unauthorized production migrations (configured secret: %s, header: %s)', async (configured, authorization) => {
  if (configured) process.env.MIGRATION_SECRET = configured;
  const request = new NextRequest('http://localhost/api/migrate', {
    headers: authorization ? { authorization } : {},
  });

  const response = await POST(request);

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: 'Unauthorized' });
  expect(runMigrations).not.toHaveBeenCalled();
});

it('runs migrations when the correct production secret is provided', async () => {
  process.env.MIGRATION_SECRET = secret;
  const response = await POST(new NextRequest('http://localhost/api/migrate', {
    headers: { authorization: `Bearer ${secret}` },
  }));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ message: 'Migrations completed successfully' });
  expect(runMigrations).toHaveBeenCalledTimes(1);
});

it.each(['returned', 'thrown'])('reports a %s migration failure', async kind => {
  process.env.MIGRATION_SECRET = secret;
  if (kind === 'returned') jest.mocked(runMigrations).mockResolvedValue({ success: false, error: 'schema conflict' });
  else jest.mocked(runMigrations).mockRejectedValue(new Error('connection refused'));

  const response = await POST(new NextRequest('http://localhost/api/migrate', {
    headers: { authorization: `Bearer ${secret}` },
  }));

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: 'Migration failed', details: kind === 'returned' ? 'schema conflict' : 'connection refused' });
});

it.each(['development', 'test'])('allows local bootstrap in %s mode', async mode => {
  Object.defineProperty(process.env, 'NODE_ENV', { value: mode, writable: true });
  const response = await POST(new NextRequest('http://localhost/api/migrate'));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ message: 'Migrations completed successfully' });
  expect(runMigrations).toHaveBeenCalledTimes(1);
});
