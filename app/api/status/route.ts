import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';

export async function GET() {
  try {
    let dbVersion = 0;
    let tablesExist = false;
    
    try {
      // Check if schema_migrations table exists
      const result = await query<{ version: number }>(
        'SELECT MAX(version) as version FROM schema_migrations'
      );
      dbVersion = result[0]?.version || 0;
      
      // Check if users table exists
      await query('SELECT 1 FROM users LIMIT 1');
      tablesExist = true;
    } catch (dbError) {
      console.warn('Database table check failed:', dbError);
      // If the error contains "no such table", tables don't exist yet
      tablesExist = false;
    }
    
    const migrationNeeded = dbVersion === 0 || !tablesExist;
    
    return NextResponse.json({
      status: 'ok',
      database: {
        connected: true,
        version: dbVersion,
        tablesExist,
        migrationNeeded
      },
      tips: migrationNeeded ? [
        "Database schema needs to be initialized. Visit /api/migrate to run migrations."
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
        "Visit /api/migrate to initialize the database schema"
      ]
    }, { status: 500 });
  }
} 