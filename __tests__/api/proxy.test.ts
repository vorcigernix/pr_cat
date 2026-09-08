/** @jest-environment node */

import { NextRequest } from 'next/server';

let proxy: typeof import('@/proxy').proxy;

beforeEach(async () => {
  jest.resetModules();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-08T12:00:00Z'));
  ({ proxy } = await import('@/proxy'));
});

afterEach(() => jest.useRealTimers());

it.each(['/dashboard', '/api/status', '/api/webhook/github'])('passes %s through without applying an API rate limit', pathname => {
  const response = proxy(new NextRequest(`http://localhost${pathname}`, {
    headers: { 'x-hub-signature-256': 'sha256=example', 'x-github-delivery': '2020-01-01' },
  }));
  expect(response.headers.get('x-middleware-next')).toBe('1');
  expect(response.headers.has('x-ratelimit-limit')).toBe(false);
});

it.each([
  ['/api/repositories', 100, 60000],
  ['/api/auth/session', 10, 60000],
  ['/api/github/repositories/1/sync', 5, 300000],
  ['/api/migrate', 2, 60000],
] as const)('limits %s and accepts requests at the exact reset time', async (pathname, limit, windowMs) => {
  const request = new NextRequest(`http://localhost${pathname}`, { headers: { 'x-forwarded-for': '192.0.2.1' } });
  const first = proxy(request);
  expect(first.status).toBe(200);
  expect(first.headers.get('x-ratelimit-remaining')).toBe(String(limit - 1));
  for (let count = 1; count < limit; count++) proxy(request);

  const blocked = proxy(request);
  expect(blocked.status).toBe(429);
  expect(await blocked.json()).toMatchObject({ error: 'Too many requests' });
  expect(blocked.headers.get('x-ratelimit-limit')).toBe(String(limit));
  expect(blocked.headers.get('x-ratelimit-remaining')).toBe('0');
  expect(blocked.headers.get('retry-after')).toBe(String(windowMs / 1000));

  jest.advanceTimersByTime(windowMs);
  const reset = proxy(request);
  expect(reset.status).toBe(200);
  expect(reset.headers.get('x-ratelimit-remaining')).toBe(String(limit - 1));
});

it('keeps each client and endpoint allowance separate', () => {
  const limited = new NextRequest('http://localhost/api/migrate', { headers: { 'x-forwarded-for': '192.0.2.1' } });
  proxy(limited);
  proxy(limited);
  expect(proxy(limited).status).toBe(429);

  const anotherClient = proxy(new NextRequest('http://localhost/api/migrate', { headers: { 'x-forwarded-for': '192.0.2.2' } }));
  expect(anotherClient.status).toBe(200);
  expect(anotherClient.headers.get('x-ratelimit-remaining')).toBe('1');
  const anotherEndpoint = proxy(new NextRequest('http://localhost/api/repositories', { headers: { 'x-forwarded-for': '192.0.2.1' } }));
  expect(anotherEndpoint.headers.get('x-ratelimit-remaining')).toBe('99');
});
