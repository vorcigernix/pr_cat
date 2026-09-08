import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { CURRENT_SCHEMA_VERSION } from '@/lib/migrate';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Add auth check to prevent middleware redirects
  try {
    // Check for authentication
    const session = await auth();
    
    // If not authenticated, return JSON error instead of redirecting
    if (!session || !session.user) {
      return NextResponse.json({ 
        status: 'error',
        error: 'Unauthorized',
        database: {
          connected: false,
          error: 'Authentication required'
        }
      }, { status: 401 });
    }
    
    let dbVersion = 0;
    let tablesExist = false;
    
    try {
      // Check if schema_migrations table exists
      const result = await query<{ version: number }>(
        'SELECT MAX(version) as version FROM schema_migrations'
      );
      dbVersion = result[0]?.version || 0;
      
      // Check if users table exists
      await query<Record<string, unknown>>('SELECT 1 FROM users LIMIT 1');
      tablesExist = true;
    } catch (dbError) {
      console.warn('Database table check failed:', dbError);
      // If the error contains "no such table", tables don't exist yet
      tablesExist = false;
    }
    
    const migrationNeeded = dbVersion < CURRENT_SCHEMA_VERSION || !tablesExist;
    
    return NextResponse.json({
      status: 'ok',
      database: {
        connected: true,
        version: dbVersion,
        tablesExist,
        migrationNeeded
      },
      tips: migrationNeeded ? [
        "Database schema needs to be updated. Send POST /api/migrate to run migrations."
      ] : []
    });
  } catch (error) {
    console.error('Database status check error:', error);
    
    return NextResponse.json({
      status: 'error',
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      tips: [
        "Check your database connection settings (TURSO_URL and TURSO_TOKEN)",
        "Send POST /api/migrate to initialize the database schema"
      ]
    }, { status: 500 });
  }
} 
