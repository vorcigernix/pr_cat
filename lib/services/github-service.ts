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
  addUserToOrganization
} from '@/lib/repositories';
import { GitHubRepository, GitHubPullRequest, GitHubOrganization, GitHubUser, PRReview } from '@/lib/types';

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
        
        // Link the user to the organization as a member
        await addUserToOrganization(userId, dbOrg.id, 'member');
        
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
          });
        } else {
          // Create new PR
          const newPR = await createPullRequest({
            github_id: pr.id,
            repository_id: repositoryId,
            number: pr.number,
            title: pr.title,
            description: pr.body || null,
            author_id: pr.user.id.toString(), // This might require creating user records
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
          // Map GitHub review state to our enum
          const reviewState = this.mapReviewState(review.state);
          
          await createPullRequestReview({
            github_id: review.id,
            pull_request_id: pullRequestId,
            reviewer_id: review.user.id.toString(), // This might require creating user records
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
    
    // Find and delete existing webhooks
    const existingWebhooks = await this.client.getRepositoryWebhooks(owner, repo);
    const targetWebhooks = existingWebhooks.filter(webhook => 
      webhook.config.url === webhookUrl || webhook.config.url === `${webhookUrl}/`
    );
    
    for (const webhook of targetWebhooks) {
      await this.client.deleteRepositoryWebhook(owner, repo, webhook.id);
    }
    
    // Mark repository as not tracked
    await setRepositoryTracking(repository.id, false);
    
    return { 
      success: true, 
      message: `Removed ${targetWebhooks.length} webhooks and repository is no longer being tracked`
    };
  }
} 