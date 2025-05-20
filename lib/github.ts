export const runtime = 'nodejs';
import { Octokit } from '@octokit/rest';
import { GitHubOrganization, GitHubRepository, GitHubPullRequest, GitHubUser } from './types';
import { clearTokenFromCache } from './github-app';

// Types that match Octokit's actual return types
interface PullRequestReview {
  id: number;
  user: GitHubUser | null;
  state: string;
  submitted_at: string;
}

interface RepositoryWebhook {
  id: number;
  config: {
    url?: string;
    content_type?: string;
  };
  events: string[];
}

export class GitHubClient {
  private octokit: Octokit;
  private token: string;
  private installationId?: number;
  
  constructor(accessToken: string, installationId?: number) {
    this.token = accessToken;
    this.installationId = installationId;
    this.octokit = this.createOctokitClient(accessToken);
  }
  
  private createOctokitClient(token: string): Octokit {
    return new Octokit({
      auth: token,
    });
  }

  /**
   * Execute a GitHub API request with automatic token expiration handling
   * @param apiCall Function that executes the actual API call
   * @returns Result of the API call
   */
  private async executeWithTokenRefresh<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      // Try the API call first
      return await apiCall();
    } catch (error: any) {
      // Check if the error is related to authentication
      if (
        this.installationId && // Only try refresh for installation tokens
        (error.status === 401 || // Unauthorized
         error.status === 403 || // Forbidden
         (error.message && typeof error.message === 'string' && 
          (error.message.includes('token expired') || 
           error.message.includes('Bad credentials') || 
           error.message.includes('authorization')))
        )
      ) {
        console.warn(`GitHub API token error (possibly expired): ${error.message || error.status}. Clearing token from cache.`);
        
        // Clear the token from cache to force refresh on next request
        if (this.installationId) {
          clearTokenFromCache(this.installationId);
        }
        
        // Re-throw the error, as we can't refresh here (we don't have access to getInstallationToken)
        // The caller will need to recreate the client
        throw new Error('GitHub token expired or invalid - client needs to be recreated');
      }
      
      // For other errors, just re-throw
      throw error;
    }
  }
  
  async getCurrentUser(): Promise<GitHubUser> {
    return this.executeWithTokenRefresh(async () => {
      const { data } = await this.octokit.users.getAuthenticated();
      return data as GitHubUser;
    });
  }
  
  async getUserOrganizations(): Promise<GitHubOrganization[]> {
    return this.executeWithTokenRefresh(async () => {
      try {
        console.log('Fetching GitHub organizations for user...');
        const { data } = await this.octokit.orgs.listForAuthenticatedUser();
        console.log('GitHub API response for organizations:', JSON.stringify(data, null, 2));
        return data as GitHubOrganization[];
      } catch (error) {
        console.error('Error fetching GitHub organizations:', error);
        throw error;
      }
    });
  }
  
  async getOrganizationRepositories(org: string): Promise<GitHubRepository[]> {
    return this.executeWithTokenRefresh(async () => {
      const { data } = await this.octokit.repos.listForOrg({
        org,
        type: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: 100
      });
      return data as GitHubRepository[];
    });
  }
  
  async getUserRepositories(): Promise<GitHubRepository[]> {
    return this.executeWithTokenRefresh(async () => {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        type: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: 100
      });
      return data as GitHubRepository[];
    });
  }
  
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.executeWithTokenRefresh(async () => {
      const { data } = await this.octokit.repos.get({
        owner,
        repo
      });
      return data as GitHubRepository;
    });
  }
  
  async checkRepositoryAccess(owner: string, repo: string): Promise<boolean> {
    return this.executeWithTokenRefresh(async () => {
      try {
        // Try to access webhooks API - this requires admin permissions
        // which is a good test for proper app installation access
        await this.octokit.repos.listWebhooks({
          owner,
          repo,
          per_page: 1
        });
        return true; // Repository is accessible with webhook permissions
      } catch (error: any) {
        if (error.status === 404 || error.status === 403) {
          console.log(`Repository ${owner}/${repo} is not accessible for webhooks: ${error.message}`);
          return false; // No admin access
        }
        throw error; // Other errors should be handled by caller
      }
    });
  }
  
  async getPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'all', page = 1, perPage = 100): Promise<GitHubPullRequest[]> {
    return this.executeWithTokenRefresh(async () => {
      const { data } = await this.octokit.pulls.list({
        owner,
        repo,
        state,
        sort: 'updated',
        direction: 'desc',
        per_page: perPage,
        page
      });
      return data as GitHubPullRequest[];
    });
  }
  
  async getPullRequest(owner: string, repo: string, pullNumber: number): Promise<GitHubPullRequest> {
    return this.executeWithTokenRefresh(async () => {
      const { data } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber
      });
      return data as GitHubPullRequest;
    });
  }
  
  async getAllPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'all'): Promise<GitHubPullRequest[]> {
    return this.executeWithTokenRefresh(async () => {
      let page = 1;
      const perPage = 100;
      let allPRs: GitHubPullRequest[] = [];
      let prs: GitHubPullRequest[] = [];
      
      do {
        prs = await this.getPullRequests(owner, repo, state, page, perPage);
        allPRs = [...allPRs, ...prs];
        page++;
      } while (prs.length === perPage);
      
      return allPRs;
    });
  }
  
  async getPullRequestCommits(owner: string, repo: string, pullNumber: number): Promise<{ sha: string; commit: { message: string } }[]> {
    return this.executeWithTokenRefresh(async () => {
      const { data } = await this.octokit.pulls.listCommits({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100
      });
      return data;
    });
  }
  
  async getPullRequestFiles(owner: string, repo: string, pullNumber: number): Promise<{ filename: string; additions: number; deletions: number; changes: number; status: string }[]> {
    return this.executeWithTokenRefresh(async () => {
      const { data } = await this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100
      });
      return data;
    });
  }
  
  async getPullRequestReviews(owner: string, repo: string, pullNumber: number): Promise<PullRequestReview[]> {
    return this.executeWithTokenRefresh(async () => {
      const { data } = await this.octokit.pulls.listReviews({
        owner,
        repo,
        pull_number: pullNumber
      });
      return data as unknown as PullRequestReview[];
    });
  }
  
  async getPullRequestDiff(owner: string, repo: string, pullNumber: number): Promise<string> {
    return this.executeWithTokenRefresh(async () => {
      const { data } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
        mediaType: {
          format: 'diff'
        }
      });
      // The response for a diff is a string
      return data as unknown as string;
    });
  }
  
  async getRepositoryWebhooks(owner: string, repo: string): Promise<RepositoryWebhook[]> {
    return this.executeWithTokenRefresh(async () => {
      const { data } = await this.octokit.repos.listWebhooks({
        owner,
        repo
      });
      return data as unknown as RepositoryWebhook[];
    });
  }
  
  async createRepositoryWebhook(owner: string, repo: string, webhookUrl: string): Promise<{ id: number }> {
    return this.executeWithTokenRefresh(async () => {
      const { data } = await this.octokit.repos.createWebhook({
        owner,
        repo,
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret: process.env.GITHUB_WEBHOOK_SECRET,
        },
        events: ['pull_request', 'pull_request_review']
      });
      return data;
    });
  }
  
  async deleteRepositoryWebhook(owner: string, repo: string, webhookId: number): Promise<void> {
    return this.executeWithTokenRefresh(async () => {
      await this.octokit.repos.deleteWebhook({
        owner,
        repo,
        hook_id: webhookId
      });
    });
  }

  // Method for GitHub App installation token request
  async createInstallationAccessToken(installationId: number): Promise<string> {
    return this.executeWithTokenRefresh(async () => {
      const { data } = await this.octokit.request('POST /app/installations/{installation_id}/access_tokens', {
        installation_id: installationId,
        headers: {
          'Accept': 'application/vnd.github+json'
        }
      });
      
      return data.token;
    });
  }
}

// Helper function to create a GitHub client from a session access token
export function createGitHubClient(accessToken: string): GitHubClient {
  return new GitHubClient(accessToken);
}

// Helper function to create a GitHub client for an installation
export function createGitHubInstallationClient(accessToken: string, installationId: number): GitHubClient {
  return new GitHubClient(accessToken, installationId);
}

// Debug function to log available organizations for a user
export async function logGitHubOrgsForUser(accessToken: string): Promise<void> {
  try {
    const client = new GitHubClient(accessToken);
    const orgs = await client.getUserOrganizations();
    
    console.log('GitHub orgs available to user:');
    orgs.forEach(org => {
      console.log(` - ${org.login} (ID: ${org.id})`);
    });
    
    return;
  } catch (error) {
    console.error('Error fetching GitHub orgs for debug:', error);
    throw error;
  }
} 