// jest.setup.ts
import '@testing-library/jest-dom';

// Polyfill for Request/Response in Node environment
import 'whatwg-fetch';

// Mock next-auth module
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/auth', () => ({
  __esModule: true,
  auth: jest.fn(),
}));

// Mock environment variables for tests
process.env.TURSO_URL = 'libsql://test.turso.io';
process.env.TURSO_TOKEN = 'test-token';
process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';
process.env.GITHUB_APP_ID = '123456';
process.env.GITHUB_APP_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
test-private-key
-----END RSA PRIVATE KEY-----`;
process.env.GITHUB_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.NEXT_PUBLIC_GITHUB_APP_SLUG = 'test-pr-cat';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-minimum-32-characters-long';
process.env.APP_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
global.console = {
  ...console,
  error: jest.fn((message, ...args) => {
    // Filter out expected CORS/fetch errors in tests
    if (typeof message === 'string' && 
        (message.includes('Response for preflight') || 
         message.includes('XMLHttpRequest'))) {
      return;
    }
    originalConsoleError(message, ...args);
  }),
  warn: jest.fn(),
  log: jest.fn(),
};