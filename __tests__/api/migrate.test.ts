import { afterEach, beforeEach, expect, it, mock, type Mock } from 'bun:test';
import { NextRequest } from 'next/server';

mock.module('@/lib/migrate', () => ({ runMigrations: mock() }));

const { POST } = await import('@/app/api/migrate/route');
const { runMigrations } = await import('@/lib/migrate');

const secret = 'test-migration-secret-long-enough';
const originalEnv = process.env.NODE_ENV;
const originalSecret = process.env.MIGRATION_SECRET;

beforeEach(() => {
  mock.clearAllMocks();
  (runMigrations as Mock<typeof runMigrations>).mockResolvedValue({ success: true });
  Object.assign(process.env, { NODE_ENV: 'production' });
  delete process.env.MIGRATION_SECRET;
});

afterEach(() => {
  Object.assign(process.env, { NODE_ENV: originalEnv });
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
  if (kind === 'returned') (runMigrations as Mock<typeof runMigrations>).mockResolvedValue({ success: false, error: 'schema conflict' });
  else (runMigrations as Mock<typeof runMigrations>).mockRejectedValue(new Error('connection refused'));

  const response = await POST(new NextRequest('http://localhost/api/migrate', {
    headers: { authorization: `Bearer ${secret}` },
  }));

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: 'Migration failed', details: kind === 'returned' ? 'schema conflict' : 'connection refused' });
});

it.each(['development', 'test'])('allows local bootstrap in %s mode', async mode => {
  Object.assign(process.env, { NODE_ENV: mode });
  const response = await POST(new NextRequest('http://localhost/api/migrate'));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ message: 'Migrations completed successfully' });
  expect(runMigrations).toHaveBeenCalledTimes(1);
});
