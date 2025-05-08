import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { 
  findUserById, 
  findUserByEmail, 
  getUserOrganizations
} from '@/lib/repositories';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // First try to get user directly by session ID
    let user = await findUserById(session.user.id);
    let userFoundBy = 'id';
    
    // If not found by ID but we have an email, try to find by email
    if (!user && session.user.email) {
      user = await findUserByEmail(session.user.email);
      userFoundBy = 'email';
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found in database',
        session: {
          id: session.user.id,
          email: session.user.email
        } 
      }, { status: 404 });
    }
    
    // Get user organizations
    const organizations = await getUserOrganizations(user.id);
    
    // Check if user has any organization links in user_organizations table
    const userOrgs = await query(
      'SELECT * FROM user_organizations WHERE user_id = ?',
      [user.id]
    );
    
    // Check all organizations in the database
    const allOrgs = await query('SELECT * FROM organizations');
    
    // Check if organizations table exists
    const tableCheck = await query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='organizations'"
    );
    
    // Check database schema for organizations and user_organizations
    const orgSchema = tableCheck.length > 0 ? 
      await query("PRAGMA table_info(organizations)") : [];
    
    const userOrgSchema = tableCheck.length > 0 ? 
      await query("PRAGMA table_info(user_organizations)") : [];
    
    return NextResponse.json({
      userInfo: {
        user,
        userFoundBy,
        sessionId: session.user.id,
        sessionEmail: session.user.email
      },
      tables: {
        organizationsTableExists: tableCheck.length > 0,
        organizationsSchema: orgSchema,
        userOrganizationsSchema: userOrgSchema
      },
      sessionOrganizations: session.organizations || [],
      databaseOrganizations: {
        userOrganizations: organizations,
        userOrgLinks: userOrgs,
        allOrganizations: allOrgs
      }
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch debug data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 