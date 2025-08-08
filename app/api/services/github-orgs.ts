import { OrganizationWithInstallation } from '@/components/ui/github-org-setup-item';
import { cookies } from 'next/headers';
import { auth } from '@/auth';

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
 * This requires authentication to work properly
 */
export async function getOrganizationInstallations(): Promise<OrganizationWithInstallation[]> {
  console.log('getOrganizationInstallations: Started');
  try {
    // Get the user session to check authentication
    const session = await auth();
    
    if (!session) {
      console.log("getOrganizationInstallations: No session found");
      return [];
    }
    
    if (!session.accessToken) {
      console.log("getOrganizationInstallations: No access token in session");
      return [];
    }

    const baseUrl = getBaseUrl();
    console.log(`getOrganizationInstallations: Using baseUrl ${baseUrl}`);
    
    // Get cookies and await both the cookies() call and toString()
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    
    // In Next.js Server Components, we need to manually add the authorization header
    // since the automatic cookie handling only works with client components
    console.log('getOrganizationInstallations: Fetching installation status');
    const response = await fetch(`${baseUrl}/api/github/organizations/installation-status`, {
      cache: 'no-store',
      headers: {
        'Cookie': cookieHeader,
        // If the API expects Authorization header, add it
        'Authorization': `Bearer ${session.accessToken || ''}`
      }
    });
    
    if (!response.ok) {
      console.error(`getOrganizationInstallations: Failed to fetch organizations - ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    const installations = data.installations || [];
    console.log(`getOrganizationInstallations: Received ${installations.length} organizations`);
    
    return installations;
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