import { createClient } from '@libsql/client';

// Lightweight connection pool for libsql client
// Note: libsql is HTTP-based; pooling primarily helps with parallelism and keep-alive reuse
let pool: Array<ReturnType<typeof createClient>> = [];
let poolInitialized = false;
let poolNextIndex = 0;
let isConnected = false;

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

export async function query<T = any>(
  sql: string, 
  params: any[] = []
): Promise<T[]> {
  const db = getDbClient();
  
  try {
    const result = await db.execute({ 
      sql, 
      args: params 
    });
    
    return result.rows as T[];
  } catch (error) {
    console.error('Database query error:', { sql, params, error });
    throw new Error(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function execute(
  sql: string, 
  params: any[] = []
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
    console.error('Database execute error:', { sql, params, error });
    throw new Error(`Execute failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function transaction<T>(
  callback: (tx: { query: typeof query; execute: typeof execute }) => Promise<T>
): Promise<T> {
  // Ensure a single client is used for the entire transaction
  const db = getDbClient();
  
  try {
    await db.execute({ sql: 'BEGIN TRANSACTION' });
    
    const txClient = {
      query: async <U = any>(sql: string, params: any[] = []): Promise<U[]> => {
        const result = await db.execute({ sql, args: params });
        return result.rows as U[];
      },
      execute: async (sql: string, params: any[] = []): Promise<{ lastInsertId?: number; rowsAffected: number }> => {
        const result = await db.execute({ sql, args: params });
        return {
          lastInsertId: result.lastInsertRowid ? Number(result.lastInsertRowid) : undefined,
          rowsAffected: result.rowsAffected,
        };
      },
    };
    
    const result = await callback(txClient);
    
    await db.execute({ sql: 'COMMIT' });
    return result;
  } catch (error) {
    try {
      await db.execute({ sql: 'ROLLBACK' });
    } catch (rollbackError) {
      console.error('Failed to rollback transaction:', rollbackError);
    }
    console.error('Transaction error:', error);
    throw error;
  }
}

// Utility to get connection status
export function getConnectionStatus() {
  return {
    isConnected,
    hasClient: poolInitialized && pool.length > 0
  };
} 