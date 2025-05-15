import { NextRequest, NextResponse } from 'next/server';
import { runMigrations, seedDefaultCategories } from '@/lib/migrate';
import { auth } from '@/auth';

// Force Node.js runtime - this API cannot run in Edge runtime
export const runtime = 'nodejs';

// Add this to avoid Auth.js throwing an error about invalid middleware configuration
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Temporarily bypass authentication for initial setup
    // This allows initializing the database without being logged in
    // IMPORTANT: In production, you should restore authentication checks
    
    // Run the migrations
    const migrationResult = await runMigrations();
    
    // Seed default categories if migrations succeeded
    let seedResult: { success: boolean; error?: unknown };
    if (migrationResult.success) {
      seedResult = await seedDefaultCategories();
    } else {
      seedResult = { 
        success: false, 
        error: 'Migrations failed, skipping category seeding' 
      };
    }
    
    return NextResponse.json({
      migration: migrationResult,
      seed: seedResult
    });
  } catch (error) {
    console.error('Migration API error:', error);
    return NextResponse.json({
      error: `Failed to run migrations: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
} 