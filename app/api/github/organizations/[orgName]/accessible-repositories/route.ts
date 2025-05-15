import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GitHubService } from '@/lib/services';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgName: string }> }
) {
  const { orgName } = await params;
  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!session.accessToken) {
    return NextResponse.json({ error: 'No GitHub access token' }, { status: 400 });
  }
  
  try {
    const githubService = new GitHubService(session.accessToken);
    const accessibleRepoNames = await githubService.getAccessibleRepositories(orgName);
    
    return NextResponse.json({ 
      accessibleRepositories: Array.from(accessibleRepoNames) 
    });
  } catch (error) {
    console.error('Error fetching accessible repositories:', error);
    return NextResponse.json(
      { error: `Failed to get accessible repositories: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    );
  }
} 