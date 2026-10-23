import { mock } from 'bun:test';

mock.module('next-auth', () => ({ default: mock() }));

process.env.TURSO_URL = 'libsql://test.turso.io';
process.env.TURSO_TOKEN = 'test-token';
process.env.GITHUB_OAUTH_CLIENT_ID = 'test-github-client-id';
process.env.GITHUB_OAUTH_CLIENT_SECRET = 'test-github-client-secret';
process.env.GITHUB_APP_ID = '123456';
process.env.GITHUB_APP_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
test-private-key
-----END RSA PRIVATE KEY-----`;
process.env.GITHUB_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.NEXT_PUBLIC_GITHUB_APP_SLUG = 'test-pr-cat';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-minimum-32-characters-long';
process.env.APP_URL = 'http://localhost:3000';
Object.assign(process.env, { NODE_ENV: 'test' });

const originalConsoleError = console.error;
global.console = {
  ...console,
  error: mock((message, ...args) => {
    if (typeof message === 'string' &&
        (message.includes('Response for preflight') || message.includes('XMLHttpRequest'))) {
      return;
    }
    originalConsoleError(message, ...args);
  }),
  warn: mock(),
  log: mock(),
};
