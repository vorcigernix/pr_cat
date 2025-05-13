import { query } from '@/lib/db';
import { Repository } from '@/lib/types';
import {
  findRepositoryById,
  findRepositoryByGitHubId,
  findRepositoryByFullName,
  setRepositoryTracking,
  updateRepository,
  getOrganizationRepositories,
} from '@/lib/repositories';

/**
 * Centralized service for repository access with proper access control
 */
export class RepositoryService {
  /**
   * Get repositories by organization
   * This is the primary method for accessing repositories in the application.
   * The access control is organization-based: if a user has access to an organization
   * (by adding the app to that organization), they can access all its repositories.
   * 
   * @param organizationId The organization ID to filter by
   * @param options Additional options
   * @returns List of repositories
   */
  static async getRepositoriesByOrganization(
    organizationId: number,
    options: {
      includeTrackedOnly?: boolean;
      orderBy?: string;
      orderDir?: 'ASC' | 'DESC';
    } = {}
  ): Promise<Repository[]> {
    const { includeTrackedOnly = false, orderBy = 'name', orderDir = 'ASC' } = options;
    
    let sql = `SELECT * FROM repositories WHERE organization_id = ?`;
    const params: any[] = [organizationId];
    
    if (includeTrackedOnly) {
      sql += ` AND is_tracked = 1`;
    }
    
    sql += ` ORDER BY ${orderBy} ${orderDir}`;
    
    return await query<Repository>(sql, params);
  }
  
  /**
   * Get all repositories across all organizations
   * This should only be used in admin contexts or when organizational
   * boundaries aren't relevant for the specific use case.
   */
  static async getAllRepositories(
    options: {
      includeTrackedOnly?: boolean;
      orderBy?: string;
      orderDir?: 'ASC' | 'DESC';
    } = {}
  ): Promise<Repository[]> {
    const { includeTrackedOnly = false, orderBy = 'name', orderDir = 'ASC' } = options;
    
    let sql = `SELECT * FROM repositories`;
    const params: any[] = [];
    
    if (includeTrackedOnly) {
      sql += ` WHERE is_tracked = 1`;
    }
    
    sql += ` ORDER BY ${orderBy} ${orderDir}`;
    
    return await query<Repository>(sql, params);
  }
  
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
    const { includeTrackedOnly = false, orderBy = 'name', orderDir = 'ASC' } = options;
    
    // First get all organizations the user has access to
    const orgs = await query(`
      SELECT o.id, o.name, o.github_id, o.avatar_url
      FROM organizations o
      JOIN user_organizations uo ON o.id = uo.organization_id
      WHERE uo.user_id = ?
      ORDER BY o.name ASC
    `, [userId]);
    
    // Get repositories for each organization
    const result = await Promise.all(orgs.map(async (org) => {
      const repos = await this.getRepositoriesByOrganization(org.id, options);
      
      return {
        organization: {
          id: org.id,
          name: org.name,
          github_id: org.github_id,
          avatar_url: org.avatar_url
        },
        repositories: repos
      };
    }));
    
    return result;
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
    const orgs = await query(`
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
    const repos = await this.getRepositoriesByOrganization(org.id, options);
    
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
  
  /**
   * Get a single repository by ID
   */
  static async getRepositoryById(id: number): Promise<Repository | null> {
    return findRepositoryById(id);
  }
  
  /**
   * Get a single repository by GitHub ID
   */
  static async getRepositoryByGitHubId(githubId: number): Promise<Repository | null> {
    return findRepositoryByGitHubId(githubId);
  }
  
  /**
   * Get a single repository by full name (owner/repo)
   */
  static async getRepositoryByFullName(fullName: string): Promise<Repository | null> {
    return findRepositoryByFullName(fullName);
  }
  
  /**
   * Set the tracking status for a repository
   */
  static async setRepositoryTracking(id: number, isTracked: boolean): Promise<Repository | null> {
    return setRepositoryTracking(id, isTracked);
  }
  
  /**
   * Update a repository
   */
  static async updateRepository(
    id: number, 
    data: Partial<Omit<Repository, 'id' | 'github_id' | 'created_at' | 'updated_at'>>
  ): Promise<Repository | null> {
    return updateRepository(id, data);
  }
  
  /**
   * Get repositories for an organization
   */
  static async getOrganizationRepositories(organizationId: number): Promise<Repository[]> {
    return getOrganizationRepositories(organizationId);
  }
} 