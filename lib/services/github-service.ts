import { GitHubClient } from '@/lib/github';
import { 
  findOrCreateOrganization, 
  findOrCreateRepository,
  findUserById,
  createPullRequest,
  findPullRequestByNumber,
  updatePullRequest,
  findReviewByGitHubId,
  createPullRequestReview,
  setRepositoryTracking,
  findRepositoryById,
  findRepositoryByGitHubId,
  addUserToOrganization,
  findOrCreateUserByGitHubId
} from '@/lib/repositories';
import { GitHubRepository, GitHubPullRequest, GitHubOrganization, GitHubUser, PRReview, Repository } from '@/lib/types';
import { createInstallationClient } from "@/lib/github-app";

export class GitHubService {
  private client: GitHubClient;
  
  constructor(accessToken: string) {
    this.client = new GitHubClient(accessToken);
  }
  
  async syncUserOrganizations(userId: string): Promise<GitHubOrganization[]> {
    const user = await findUserById(userId);
    if (!user) {
      console.error(`User not found in database with ID: ${userId}`);
      throw new Error(`User not found in database with ID: ${userId}. This may be due to ID mismatch between Auth.js and the database.`);
    }
    
    // Fetch organizations from GitHub
    const githubOrgs = await this.client.getUserOrganizations();
    console.log(`Found ${githubOrgs.length} GitHub organizations for user ${userId}`);
    
    // Store organizations in the database and link to user
    const storedOrgs = await Promise.all(
      githubOrgs.map(async (org) => {
        // Create or find the organization
        const dbOrg = await findOrCreateOrganization({
          github_id: org.id,
          name: org.login,
          avatar_url: org.avatar_url,
        });
        
        console.log(`Linking user ${userId} to organization ${dbOrg.id} (${org.login})`);
        
        // Link the user to the organization as an owner
        await addUserToOrganization(userId, dbOrg.id, 'owner');
        
        // Fetch and sync repositories for this organization 
        await this.syncOrganizationRepositories(org.login);
        
        return dbOrg;
      })
    );
    
    console.log(`Successfully processed ${storedOrgs.length} organizations for user ${userId}`);
    return githubOrgs;
  }
  
  async syncOrganizationRepositories(organizationName: string): Promise<GitHubRepository[]> {
    // Fetch repositories from GitHub
    const githubRepos = await this.client.getOrganizationRepositories(organizationName);
    
    // Find organization in database
    const org = await findOrCreateOrganization({
      github_id: githubRepos[0]?.owner.id || 0,
      name: organizationName,
      avatar_url: '',
    });
    
    // Store repositories in the database
    await Promise.all(
      githubRepos.map(async (repo) => {
        await findOrCreateRepository({
          github_id: repo.id,
          organization_id: org.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description || null,
          private: repo.private,
          is_tracked: false
        });
      })
    );
    
    return githubRepos;
  }
  
  async syncRepositoryPullRequests(owner: string, repo: string, repositoryId: number): Promise<GitHubPullRequest[]> {
    // Fetch all pull requests from GitHub
    const githubPRs = await this.client.getAllPullRequests(owner, repo, 'all');
    
    // Process each pull request
    await Promise.all(
      githubPRs.map(async (pr) => {
        const existingPR = await findPullRequestByNumber(repositoryId, pr.number);
        
        const state = pr.merged_at 
          ? 'merged' 
          : pr.state === 'closed' ? 'closed' : 'open';
        
        // Ensure author exists in our database
        const prAuthor = pr.user ? await findOrCreateUserByGitHubId({
          id: pr.user.id.toString(),
          login: pr.user.login,
          avatar_url: pr.user.avatar_url,
          name: pr.user.name // pr.user might not have 'name', adjust if necessary based on GitHub API response
        }) : null;

        if (existingPR) {
          // Update existing PR
          await updatePullRequest(existingPR.id, {
            title: pr.title,
            description: pr.body || null,
            state,
            updated_at: pr.updated_at,
            closed_at: pr.closed_at,
            merged_at: pr.merged_at,
            draft: pr.draft,
            // author_id is not typically updated, but if it could change or be initially null, handle here
          });
        } else {
          // Create new PR
          if (!prAuthor) {
            console.warn(`Skipping PR #${pr.number} for repo ${owner}/${repo} due to missing author information from GitHub.`);
            return; // Skip this PR if author couldn't be processed
          }
          const newPR = await createPullRequest({
            github_id: pr.id,
            repository_id: repositoryId,
            number: pr.number,
            title: pr.title,
            description: pr.body || null,
            author_id: prAuthor.id, // Use the ID from our users table
            state,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            closed_at: pr.closed_at,
            merged_at: pr.merged_at,
            draft: pr.draft,
            additions: pr.additions || null,
            deletions: pr.deletions || null,
            changed_files: pr.changed_files || null,
            category_id: null,
            category_confidence: null
          });
          
          // Fetch and store PR reviews
          await this.syncPullRequestReviews(owner, repo, pr.number, newPR.id);
        }
      })
    );
    
    return githubPRs;
  }
  
  async syncPullRequestReviews(owner: string, repo: string, prNumber: number, pullRequestId: number): Promise<void> {
    const reviews = await this.client.getPullRequestReviews(owner, repo, prNumber);
    
    await Promise.all(
      reviews.map(async (review) => {
        // Skip reviews without an ID or user
        if (!review.id || !review.user) return;
        
        const existingReview = await findReviewByGitHubId(review.id);
        
        if (!existingReview) {
          // Ensure reviewer exists in our database
          const reviewAuthor = await findOrCreateUserByGitHubId({
            id: review.user.id.toString(),
            login: review.user.login,
            avatar_url: review.user.avatar_url,
            name: review.user.name // review.user might not have 'name', adjust if necessary
          });

          if (!reviewAuthor) {
            console.warn(`Skipping review for PR #${prNumber} in ${owner}/${repo} by ${review.user.login} due to missing author information.`);
            return; // Skip this review if author couldn't be processed
          }

          // Map GitHub review state to our enum
          const reviewState = this.mapReviewState(review.state);
          
          await createPullRequestReview({
            github_id: review.id,
            pull_request_id: pullRequestId,
            reviewer_id: reviewAuthor.id, // Use the ID from our users table
            state: reviewState,
            submitted_at: review.submitted_at
          });
        }
      })
    );
  }
  
  // Helper to map GitHub review state to our enum
  private mapReviewState(state: string): PRReview['state'] {
    switch (state.toLowerCase()) {
      case 'approved':
        return 'approved';
      case 'changes_requested':
        return 'changes_requested';
      case 'commented':
        return 'commented';
      case 'dismissed':
        return 'dismissed';
      default:
        return 'commented'; // Default fallback
    }
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
    await this.syncRepositoryPullRequests(owner, repo, repository.id);
    
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
  let newCount = 0;
  let updatedCount = 0;
  const errors: string[] = [];

  try {
    console.log(`Syncing repositories for organization '${orgName}' (DB ID: ${organizationDbId}) using installation ID ${installationId}`);
    const installationClient = await createInstallationClient(installationId);
    
    // Fetch repositories from GitHub for the specific organization
    const githubRepos = await installationClient.getOrganizationRepositories(orgName);
    console.log(`Found ${githubRepos.length} repositories on GitHub for '${orgName}'`);

    for (const repo of githubRepos) {
      try {
        const existingRepo = await findRepositoryByGitHubId(repo.id);
        
        const repoData = {
          github_id: repo.id,
          organization_id: organizationDbId,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description || null,
          private: repo.private,
          // is_tracked defaults to false in findOrCreateRepository if not specified or existingRepo.is_tracked is undefined
          is_tracked: existingRepo ? existingRepo.is_tracked : false 
        };

        const savedRepo = await findOrCreateRepository(repoData);

        if (existingRepo) {
          if (existingRepo.name !== savedRepo.name || existingRepo.description !== savedRepo.description || existingRepo.private !== savedRepo.private) {
            updatedCount++;
          }
        } else {
          newCount++;
        }
      } catch (repoError) {
        const errorMessage = `Failed to process repository '${repo.full_name}': ${repoError instanceof Error ? repoError.message : String(repoError)}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }
    
    const syncedCount = githubRepos.length - errors.length;
    console.log(`Successfully synced ${syncedCount} repositories for '${orgName}'. New: ${newCount}, Updated: ${updatedCount}. Errors: ${errors.length}`);
    
    return { newCount, updatedCount, syncedCount, errors };

  } catch (error) {
    const errorMessage = `Error syncing repositories for organization '${orgName}': ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMessage);
    // Re-throw or handle as appropriate for the calling API route
    // For now, let's ensure the API route can catch this and return a 500
    // We can also return the error count here if preferred.
    throw new Error(errorMessage); 
  }
} 