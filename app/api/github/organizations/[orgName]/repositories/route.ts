import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GitHubService } from '@/lib/services';

// Use the context object directly with proper typing for Next.js route handler
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
    const repositories = await githubService.syncOrganizationRepositories(orgName);
    
    return NextResponse.json({ repositories });
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: `Failed to fetch repositories for organization: ${orgName}` }, 
      { status: 500 }
    );
  }
} 