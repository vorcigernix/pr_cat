import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GitHubService } from '@/lib/services';

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
    const githubService = new GitHubService(session.accessToken);
    // Get user's repositories
    const repositories = await githubService.getCurrentUserRepositories();
    
    // Here you would typically store these in the database
    // This could involve findOrCreateRepository for each repo
    
    return NextResponse.json({ 
      success: true, 
      repositories,
      message: 'Repositories synced successfully' 
    });
  } catch (error) {
    console.error('GitHub repository sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync GitHub repositories' }, 
      { status: 500 }
    );
  }
} 