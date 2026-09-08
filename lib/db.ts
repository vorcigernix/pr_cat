import { createClient } from '@libsql/client';
import type { Client, InValue, InStatement, ResultSet } from '@libsql/client';

// Lightweight connection pool for libsql client
// Note: libsql is HTTP-based; pooling primarily helps with parallelism and keep-alive reuse
let pool: Client[] = [];
let poolInitialized = false;
let poolNextIndex = 0;
let isConnected = false;

type QueryParams = InValue[];

function initializePool() {
  if (poolInitialized) return;

  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_TOKEN;
  const poolSizeEnv = process.env.TURSO_POOL_SIZE || '4';
  const parsedSize = Number.parseInt(poolSizeEnv, 10);
  const poolSize = Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : 4;

  if (!url) {
    throw new Error('TURSO_URL environment variable is required');
  }

  try {
    pool = new Array(poolSize).fill(null).map(() =>
      createClient({ url, authToken })
    );
    poolInitialized = true;
    isConnected = true;
  } catch (error) {
    console.error('Failed to create database client pool:', error);
    throw new Error('Database connection pool initialization failed');
  }
}

export function getDbClient() {
  if (!poolInitialized) {
    initializePool();
  }
  // Round-robin selection
  const client = pool[poolNextIndex % pool.length];
  poolNextIndex = (poolNextIndex + 1) % pool.length;
  return client;
}

// Health check function
export async function checkDbHealth(): Promise<boolean> {
  try {
    const db = getDbClient();
    await db.execute({ sql: 'SELECT 1', args: [] });
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    isConnected = false;
    return false;
  }
}

export async function query<T = unknown>(
  sql: string, 
  params: QueryParams = []
): Promise<T[]> {
  const db = getDbClient();
  
  try {
    const result = await db.execute({ 
      sql, 
      args: params 
    });
    
    return result.rows as T[];
  } catch (error) {
    console.error('Database query error:', { sql, parameterCount: params.length });
    throw new Error(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function execute(
  sql: string, 
  params: QueryParams = []
): Promise<{ lastInsertId?: number; rowsAffected: number }> {
  const db = getDbClient();
  
  try {
    const result = await db.execute({ 
      sql, 
      args: params 
    });
    
    return {
      lastInsertId: result.lastInsertRowid ? Number(result.lastInsertRowid) : undefined,
      rowsAffected: result.rowsAffected,
    };
  } catch (error) {
    console.error('Database execute error:', { sql, parameterCount: params.length });
    throw new Error(`Execute failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function batch(statements: InStatement[]): Promise<ResultSet[]> {
  return getDbClient().batch(statements, 'write');
}

export async function transaction<T>(
  callback: (tx: { query: typeof query; execute: typeof execute }) => Promise<T>
): Promise<T> {
  const db = await getDbClient().transaction('write');
  
  try {
    const txClient = {
      query: async <U = unknown>(sql: string, params: QueryParams = []): Promise<U[]> => {
        const result = await db.execute({ sql, args: params });
        return result.rows as U[];
      },
      execute: async (sql: string, params: QueryParams = []): Promise<{ lastInsertId?: number; rowsAffected: number }> => {
        const result = await db.execute({ sql, args: params });
        return {
          lastInsertId: result.lastInsertRowid ? Number(result.lastInsertRowid) : undefined,
          rowsAffected: result.rowsAffected,
        };
      },
    };
    
    const result = await callback(txClient);
    
    await db.commit();
    return result;
  } catch (error) {
    try {
      await db.rollback();
    } catch {
      console.error('Failed to rollback transaction');
    }
    throw error;
  } finally {
    db.close();
  }
}

// Utility to get connection status
export function getConnectionStatus() {
  return {
    isConnected,
    hasClient: poolInitialized && pool.length > 0
  };
}
