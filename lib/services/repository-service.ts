import { query } from '@/lib/db';
import { Repository } from '@/lib/types';
import { getRepositoriesByUser } from '@/lib/repositories/repository-repository';

type OrganizationRow = {
  id: number;
  name: string;
  github_id: number;
  avatar_url: string | null;
};

/**
 * Centralized service for repository access with proper access control
 */
export class RepositoryService {
  /**
   * Get repositories for organizations accessible to a user
   * This is useful for showing repositories grouped by organizations the user has access to.
   */
  static async getRepositoriesForUserOrganizations(
    userId: string,
    options: {
      includeTrackedOnly?: boolean;
      orderBy?: string;
      orderDir?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{organization: {id: number, name: string}, repositories: Repository[]}[]> {
    // First get all organizations the user has access to
    const orgs = await query<OrganizationRow>(`
      SELECT o.id, o.name, o.github_id, o.avatar_url
      FROM organizations o
      JOIN user_organizations uo ON o.id = uo.organization_id
      WHERE uo.user_id = ?
      ORDER BY o.name ASC
    `, [userId]);
    
    if (orgs.length === 0) return [];

    const repositories = await getRepositoriesByUser(userId, undefined, options);
    const repositoriesByOrganization = new Map<Repository['organization_id'], Repository[]>();
    for (const repository of repositories) {
      const group = repositoriesByOrganization.get(repository.organization_id) ?? [];
      group.push(repository);
      repositoriesByOrganization.set(repository.organization_id, group);
    }

    return orgs.map(org => ({
      organization: {
        id: org.id,
        name: org.name,
        github_id: org.github_id,
        avatar_url: org.avatar_url
      },
      repositories: repositoriesByOrganization.get(org.id) ?? []
    }));
  }
  
  /**
   * Get repositories for a single specific organization accessible to a user.
   * @param userId The ID of the user.
   * @param organizationGitHubId The GitHub ID of the organization.
   * @param options Additional options for fetching repositories.
   * @returns An object containing the organization details and its repositories, or null if not found/accessible.
   */
  static async getRepositoriesForSingleOrganization(
    userId: string,
    organizationGitHubId: number,
    options: {
      includeTrackedOnly?: boolean;
      orderBy?: string;
      orderDir?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{organization: {id: number, name: string, github_id: number, avatar_url: string | null}, repositories: Repository[]} | null> {
    // Find the specific organization by its GitHub ID and ensure the user has access
    const orgs = await query<OrganizationRow>(`
      SELECT o.id, o.name, o.github_id, o.avatar_url
      FROM organizations o
      JOIN user_organizations uo ON o.id = uo.organization_id
      WHERE uo.user_id = ? AND o.github_id = ?
      LIMIT 1
    `, [userId, organizationGitHubId]);

    if (orgs.length === 0) {
      // Organization not found for this user or doesn't exist with this github_id
      return null;
    }

    const org = orgs[0];

    // Get repositories for this specific organization
    const repos = await getRepositoriesByUser(userId, org.id, options);
    
    return {
      organization: {
        id: org.id,
        name: org.name,
        github_id: org.github_id,
        avatar_url: org.avatar_url
      },
      repositories: repos
    };
  }
}
