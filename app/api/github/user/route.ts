import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getService } from '@/lib/core/container/di-container';
import { IGitHubService } from '@/lib/core/ports';
import { verifyBotId } from '@/lib/botid-verification';

export async function GET() {
  // Check for bot before proceeding
  const botVerification = await verifyBotId();
  if (botVerification) {
    return botVerification;
  }

  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!session.accessToken) {
    return NextResponse.json({ error: 'No GitHub access token' }, { status: 400 });
  }
  
  try {
    const githubService = await getService<IGitHubService>('GitHubService');
    const user = await githubService.getUser(session.accessToken);
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GitHub user data' }, 
      { status: 500 }
    );
  }
} 