import { createClient } from '@libsql/client';

// Create a singleton client to avoid creating too many connections
let client: ReturnType<typeof createClient> | null = null;

export function getDbClient() {
  if (!client) {
    const url = process.env.TURSO_URL;
    const authToken = process.env.TURSO_TOKEN;

    if (!url) {
      throw new Error('TURSO_URL is not defined');
    }

    client = createClient({
      url,
      authToken,
    });
  }

  return client;
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
    console.error('Database query error:', error);
    throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    console.error('Database execute error:', error);
    throw new Error(`Database execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    await db.execute({ sql: 'ROLLBACK' });
    console.error('Transaction error:', error);
    throw error;
  }
} 