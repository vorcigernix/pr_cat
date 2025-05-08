import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GitHubService } from '@/lib/services';
import { findRepositoryById } from '@/lib/repositories';

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
    // Find repository in database
    const repository = await findRepositoryById(parseInt(repositoryId));
    
    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }
    
    // Extract owner and repo from full_name (format: owner/repo)
    const [owner, repo] = repository.full_name.split('/');
    
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Invalid repository full_name format' }, 
        { status: 400 }
      );
    }
    
    const githubService = new GitHubService(session.accessToken);
    const pullRequests = await githubService.syncRepositoryPullRequests(
      owner, 
      repo, 
      repository.id
    );
    
    return NextResponse.json({ 
      success: true,
      message: `Synced ${pullRequests.length} pull requests`,
      count: pullRequests.length
    });
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: `Failed to sync pull requests for repository: ${repositoryId}` }, 
      { status: 500 }
    );
  }
} 