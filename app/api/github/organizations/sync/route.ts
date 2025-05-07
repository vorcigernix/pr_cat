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
    const organizations = await githubService.syncUserOrganizations(session.user.id);
    
    return NextResponse.json({ 
      success: true,
      organizations,
      message: 'Organizations synced successfully' 
    });
  } catch (error) {
    console.error('Organization sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync GitHub organizations' }, 
      { status: 500 }
    );
  }
} 