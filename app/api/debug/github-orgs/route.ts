import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GitHubClient } from '@/lib/github';

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
    // Create GitHub client directly
    const githubClient = new GitHubClient(session.accessToken);
    
    // Get all information
    const user = await githubClient.getCurrentUser();
    const orgs = await githubClient.getUserOrganizations();
    
    // Get all available scopes for the token
    const scopes = await checkTokenScopes(session.accessToken);
    
    return NextResponse.json({
      github: {
        user: {
          login: user.login,
          id: user.id,
          avatar_url: user.avatar_url,
          name: user.name,
          email: user.email,
        },
        organizations: orgs,
        organizationCount: orgs.length,
        tokenScopes: scopes,
      }
    });
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GitHub data', message: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}

// Helper to check what permissions the token has
async function checkTokenScopes(token: string): Promise<string[]> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`,
      },
    });
    
    // Get scopes from response headers
    const scopeHeader = response.headers.get('x-oauth-scopes') || '';
    return scopeHeader.split(',').map(s => s.trim()).filter(Boolean);
  } catch (error) {
    console.error('Error checking token scopes:', error);
    return [];
  }
} 