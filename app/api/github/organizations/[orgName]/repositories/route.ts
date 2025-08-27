import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getService } from '@/lib/core/container/di-container';
import { IGitHubService } from '@/lib/core/ports';
import { verifyBotId } from '@/lib/botid-verification';

// Use the context object directly with proper typing for Next.js route handler
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgName: string }> }
) {
  // Check for bot before proceeding
  const botVerification = await verifyBotId();
  if (botVerification) {
    return botVerification;
  }

  const { orgName } = await params;
  
  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!session.accessToken) {
    return NextResponse.json({ error: 'No GitHub access token' }, { status: 400 });
  }
  
  try {
    const githubService = await getService<IGitHubService>('GitHubService');
    const result = await githubService.syncOrganizationRepositories(orgName);
    
    return NextResponse.json({ 
      repositories: result.synced,
      errors: result.errors 
    });
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: `Failed to fetch repositories for organization: ${orgName}` }, 
      { status: 500 }
    );
  }
} 