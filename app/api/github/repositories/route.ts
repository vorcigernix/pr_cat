import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GitHubService } from '@/lib/services';
import { findUserById, findUserByEmail } from '@/lib/repositories';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!session.accessToken) {
    return NextResponse.json({ error: 'No GitHub access token' }, { status: 400 });
  }
  
  try {
    // First try to get user directly by session ID
    let user = await findUserById(session.user.id);
    
    // If not found by ID but we have an email, try to find by email
    if (!user && session.user.email) {
      user = await findUserByEmail(session.user.email);
      console.log('User found by email instead of ID:', !!user);
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    const githubService = new GitHubService(session.accessToken);
    // Get the current user
    const githubUser = await githubService.getCurrentUser();
    // Get user's repositories
    const repositories = await githubService.getCurrentUserRepositories();
    
    return NextResponse.json({ repositories });
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GitHub repositories' }, 
      { status: 500 }
    );
  }
} 