import { OrganizationWithInstallation } from '@/components/ui/github-org-setup-item';
import { auth } from '@/auth';
import { findUserWithOrganizations } from '@/lib/repositories/user-repository';
import { generateAppJwt } from '@/lib/github-app';
import { Octokit } from '@octokit/rest';
import type { Organization } from '@/lib/types';

type OrganizationWithRole = Organization & {
  role?: string;
};

/**
 * Fetch organization installations data (server component)
 * This directly queries the database and GitHub App API instead of making HTTP requests
 */
export async function getOrganizationInstallations(): Promise<OrganizationWithInstallation[]> {
  try {
    // Get the user session to check authentication
    const session = await auth();
    
    if (!session || !session.user) {
      return [];
    }
    
    const userId = session.user.id;
    
    // Directly fetch user with organizations from database
    const result = await findUserWithOrganizations(userId);
    
    if (!result || !result.organizations || result.organizations.length === 0) {
      return [];
    }
    
    
    try {
      // List GitHub App installations to enrich with installation status
      const appJwt = await generateAppJwt();
      const appOctokit = new Octokit({ auth: appJwt });
      
      const { data: installationsData } = await appOctokit.apps.listInstallations();
      
      // Map database organizations with GitHub App installation status
      const enriched = result.organizations.map((org: OrganizationWithRole) => {
        const installation = installationsData.find(
          (install) => install.account && install.account.login.toLowerCase() === org.name.toLowerCase()
        );
        const hasAppInstalled = !!installation;
        
        
        return {
          ...org,
          hasAppInstalled,
          installationId: installation?.id ?? null,
        };
      });
      
      return enriched;
    } catch (appError) {
      console.error('getOrganizationInstallations: Error fetching GitHub App installations:', appError);
      // Return organizations without installation status if GitHub App API fails
      return result.organizations.map((org: OrganizationWithRole) => ({
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
