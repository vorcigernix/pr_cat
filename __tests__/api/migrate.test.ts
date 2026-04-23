// Tests for /api/migrate route authentication.
//
// NextResponse.json() relies on the static Response.json() which is absent in
// jsdom, so we provide a lightweight mock of next/server here.

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    body: unknown;

    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }

    async json() {
      return this.body;
    }

    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }

  // Minimal NextRequest stand-in that supports headers.get().
  class MockNextRequest {
    headers: Headers;
    constructor(_url: string, init?: { headers?: Record<string, string> }) {
      this.headers = new Headers(init?.headers ?? {});
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

jest.mock('@/lib/migrate', () => ({
  runMigrations: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  execute: jest.fn(),
  getDbClient: jest.fn(),
  checkDbHealth: jest.fn(),
  getConnectionStatus: jest.fn(() => ({ isConnected: true, hasClient: true })),
}));

const { runMigrations } = require('@/lib/migrate') as { runMigrations: jest.Mock };
const { NextRequest } = require('next/server');

const VALID_SECRET = 'test-migration-secret-long-enough';

function makeRequest(headers?: Record<string, string>) {
  return new NextRequest('http://localhost:3000/api/migrate', { headers });
}

async function callPOST(request: unknown) {
  const mod = await import('@/app/api/migrate/route');
  return mod.POST(request as any);
}

describe('POST /api/migrate', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSecret = process.env.MIGRATION_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    runMigrations.mockResolvedValue({ success: true });
    delete process.env.MIGRATION_SECRET;
  });

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
    if (originalSecret !== undefined) {
      process.env.MIGRATION_SECRET = originalSecret;
    } else {
      delete process.env.MIGRATION_SECRET;
    }
  });

  describe('production mode', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
    });

    it('returns 401 when MIGRATION_SECRET is not configured', async () => {
      const response = await callPOST(makeRequest());
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
      expect(runMigrations).not.toHaveBeenCalled();
    });

    it('returns 401 when no Authorization header is sent', async () => {
      process.env.MIGRATION_SECRET = VALID_SECRET;

      const response = await callPOST(makeRequest());
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
      expect(runMigrations).not.toHaveBeenCalled();
    });

    it('returns 401 when the bearer token does not match', async () => {
      process.env.MIGRATION_SECRET = VALID_SECRET;

      const response = await callPOST(
        makeRequest({ authorization: 'Bearer wrong-secret' })
      );
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
      expect(runMigrations).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization header is not Bearer scheme', async () => {
      process.env.MIGRATION_SECRET = VALID_SECRET;

      const response = await callPOST(
        makeRequest({ authorization: `Basic ${VALID_SECRET}` })
      );
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
      expect(runMigrations).not.toHaveBeenCalled();
    });

    it('runs migrations when the correct secret is provided', async () => {
      process.env.MIGRATION_SECRET = VALID_SECRET;

      const response = await callPOST(
        makeRequest({ authorization: `Bearer ${VALID_SECRET}` })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Migrations completed successfully');
      expect(runMigrations).toHaveBeenCalledTimes(1);
    });

    it('returns 500 when migration fails', async () => {
      process.env.MIGRATION_SECRET = VALID_SECRET;
      runMigrations.mockResolvedValue({ success: false, error: 'schema conflict' });

      const response = await callPOST(
        makeRequest({ authorization: `Bearer ${VALID_SECRET}` })
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Migration failed');
      expect(body.details).toBe('schema conflict');
    });

    it('returns 500 when migration throws', async () => {
      process.env.MIGRATION_SECRET = VALID_SECRET;
      runMigrations.mockRejectedValue(new Error('connection refused'));

      const response = await callPOST(
        makeRequest({ authorization: `Bearer ${VALID_SECRET}` })
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Migration failed');
      expect(body.details).toBe('connection refused');
    });
  });

  describe('development mode', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    });

    it('allows access without secret or headers', async () => {
      const response = await callPOST(makeRequest());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Migrations completed successfully');
      expect(runMigrations).toHaveBeenCalledTimes(1);
    });
  });

  describe('test mode', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
    });

    it('allows access without secret or headers', async () => {
      const response = await callPOST(makeRequest());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Migrations completed successfully');
      expect(runMigrations).toHaveBeenCalledTimes(1);
    });
  });
});
