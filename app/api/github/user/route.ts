import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GitHubService } from '@/lib/services';

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
    const user = await githubService.getCurrentUser();
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GitHub user data' }, 
      { status: 500 }
    );
  }
} 