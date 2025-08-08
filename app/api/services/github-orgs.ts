import { OrganizationWithInstallation } from '@/components/ui/github-org-setup-item';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { findUserWithOrganizations } from '@/lib/repositories/user-repository';
import { generateAppJwt } from '@/lib/github-app';
import { Octokit } from '@octokit/rest';

// This file is for server components only - it uses next/headers

// Get base URL for server-side API calls
function getBaseUrl() {
  // When running on the server, we need an absolute URL
  if (typeof window === 'undefined') {
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    return `http://localhost:${process.env.PORT || 3000}`;
  }
  // In the browser, relative URLs work fine
  return '';
}

/**
 * Fetch organization installations data (server component)
 * This directly queries the database and GitHub App API instead of making HTTP requests
 */
export async function getOrganizationInstallations(): Promise<OrganizationWithInstallation[]> {
  console.log('getOrganizationInstallations: Started');
  try {
    // Get the user session to check authentication
    const session = await auth();
    
    if (!session || !session.user) {
      console.log("getOrganizationInstallations: No session found");
      return [];
    }
    
    const userId = session.user.id;
    console.log('getOrganizationInstallations: Fetching organizations for user:', userId);
    
    // Directly fetch user with organizations from database
    const result = await findUserWithOrganizations(userId);
    
    if (!result || !result.organizations || result.organizations.length === 0) {
      console.log('getOrganizationInstallations: No organizations found in database');
      return [];
    }
    
    console.log(`getOrganizationInstallations: Found ${result.organizations.length} organizations in database`);
    
    try {
      // List GitHub App installations to enrich with installation status
      console.log('getOrganizationInstallations: Generating GitHub App JWT');
      const appJwt = await generateAppJwt();
      const appOctokit = new Octokit({ auth: appJwt });
      
      console.log('getOrganizationInstallations: Fetching app installations');
      const { data: installationsData } = await appOctokit.apps.listInstallations();
      console.log(`getOrganizationInstallations: Found ${installationsData.length} app installations`);
      
      // Map database organizations with GitHub App installation status
      const enriched = result.organizations.map((org: any) => {
        const installation = installationsData.find(
          (install) => install.account && install.account.login.toLowerCase() === org.name.toLowerCase()
        );
        const hasAppInstalled = !!installation;
        
        console.log(`getOrganizationInstallations: Org ${org.name} hasAppInstalled=${hasAppInstalled}`);
        
        return {
          ...org,
          hasAppInstalled,
          installationId: installation?.id ?? null,
        };
      });
      
      console.log(`getOrganizationInstallations: Returning ${enriched.length} organizations with installation status`);
      return enriched;
    } catch (appError) {
      console.error('getOrganizationInstallations: Error fetching GitHub App installations:', appError);
      // Return organizations without installation status if GitHub App API fails
      return result.organizations.map((org: any) => ({
        ...org,
        hasAppInstalled: false,
        installationId: null,
      }));
    }
  } catch (error) {
    console.error("Error fetching organization installations:", error);
    // Return empty array instead of throwing to prevent component failure
    return [];
  }
}

export async function syncGitHubOrganizations() {
  const baseUrl = getBaseUrl();
  console.log('syncGitHubOrganizations: Started');
  
  try {
    // Get the user session to check authentication
    const session = await auth();
    
    if (!session) {
      console.log('syncGitHubOrganizations: No session found');
      return { success: false, error: 'Not authenticated' };
    }
    
    if (!session.accessToken) {
      console.log('syncGitHubOrganizations: No access token in session');
      return { success: false, error: 'No access token' };
    }
    
    // Get cookies and await both the cookies() call and toString()
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    
    console.log('syncGitHubOrganizations: Sending sync request');
    const response = await fetch(`${baseUrl}/api/github/organizations/sync`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Cookie': cookieHeader,
        'Authorization': `Bearer ${session.accessToken || ''}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Failed to sync organizations:", errorData);
      return { success: false, error: errorData.error || 'Failed to sync organizations' };
    }
    
    const data = await response.json();
    console.log(`syncGitHubOrganizations: Success - synced ${data.organizations?.length || 0} organizations`);
    return { success: true, ...data };
  } catch (error) {
    console.error("Error syncing GitHub organizations:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
} 