/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { createClient, type Client } from '@libsql/client';
import NextAuth, { type NextAuthOptions } from 'next-auth';
import { execute } from '@/lib/db';
import { GitHubService } from '@/lib/services';

jest.mock('@/lib/db', () => ({ execute: jest.fn() }));
jest.mock('@/lib/services', () => ({ GitHubService: jest.fn() }));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('next-auth/providers/github', () => ({ __esModule: true, default: jest.fn().mockReturnValue({ id: 'github' }) }));

let db: Client;

beforeEach(async () => {
  db = createClient({ url: 'file::memory:' });
  await db.executeMultiple(readFileSync('lib/schema.sql', 'utf8'));
  jest.mocked(execute).mockImplementation(async (sql, args) => {
    const result = await db.execute({ sql, args });
    return { rowsAffected: result.rowsAffected, lastInsertId: Number(result.lastInsertRowid) };
  });
});

afterEach(() => db.close());

it('inserts and updates the signed-in user while awaiting lightweight organization bootstrap', async () => {
  let release!: () => void;
  let notifyBootstrap!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const bootstrapStarted = new Promise<void>(resolve => { notifyBootstrap = resolve; });
  const syncUserOrganizations = jest.fn().mockImplementation(() => {
    notifyBootstrap();
    return pending;
  });
  (GitHubService as jest.Mock).mockReturnValue({ syncUserOrganizations });
  jest.requireActual('@/auth');
  const config = jest.mocked(NextAuth).mock.calls[0][0] as unknown as NextAuthOptions;
  const signIn = config.callbacks!.signIn!;
  const account = { provider: 'github', type: 'oauth' as const, providerAccountId: '7', access_token: 'test-token' };
  const profile = { id: 7, login: 'user' } as Parameters<typeof signIn>[0]['profile'];
  const user = { id: 'auth-id', name: 'User', email: null, image: null };
  let settled = false;
  const result = Promise.resolve(signIn({ user, account, profile }))
    .then(value => { settled = true; return value; });
  await Promise.race([bootstrapStarted, result]);
  expect(syncUserOrganizations).toHaveBeenCalledWith('7', { includeDetails: false });
  expect(settled).toBe(false);
  release();
  expect(await result).toBe(true);
  expect(user.id).toBe('7');
  const inserted = (await db.execute('SELECT * FROM users')).rows;
  expect(inserted).toHaveLength(1);
  expect(inserted[0]).toMatchObject({ id: '7', name: 'User', email: null, image: null });
  expect(Number.isFinite(Date.parse(String(inserted[0].created_at)))).toBe(true);

  const previousTimestamp = '2020-01-01 00:00:00';
  await db.execute({ sql: 'UPDATE users SET created_at = ?, updated_at = ? WHERE id = ?', args: [previousTimestamp, previousTimestamp, '7'] });
  const returningUser = { id: 'new-auth-id', name: 'Updated User', email: 'updated@example.com', image: 'https://example.com/avatar.png' };
  expect(await signIn({ user: returningUser, account, profile })).toBe(true);
  expect(returningUser.id).toBe('7');
  expect(syncUserOrganizations).toHaveBeenCalledTimes(2);
  const updated = (await db.execute('SELECT * FROM users')).rows;
  expect(updated).toHaveLength(1);
  expect(updated[0]).toMatchObject({
    id: '7', name: returningUser.name, email: returningUser.email, image: returningUser.image,
    created_at: previousTimestamp,
  });
  expect(Number.isFinite(Date.parse(String(updated[0].updated_at)))).toBe(true);
  expect(updated[0].updated_at).not.toBe(previousTimestamp);
});
