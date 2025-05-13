import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GitHubClient } from '@/lib/github';
import { generateAppJwt } from '@/lib/github-app';
import { Octokit } from '@octokit/rest';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Fetch organizations from session
    const organizations = session.organizations || [];
    if (organizations.length === 0) {
      return NextResponse.json({ installations: [] });
    }
    
    // For GitHub App installation status, we need to use the GitHub App JWT
    // because the user OAuth token doesn't have permission to list installations
    const appJwt = await generateAppJwt();
    const appOctokit = new Octokit({ auth: appJwt });
    
    // Get all app installations
    const { data: installationsData } = await appOctokit.apps.listInstallations();
    
    // Map organizations to include installation status
    const orgsWithInstallationStatus = organizations.map(org => {
      // Find if this organization has the app installed by comparing names
      const installation = installationsData.find(
        install => install.account && 
          install.account.login.toLowerCase() === org.name.toLowerCase()
      );
      
      return {
        ...org,
        hasAppInstalled: !!installation,
        installationId: installation?.id || null
      };
    });
    
    return NextResponse.json({
      installations: orgsWithInstallationStatus
    });
  } catch (error) {
    console.error('Error fetching GitHub App installations:', error);
    return NextResponse.json(
      { error: `Failed to fetch GitHub App installations: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 