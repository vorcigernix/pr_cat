import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GitHubService } from '@/lib/services';
import { findUserById, findUserByEmail } from '@/lib/repositories';

export const runtime = 'nodejs';

export async function POST() {
  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!session.accessToken) {
    return NextResponse.json({ error: 'No GitHub access token' }, { status: 400 });
  }
  
  try {
    console.log('Starting organization sync for session user:', session.user.id);
    
    // First try to get user directly by session ID
    let user = await findUserById(session.user.id);
    console.log('User lookup by ID result:', !!user);
    
    // If not found by ID but we have an email, try to find by email
    if (!user && session.user.email) {
      user = await findUserByEmail(session.user.email);
      console.log('User lookup by email result:', !!user);
    }
    
    if (!user) {
      console.error('User not found in database by ID or email');
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    console.log('User found in database, ID:', user.id);
    
    const githubService = new GitHubService(session.accessToken);
    
    // Test the GitHub token directly
    try {
      const currentUser = await githubService.getCurrentUser();
      console.log('GitHub user verified:', currentUser.login);
    } catch (githubError) {
      console.error('GitHub API authentication error:', githubError);
      return NextResponse.json({ 
        error: 'GitHub API authentication failed',
        message: githubError instanceof Error ? githubError.message : 'Unknown error'
      }, { status: 401 });
    }
    
    // Sync organizations
    console.log('Syncing organizations for user:', user.id);
    const organizations = await githubService.syncUserOrganizations(user.id);
    console.log(`Successfully synced ${organizations.length} organizations`);
    
    return NextResponse.json({ 
      success: true,
      organizations,
      message: `Successfully synced ${organizations.length} organizations for user ${user.id}` 
    });
  } catch (error) {
    console.error('Organization sync error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync GitHub organizations',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 