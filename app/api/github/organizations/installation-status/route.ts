import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GitHubClient } from '@/lib/github';
import { generateAppJwt } from '@/lib/github-app';
import { Octokit } from '@octokit/rest';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log(`GitHub Organizations installation-status API called: ${new Date().toISOString()}`);
  
  const session = await auth();
  
  if (!session?.user) {
    console.log('Organizations installation-status: No authenticated user session found');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Fetch organizations from session
    const organizations = session.organizations || [];
    console.log(`Organizations installation-status: Found ${organizations.length} organizations in session`);
    
    if (organizations.length === 0) {
      console.log('Organizations installation-status: No organizations found in session');
      return NextResponse.json({ installations: [] });
    }
    
    // For GitHub App installation status, we need to use the GitHub App JWT
    // because the user OAuth token doesn't have permission to list installations
    console.log('Organizations installation-status: Generating GitHub App JWT');
    const appJwt = await generateAppJwt();
    const appOctokit = new Octokit({ auth: appJwt });
    
    // Get all app installations
    console.log('Organizations installation-status: Fetching app installations');
    const { data: installationsData } = await appOctokit.apps.listInstallations();
    console.log(`Organizations installation-status: Found ${installationsData.length} app installations`);
    
    // Map organizations to include installation status
    const orgsWithInstallationStatus = organizations.map(org => {
      // Find if this organization has the app installed by comparing names
      const installation = installationsData.find(
        install => install.account && 
          install.account.login.toLowerCase() === org.name.toLowerCase()
      );
      
      const hasAppInstalled = !!installation;
      console.log(`Organizations installation-status: Org ${org.name} hasAppInstalled=${hasAppInstalled}`);
      
      return {
        ...org,
        hasAppInstalled,
        installationId: installation?.id || null
      };
    });
    
    console.log(`Organizations installation-status: Returning ${orgsWithInstallationStatus.length} organizations with installation status`);
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