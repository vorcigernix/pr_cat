import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logGitHubOrgsForUser } from '@/lib/github';
import { findUserById } from '@/lib/repositories';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!session.accessToken) {
    return NextResponse.json({ error: 'No GitHub access token' }, { status: 400 });
  }
  
  try {
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    // Log GitHub organizations
    await logGitHubOrgsForUser(session.accessToken);
    
    // Check user-organization connections
    const userOrgs = await query(
      `SELECT uo.*, o.name, o.github_id FROM user_organizations uo 
       JOIN organizations o ON uo.organization_id = o.id
       WHERE uo.user_id = ?`,
      [user.id]
    );
    
    // Check repository count
    const repositories = await query(
      `SELECT r.* FROM repositories r 
       JOIN organizations o ON r.organization_id = o.id 
       ORDER BY r.name ASC 
       LIMIT 50`
    );
    
    // Check user_organization table directly
    const allUserOrgs = await query(
      `SELECT * FROM user_organizations LIMIT 100`
    );
    
    return NextResponse.json({
      userId: user.id,
      userOrgsCount: userOrgs.length,
      userOrgs,
      repositoriesCount: repositories.length,
      repositoriesSample: repositories.slice(0, 5),
      allUserOrgsCount: allUserOrgs.length,
      allUserOrgsSample: allUserOrgs.slice(0, 5)
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    );
  }
} 