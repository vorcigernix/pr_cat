/** @jest-environment node */

import { readFileSync } from 'node:fs';
import type { Client } from '@libsql/client';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getDbClient } from '@/lib/db';
import { GET, PUT } from '@/app/api/organizations/[orgId]/ai-settings/route';

const environment = { ...process.env };
let db: Client;
const params = { params: Promise.resolve({ orgId: '0' }) };
const url = 'http://localhost/api/organizations/0/ai-settings';

beforeAll(async () => {
  process.env = { ...environment, TURSO_URL: 'file::memory:', TURSO_POOL_SIZE: '1' };
  db = getDbClient();
  await db.executeMultiple(readFileSync('lib/schema.sql', 'utf8'));
});

beforeEach(async () => {
  jest.clearAllMocks();
  await db.executeMultiple(`
    DROP TRIGGER IF EXISTS reject_key;
    DELETE FROM settings;
    DELETE FROM users;
    DELETE FROM organizations;
    INSERT INTO users (id, name) VALUES ('alice', 'Alice');
    INSERT INTO organizations (id, name) VALUES (0, 'Admin org'), (1, 'Owner org'), (2, 'Member org'), (3, 'Foreign org');
    INSERT INTO user_organizations (user_id, organization_id, role) VALUES
      ('alice', 0, 'admin'), ('alice', 1, 'owner'), ('alice', 2, 'member');
    INSERT INTO settings (organization_id, key, value) VALUES
      (0, 'ai_google_api_key', 'saved-secret-sentinel'), (3, 'ai_google_api_key', 'foreign-secret');
  `);
  (auth as jest.Mock).mockResolvedValue({ user: { id: 'alice' } });
});

afterAll(() => {
  db.close();
  process.env = environment;
});

it.each([['GET', GET], ['PUT', PUT]] as const)('%s rejects unauthenticated requests before accessing settings', async (method, handler) => {
  (auth as jest.Mock).mockResolvedValue(null);
  const response = await handler(new NextRequest(url, { method, ...(method === 'PUT' && { body: '{}' }) }), params);
  expect(response.status).toBe(401);
  expect((await db.execute('SELECT COUNT(*) AS count FROM settings')).rows[0].count).toBe(2);
});

it.each(['2', '3'])('denies members and nonmembers access to organization %s', async orgId => {
  const context = { params: Promise.resolve({ orgId }) };
  expect((await GET(new NextRequest(url), context)).status).toBe(403);
  const response = await PUT(new NextRequest(url, { method: 'PUT', body: JSON.stringify({ googleApiKey: 'replacement' }) }), context);
  expect(response.status).toBe(403);
  expect((await db.execute('SELECT value FROM settings WHERE organization_id = 3')).rows[0].value).toBe('foreign-secret');
  expect((await db.execute('SELECT COUNT(*) AS count FROM settings')).rows[0].count).toBe(2);
});

it.each(['0', '1'])('allows admins and owners to save and read organization %s without exposing credentials', async orgId => {
  const context = { params: Promise.resolve({ orgId }) };
  const response = await PUT(new NextRequest(url, {
    method: 'PUT', body: JSON.stringify({ provider: 'google', selectedModelId: 'gemini-3.8-flash', categoryThreshold: 0 }),
  }), context);
  expect(response.status).toBe(200);
  const saved = await GET(new NextRequest(url), context);
  expect(saved.status).toBe(200);
  expect(await saved.json()).toEqual({
    provider: 'google', selectedModelId: 'gemini-3.8-flash', categoryThreshold: 0,
    isGoogleKeySet: orgId === '0', isOpenAiKeySet: false, isAnthropicKeySet: false,
  });
  expect((await db.execute('SELECT value FROM settings WHERE organization_id = 0 AND key = \'ai_google_api_key\'')).rows[0].value).toBe('saved-secret-sentinel');
  expect((await db.execute('SELECT value FROM settings WHERE organization_id = 3')).rows[0].value).toBe('foreign-secret');
});

it('distinguishes omitted credentials from explicit null and empty strings', async () => {
  const emptySave = await PUT(new NextRequest(url, { method: 'PUT', body: '{}' }), params);
  expect(emptySave.status).toBe(200);
  expect(await (await GET(new NextRequest(url), params)).json()).toMatchObject({ categoryThreshold: 80, isGoogleKeySet: true });

  const response = await PUT(new NextRequest(url, {
    method: 'PUT', body: JSON.stringify({ googleApiKey: null, openaiApiKey: '' }),
  }), params);
  expect(response.status).toBe(200);
  expect(await (await GET(new NextRequest(url), params)).json()).toMatchObject({ isGoogleKeySet: false, isOpenAiKeySet: false });
  expect((await db.execute('SELECT key, value FROM settings WHERE organization_id = 0 ORDER BY key')).rows).toEqual([
    { key: 'ai_google_api_key', value: null }, { key: 'ai_openai_api_key', value: '' },
  ]);
});

it.each(['0oops', '0.5', '-1', '9007199254740992'])('rejects noncanonical organization ID %s', async orgId => {
  const context = { params: Promise.resolve({ orgId }) };
  expect((await GET(new NextRequest(url), context)).status).toBe(400);
  expect((await PUT(new NextRequest(url, { method: 'PUT', body: '{}' }), context)).status).toBe(400);
});

it.each([
  { provider: 'unknown' }, { categoryThreshold: -1 }, { categoryThreshold: 101 },
  { categoryThreshold: '80' }, { googleApiKey: 123 },
])('rejects invalid settings %j without changing stored values', async body => {
  const before = (await db.execute('SELECT * FROM settings ORDER BY id')).rows;
  const response = await PUT(new NextRequest(url, { method: 'PUT', body: JSON.stringify(body) }), params);
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: 'Validation failed', code: 'BAD_REQUEST' });
  expect((await db.execute('SELECT * FROM settings ORDER BY id')).rows).toEqual(before);
});

it('returns a client error for malformed JSON', async () => {
  const response = await PUT(new NextRequest(url, { method: 'PUT', body: '{' }), params);
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: 'BAD_REQUEST' });
});

it('rolls back a failed multi-field save and keeps database diagnostics private', async () => {
  await db.executeMultiple(`
    CREATE TRIGGER reject_key BEFORE INSERT ON settings WHEN NEW.key = 'ai_google_api_key'
    BEGIN SELECT RAISE(ABORT, 'private-database-diagnostic'); END;
  `);
  const before = (await db.execute('SELECT * FROM settings ORDER BY id')).rows;
  const response = await PUT(new NextRequest(url, {
    method: 'PUT', body: JSON.stringify({ provider: 'openai', selectedModelId: 'gpt-4o', googleApiKey: 'new-secret-sentinel' }),
  }), params);
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: 'Failed to update AI settings' });
  expect((await db.execute('SELECT * FROM settings ORDER BY id')).rows).toEqual(before);
  const logs = JSON.stringify((console.error as jest.Mock).mock.calls);
  expect(logs).not.toMatch(/private-database-diagnostic|new-secret-sentinel|saved-secret-sentinel/);
});

it('returns a generic read failure when persisted settings are unavailable', async () => {
  await db.execute('ALTER TABLE settings RENAME TO unavailable_settings');
  try {
    const response = await GET(new NextRequest(url), params);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to fetch AI settings' });
  } finally {
    await db.execute('ALTER TABLE unavailable_settings RENAME TO settings');
  }
});
