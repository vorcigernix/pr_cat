import { NextRequest, NextResponse } from 'next/server';
import { runMigrations } from '@/lib/migrate';

export const runtime = 'nodejs';

/**
 * Verify the caller is authorized to run migrations.
 *
 * - In production: requires a `MIGRATION_SECRET` env var and a matching
 *   `Authorization: Bearer <secret>` header. A plain session check is
 *   insufficient because any logged-in user could trigger destructive
 *   schema changes.
 * - In development/test: allows unauthenticated access so that
 *   `curl -X POST http://localhost:3000/api/migrate` keeps working
 *   for local DB bootstrap.
 */
function isAuthorized(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  const secret = process.env.MIGRATION_SECRET;
  if (!secret) {
    // If the operator hasn't configured a migration secret, reject all
    // requests rather than silently allowing unauthenticated access.
    return false;
  }

  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  return token.length > 0 && token === secret;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Running database migrations...');

    const result = await runMigrations();
    
    if (result?.success === false) {
      console.error('Migration failed:', result.error);
      return NextResponse.json({ 
        error: 'Migration failed', 
        details: result.error 
      }, { status: 500 });
    }
    
    console.log('Migrations completed successfully');
    return NextResponse.json({ 
      message: 'Migrations completed successfully' 
    });
  } catch (error) {
    console.error('Migration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: errorMessage 
    }, { status: 500 });
  }
}