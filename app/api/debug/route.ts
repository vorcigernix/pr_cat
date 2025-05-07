import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { createUser, findUserById } from '@/lib/repositories';
import { auth } from '@/auth';

// Force Node.js runtime - this API cannot run in Edge runtime
export const runtime = 'nodejs';

// Add this to avoid Auth.js throwing an error about invalid middleware configuration
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the URL parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Default action is to show database information
    if (!action || action === 'info') {
      // Basic database checks
      const results = await Promise.allSettled([
        // Check schema version
        query('SELECT MAX(version) as version FROM schema_migrations'),
        
        // Check if users table exists
        query('SELECT name FROM sqlite_master WHERE type="table" AND name="users"'),
        
        // Count users
        query('SELECT COUNT(*) as count FROM users'),
        
        // Check current user
        query('SELECT * FROM users WHERE id = ?', [session.user.id])
      ]);
      
      return NextResponse.json({
        schema_version: results[0].status === 'fulfilled' ? results[0].value : null,
        users_table_exists: results[1].status === 'fulfilled' ? results[1].value.length > 0 : false,
        user_count: results[2].status === 'fulfilled' ? results[2].value[0].count : null,
        current_user: results[3].status === 'fulfilled' ? results[3].value[0] : null,
        session_user: {
          id: session.user.id,
          email: session.user.email
        }
      });
    }
    
    // Create a test user
    if (action === 'create-user') {
      const userId = searchParams.get('id') || session.user.id;
      const email = searchParams.get('email') || session.user.email;
      const name = searchParams.get('name') || session.user.name;
      
      // Check if user already exists
      const existingUser = await findUserById(userId);
      
      if (existingUser) {
        return NextResponse.json({
          message: 'User already exists',
          user: existingUser
        });
      }
      
      // Create new user
      if (email) {
        const user = await createUser({
          id: userId,
          name: name || null,
          email: email,
          image: session.user.image || null
        });
        
        return NextResponse.json({
          message: 'User created successfully',
          user
        });
      } else {
        return NextResponse.json({
          error: 'Email is required to create a user'
        }, { status: 400 });
      }
    }
    
    // Run a raw SQL query
    if (action === 'query') {
      const sql = searchParams.get('sql');
      if (!sql) {
        return NextResponse.json({ error: 'SQL query is required' }, { status: 400 });
      }
      
      const result = await query(sql);
      return NextResponse.json({ result });
    }
    
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      error: `Debug API error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
} 