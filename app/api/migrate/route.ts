import { NextResponse } from 'next/server';
import { runMigrations } from '@/lib/migrate';

export const runtime = 'nodejs';

export async function POST() {
  try {
    // In development, allow migrations without auth
    if (process.env.NODE_ENV !== 'production') {
      console.log('Running database migrations in development mode...');
    } else {
      console.log('Running database migrations...');
      // In production, you might want to add authentication here
    }
    
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