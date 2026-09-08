/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { createHmac, randomUUID } from 'node:crypto';
import { createClient, type Client } from '@libsql/client';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhook/github/route';

jest.mock('ai', () => ({ generateText: jest.fn() }));
jest.mock('@ai-sdk/google', () => ({ createGoogle: jest.fn() }));
jest.mock('@ai-sdk/openai', () => ({ createOpenAI: jest.fn() }));
jest.mock('@ai-sdk/anthropic', () => ({ createAnthropic: jest.fn() }));
jest.mock('@libsql/client', () => ({ ...jest.requireActual('@libsql/client'), createClient: jest.fn() }));

let db: Client;
const secret = 'webhook-route-test-secret';
const originalEnvironment = {
  DEMO_MODE: process.env.DEMO_MODE,
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
  GITHUB_OAUTH_CLIENT_SECRET: process.env.GITHUB_OAUTH_CLIENT_SECRET,
};
const payload = {
  action: 'synchronize', repository: { id: 200, name: 'repo', full_name: 'Org/repo', private: true, owner: { id: 100, login: 'Org' } },
  pull_request: { id: 500, number: 1, title: 'Persist this PR', body: 'Description', state: 'open',
    user: { id: 7, login: 'author', avatar_url: '' }, created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-08T12:00:00Z',
    closed_at: null, merged_at: null, draft: false, additions: 0, deletions: 0, changed_files: 0 },
};

function request(body = JSON.stringify(payload), headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/webhook/github', { method: 'POST', body, headers: {
    'x-github-event': 'pull_request', 'x-github-delivery': randomUUID(),
    'x-hub-signature-256': `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`, ...headers,
  } });
}

beforeAll(async () => {
  db = jest.requireActual<typeof import('@libsql/client')>('@libsql/client').createClient({ url: 'file::memory:' });
  jest.mocked(createClient).mockReturnValue(db);
  await db.executeMultiple(readFileSync('lib/schema.sql', 'utf8'));
});

beforeEach(async () => {
  process.env.DEMO_MODE = 'false';
  process.env.GITHUB_WEBHOOK_SECRET = secret;
  await db.executeMultiple(`DELETE FROM pr_reviews; DELETE FROM pull_requests; DELETE FROM repositories; DELETE FROM organizations; DELETE FROM users;
    INSERT INTO organizations (id, github_id, name) VALUES (1, 100, 'Org');
    INSERT INTO repositories (id, github_id, organization_id, name, full_name, is_tracked) VALUES (1, 200, 1, 'repo', 'Org/repo', 1);`);
});

afterAll(() => {
  db.close();
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

it('persists signed PR deliveries through the actual adapter and rejects successful replays', async () => {
  const delivery = randomUUID();
  expect((await POST(request(undefined, { 'x-github-delivery': delivery }))).status).toBe(200);
  expect((await db.execute('SELECT number, title, author_id, additions, deletions FROM pull_requests')).rows).toEqual([
    { number: 1, title: 'Persist this PR', author_id: '7', additions: 0, deletions: 0 },
  ]);
  const replay = await POST(request(undefined, { 'x-github-delivery': delivery }));
  expect(replay.status).toBe(400);
  expect(await replay.json()).toMatchObject({ error: 'Webhook already processed' });
  expect((await db.execute('SELECT COUNT(*) AS count FROM pull_requests')).rows[0].count).toBe(1);
});

it.each(['missing', 'altered', 'unicode'])('rejects %s signatures before persistence', async kind => {
  const header = kind === 'missing' ? '' : kind === 'unicode' ? `sha256=${'é'.repeat(64)}` : `sha256=${'0'.repeat(64)}`;
  expect((await POST(request(undefined, { 'x-hub-signature-256': header }))).status).toBe(400);
  expect((await db.execute('SELECT COUNT(*) AS count FROM pull_requests')).rows[0].count).toBe(0);
});

it.each(['{', 'null', '[]'])('rejects malformed payload %s without reserving its delivery ID', async body => {
  const delivery = randomUUID();
  expect((await POST(request(body, { 'x-github-delivery': delivery }))).status).toBe(400);
  expect((await POST(request(undefined, { 'x-github-delivery': delivery }))).status).toBe(200);
});

it('requires a delivery ID and a supported event', async () => {
  expect((await POST(request(undefined, { 'x-github-delivery': '' }))).status).toBe(400);
  expect((await POST(request(undefined, { 'x-github-event': 'push' }))).status).toBe(400);
  expect((await db.execute('SELECT COUNT(*) AS count FROM pull_requests')).rows[0].count).toBe(0);
});

it('enforces the actual byte limit without trusting Content-Length', async () => {
  const body = JSON.stringify({ value: 'x'.repeat(5 * 1024 * 1024) });
  const response = await POST(request(body, { 'content-length': '1' }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: 'Payload too large' });
});

it('fails closed when no signing secret is configured', async () => {
  const oauthSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  delete process.env.GITHUB_WEBHOOK_SECRET;
  delete process.env.GITHUB_OAUTH_CLIENT_SECRET;
  try {
    expect((await POST(request())).status).toBe(500);
  } finally {
    if (oauthSecret === undefined) delete process.env.GITHUB_OAUTH_CLIENT_SECRET;
    else process.env.GITHUB_OAUTH_CLIENT_SECRET = oauthSecret;
  }
});

it('allows failed persistence to retry the same delivery ID', async () => {
  const delivery = randomUUID();
  const execute = jest.spyOn(db, 'execute').mockRejectedValueOnce(new Error('Temporary database failure'));
  const failed = await POST(request(undefined, { 'x-github-delivery': delivery }));
  execute.mockRestore();
  expect(failed.status).toBe(422);
  expect((await POST(request(undefined, { 'x-github-delivery': delivery }))).status).toBe(200);
  expect((await db.execute('SELECT COUNT(*) AS count FROM pull_requests')).rows[0].count).toBe(1);
});

it('creates unknown review authors and persists review state changes', async () => {
  expect((await POST(request())).status).toBe(200);
  const review = { id: 600, user: { id: 8, login: 'reviewer', avatar_url: '' }, state: 'approved', submitted_at: '2026-09-08T13:00:00Z' };
  const reviewPayload = { ...payload, action: 'submitted', review };
  expect((await POST(request(JSON.stringify(reviewPayload), { 'x-github-event': 'pull_request_review' }))).status).toBe(200);
  expect((await POST(request(JSON.stringify({ ...reviewPayload, action: 'dismissed', review: { ...review, state: 'dismissed' } }), { 'x-github-event': 'pull_request_review' }))).status).toBe(200);
  expect((await db.execute('SELECT github_id, reviewer_id, state FROM pr_reviews')).rows).toEqual([{ github_id: 600, reviewer_id: '8', state: 'dismissed' }]);
});

it('reserves an in-flight delivery before awaiting database work', async () => {
  const delivery = randomUUID();
  let release!: () => void;
  let entered!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  const originalExecute = db.execute.bind(db);
  const execute = jest.spyOn(db, 'execute').mockImplementationOnce(async statement => {
    entered();
    await pending;
    return originalExecute(statement);
  });
  const first = POST(request(undefined, { 'x-github-delivery': delivery }));
  try {
    await started;
    expect((await POST(request(undefined, { 'x-github-delivery': delivery }))).status).toBe(400);
  } finally {
    release();
    execute.mockRestore();
  }
  expect((await first).status).toBe(200);
});

it('expires successful replay entries after the configured window', async () => {
  jest.useFakeTimers();
  const delivery = randomUUID();
  try {
    expect((await POST(request('{}', { 'x-github-delivery': delivery, 'x-github-event': 'ping' }))).status).toBe(200);
    jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect((await POST(request('{}', { 'x-github-delivery': delivery, 'x-github-event': 'ping' }))).status).toBe(200);
  } finally {
    jest.useRealTimers();
  }
});

it('retries a partially failed installation delivery without duplicating repositories', async () => {
  const delivery = randomUUID();
  const body = JSON.stringify({ action: 'created', installation: { id: 42, account: { id: 100, login: 'Org', type: 'Organization' } },
    repositories: [
      { id: 301, name: 'first', full_name: 'Org/first', private: true },
      { id: 302, name: 'second', full_name: 'Org/second', private: true },
    ],
  });
  const headers = { 'x-github-event': 'installation', 'x-github-delivery': delivery };
  await db.execute(`CREATE TRIGGER reject_second_repository BEFORE INSERT ON repositories WHEN NEW.github_id = 302
    BEGIN SELECT RAISE(ABORT, 'Temporary repository write failure'); END`);
  try {
    const failed = await POST(request(body, headers));
    expect(failed.status).toBe(422);
    expect(await failed.json()).toMatchObject({ success: false });
    expect((await db.execute('SELECT github_id FROM repositories WHERE github_id IN (301, 302)')).rows).toEqual([{ github_id: 301 }]);
  } finally {
    await db.execute('DROP TRIGGER reject_second_repository');
  }
  expect((await POST(request(body, headers))).status).toBe(200);
  expect((await db.execute('SELECT github_id FROM repositories WHERE github_id IN (301, 302) ORDER BY github_id')).rows).toEqual([{ github_id: 301 }, { github_id: 302 }]);
  expect((await db.execute('SELECT installation_id FROM organizations WHERE id = 1')).rows[0].installation_id).toBe(42);
});
