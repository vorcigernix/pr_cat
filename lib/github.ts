import { Octokit } from '@octokit/rest';
import { GitHubOrganization, GitHubRepository, GitHubPullRequest, GitHubUser } from './types';

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
  
  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken,
    });
  }
  
  async getCurrentUser(): Promise<GitHubUser> {
    const { data } = await this.octokit.users.getAuthenticated();
    return data as GitHubUser;
  }
  
  async getUserOrganizations(): Promise<GitHubOrganization[]> {
    try {
      console.log('Fetching GitHub organizations for user...');
      const { data } = await this.octokit.orgs.listForAuthenticatedUser();
      console.log('GitHub API response for organizations:', JSON.stringify(data, null, 2));
      return data as GitHubOrganization[];
    } catch (error) {
      console.error('Error fetching GitHub organizations:', error);
      throw error;
    }
  }
  
  async getOrganizationRepositories(org: string): Promise<GitHubRepository[]> {
    const { data } = await this.octokit.repos.listForOrg({
      org,
      type: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: 100
    });
    return data as GitHubRepository[];
  }
  
  async getUserRepositories(): Promise<GitHubRepository[]> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      type: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: 100
    });
    return data as GitHubRepository[];
  }
  
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const { data } = await this.octokit.repos.get({
      owner,
      repo
    });
    return data as GitHubRepository;
  }
  
  async getPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'all', page = 1, perPage = 100): Promise<GitHubPullRequest[]> {
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
  }
  
  async getPullRequest(owner: string, repo: string, pullNumber: number): Promise<GitHubPullRequest> {
    const { data } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber
    });
    return data as GitHubPullRequest;
  }
  
  async getAllPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'all'): Promise<GitHubPullRequest[]> {
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
  }
  
  async getPullRequestCommits(owner: string, repo: string, pullNumber: number): Promise<{ sha: string; commit: { message: string } }[]> {
    const { data } = await this.octokit.pulls.listCommits({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100
    });
    return data;
  }
  
  async getPullRequestFiles(owner: string, repo: string, pullNumber: number): Promise<{ filename: string; additions: number; deletions: number; changes: number; status: string }[]> {
    const { data } = await this.octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100
    });
    return data;
  }
  
  async getPullRequestReviews(owner: string, repo: string, pullNumber: number): Promise<PullRequestReview[]> {
    const { data } = await this.octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber
    });
    return data as unknown as PullRequestReview[];
  }
  
  async getRepositoryWebhooks(owner: string, repo: string): Promise<RepositoryWebhook[]> {
    const { data } = await this.octokit.repos.listWebhooks({
      owner,
      repo
    });
    return data as unknown as RepositoryWebhook[];
  }
  
  async createRepositoryWebhook(owner: string, repo: string, webhookUrl: string): Promise<{ id: number }> {
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
  }
  
  async deleteRepositoryWebhook(owner: string, repo: string, webhookId: number): Promise<void> {
    await this.octokit.repos.deleteWebhook({
      owner,
      repo,
      hook_id: webhookId
    });
  }
}

// Helper function to create a GitHub client from a session access token
export function createGitHubClient(accessToken: string): GitHubClient {
  return new GitHubClient(accessToken);
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