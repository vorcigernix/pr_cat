import { createClient } from '@libsql/client';

// Singleton client with better error handling
let client: ReturnType<typeof createClient> | null = null;
let isConnected = false;

export function getDbClient() {
  if (!client) {
    const url = process.env.TURSO_URL;
    const authToken = process.env.TURSO_TOKEN;

    if (!url) {
      throw new Error('TURSO_URL environment variable is required');
    }

    try {
      client = createClient({
        url,
        authToken,
      });
      isConnected = true;
    } catch (error) {
      console.error('Failed to create database client:', error);
      throw new Error('Database connection failed');
    }
  }

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
    hasClient: !!client
  };
} 