import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GitHubService } from '@/lib/services';

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
    const githubService = new GitHubService(session.accessToken);
    // Get the current user
    const user = await githubService.getCurrentUser();
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