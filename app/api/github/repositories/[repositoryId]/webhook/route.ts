import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GitHubService } from '@/lib/services';

// Create a new webhook for a repository
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ repositoryId: string }> }
) {
  const { repositoryId } = await params;
  
  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!session.accessToken) {
    return NextResponse.json({ error: 'No GitHub access token' }, { status: 400 });
  }
  
  try {
    const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const githubService = new GitHubService(session.accessToken);
    const result = await githubService.setupRepositoryTracking(parseInt(repositoryId), appUrl);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: `Failed to set up webhook: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    );
  }
}

// Delete a webhook from a repository
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ repositoryId: string }> }
) {
  const { repositoryId } = await params;
  
  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!session.accessToken) {
    return NextResponse.json({ error: 'No GitHub access token' }, { status: 400 });
  }
  
  try {
    const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const githubService = new GitHubService(session.accessToken);
    const result = await githubService.removeRepositoryTracking(parseInt(repositoryId), appUrl);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: `Failed to remove webhook: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    );
  }
} 