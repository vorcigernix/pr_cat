import { GitHubClient } from '@/lib/github';
import { findUserById, setRepositoryTracking, findRepositoryByGitHubId } from '@/lib/repositories';
import { syncOrganizationAssociations, syncOrganizationRepositories, syncOrganizationMembers } from '@/lib/infrastructure/adapters/github/organization-sync';
import { GitHubRepository, GitHubOrganization, GitHubUser } from '@/lib/types';
import type { PullRequestSyncResult } from '@/lib/core/ports/github.port';
import { syncRepositoryPullRequests } from '@/lib/infrastructure/adapters/github/pull-request-sync';
import { createInstallationClient } from "@/lib/github-app";

export class GitHubService {
  private client: GitHubClient;
  
  constructor(accessToken: string) {
    this.client = new GitHubClient(accessToken);
  }
  
  async syncUserOrganizations(userId: string, options: { includeDetails?: boolean } = {}): Promise<GitHubOrganization[]> {
    if (!await findUserById(userId)) throw new Error(`User not found in database with ID: ${userId}`);
    const organizations: GitHubOrganization[] = [];
    for (let page = 1; ; page++) {
      const githubOrgs = await this.client.getUserOrganizations(page);
      const stored = await syncOrganizationAssociations(userId, githubOrgs);
      organizations.push(...githubOrgs);
      if (options.includeDetails !== false) {
        for (const org of stored) {
          const result = await syncOrganizationRepositories(this.client, org.name, org.id);
          if (result.errors.length > 0) throw new Error(result.errors[0].error);
          await syncOrganizationMembers(this.client, org.name, org.id);
        }
      }
      if (githubOrgs.length < 100) return organizations;
    }
  }

  async syncRepositoryPullRequests(owner: string, repo: string, repositoryId: number): Promise<PullRequestSyncResult> {
    return syncRepositoryPullRequests(this.client, repositoryId, owner, repo);
  }

  async getCurrentUser(): Promise<GitHubUser> {
    return this.client.getCurrentUser();
  }
  
  async getCurrentUserRepositories(): Promise<GitHubRepository[]> {
    return this.client.getUserRepositories();
  }
  
  async getAccessibleRepositories(organizationName: string): Promise<Set<string>> {
    try {
      // Get all repos for the organization
      const repos = await this.client.getOrganizationRepositories(organizationName);
      
      // Create a set of accessible repo full_names
      const accessibleRepos = new Set<string>();
      
      // Check each repository for webhook access
      for (const repo of repos) {
        try {
          const hasAccess = await this.client.checkRepositoryAccess(organizationName, repo.name);
          if (hasAccess) {
            accessibleRepos.add(repo.full_name);
          }
        } catch (error) {
          console.error(`Error checking access for ${repo.full_name}:`, error);
          // Don't add to the set if we encounter an error
        }
      }
      
      return accessibleRepos;
    } catch (error) {
      console.error(`Error getting accessible repositories for ${organizationName}:`, error);
      return new Set<string>();
    }
  }
  
  async setupRepositoryTracking(repositoryId: number, appUrl: string): Promise<{ success: boolean; webhookId?: number; message: string }> {
    // Find repository in database
    const repository = await findRepositoryByGitHubId(repositoryId);
    
    if (!repository) {
      throw new Error('Repository not found');
    }
    
    // Extract owner and repo from full_name (format: owner/repo)
    const [owner, repo] = repository.full_name.split('/');
    
    if (!owner || !repo) {
      throw new Error('Invalid repository full_name format');
    }
    
    const webhookUrl = `${appUrl}/api/webhook/github`;
    
    // Check if webhook already exists
    const existingWebhooks = await this.client.getRepositoryWebhooks(owner, repo);
    const webhookExists = existingWebhooks.some(webhook => 
      webhook.config.url === webhookUrl || webhook.config.url === `${webhookUrl}/`
    );
    
    if (webhookExists) {
      await setRepositoryTracking(repository.id, true);
      return { 
        success: true, 
        message: 'Repository is already being tracked with an existing webhook'
      };
    }
    
    // Create new webhook
    const webhook = await this.client.createRepositoryWebhook(owner, repo, webhookUrl);
    
    // Mark repository as tracked
    await setRepositoryTracking(repository.id, true);
    
    // Sync pull requests
    const sync = await this.syncRepositoryPullRequests(owner, repo, repository.id);
    if (sync.errors.length > 0) {
      return { success: false, webhookId: webhook.id, message: 'Tracking enabled, but initial PR sync failed. Retry synchronization.' };
    }
    
    return { 
      success: true, 
      webhookId: webhook.id,
      message: 'Webhook created successfully and repository is now being tracked'
    };
  }
  
  async removeRepositoryTracking(repositoryId: number, appUrl: string): Promise<{ success: boolean; message: string }> {
    console.log(`[removeRepositoryTracking] Called with repositoryId: ${repositoryId}, appUrl: ${appUrl}`);
    // Find repository in database
    const repository = await findRepositoryByGitHubId(repositoryId);
    
    if (!repository) {
      console.error(`[removeRepositoryTracking] Repository not found for GitHub ID: ${repositoryId}`);
      throw new Error('Repository not found');
    }
    
    const [owner, repo] = repository.full_name.split('/');
    console.log(`[removeRepositoryTracking] Extracted owner: ${owner}, repo: ${repo}`);
    
    if (!owner || !repo) {
      console.error(`[removeRepositoryTracking] Invalid repository full_name format: ${repository.full_name}`);
      throw new Error('Invalid repository full_name format');
    }
    
    const webhookUrl = `${appUrl}/api/webhook/github`;
    console.log(`[removeRepositoryTracking] Constructed webhookUrl to match: ${webhookUrl}`);
    
    // Find and delete existing webhooks
    const existingWebhooks = await this.client.getRepositoryWebhooks(owner, repo);
    console.log(`[removeRepositoryTracking] Found ${existingWebhooks.length} existing webhooks on GitHub for ${owner}/${repo}:`, JSON.stringify(existingWebhooks, null, 2));
    
    const targetWebhooks = existingWebhooks.filter(webhook => 
      webhook.config.url === webhookUrl || webhook.config.url === `${webhookUrl}/` // Handle trailing slash
    );
    console.log(`[removeRepositoryTracking] Found ${targetWebhooks.length} target webhooks matching URL ${webhookUrl}:`, JSON.stringify(targetWebhooks, null, 2));
    
    let deletedCount = 0;
    if (targetWebhooks.length === 0) {
      console.warn(`[removeRepositoryTracking] No webhooks found on GitHub matching the URL ${webhookUrl} for repository ${owner}/${repo}. Marking as untracked in DB anyway.`);
    }

    for (const webhook of targetWebhooks) {
      try {
        console.log(`[removeRepositoryTracking] Attempting to delete webhook with ID: ${webhook.id} for ${owner}/${repo}`);
        await this.client.deleteRepositoryWebhook(owner, repo, webhook.id);
        console.log(`[removeRepositoryTracking] Successfully deleted webhook ID: ${webhook.id} from GitHub for ${owner}/${repo}`);
        deletedCount++;
      } catch (error) {
        console.error(`[removeRepositoryTracking] Failed to delete webhook ID: ${webhook.id} for ${owner}/${repo} from GitHub. Error:`, error);
        // Decide if you want to throw here or just log and continue to mark as untracked in DB
        // For now, we'll log and continue, so it still gets marked as untracked in the DB.
      }
    }
    
    // Mark repository as not tracked
    await setRepositoryTracking(repository.id, false);
    console.log(`[removeRepositoryTracking] Marked repository ${repository.id} (GitHub ID: ${repository.github_id}) as not tracked in DB.`);
    
    return { 
      success: true, 
      message: `Attempted to remove ${targetWebhooks.length} webhooks (successfully deleted ${deletedCount}) and repository is no longer being tracked`
    };
  }
}

/**
 * Syncs repositories for a single specific organization using a GitHub App installation.
 * @param installationId The GitHub App installation ID for the organization.
 * @param orgName The GitHub login name of the organization.
 * @param organizationDbId The internal database ID of the organization.
 * @returns Counts of new, updated, and total synced repositories.
 */
export async function syncSingleOrganizationRepositories(
  installationId: number,
  orgName: string,
  organizationDbId: number
): Promise<{ newCount: number; updatedCount: number; syncedCount: number; errors: string[] }> {
  const client = await createInstallationClient(installationId);
  const result = await syncOrganizationRepositories(client, orgName, organizationDbId);
  return {
    newCount: result.created,
    updatedCount: result.updated,
    syncedCount: result.processed,
    errors: result.errors.map(error => error.error),
  };
}
