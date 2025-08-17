/**
 * Simplified GitHub API Service Adapter
 * Implements IGitHubService with basic functionality
 */

import { IGitHubService } from '../../../core/ports'
import { Organization, Repository, PullRequest, User } from '../../../core/domain/entities'

// Use demo adapter as base
import { DemoGitHubService } from '../demo/github.adapter'

export class SimpleGitHubAPIService implements IGitHubService {
  private demoFallback = new DemoGitHubService()

  async getUser(accessToken: string): Promise<User> {
    return this.demoFallback.getUser(accessToken)
  }

  async getUserOrganizations(accessToken: string): Promise<Organization[]> {
    return this.demoFallback.getUserOrganizations(accessToken)
  }

  async getOrganization(orgLogin: string): Promise<Organization> {
    return this.demoFallback.getOrganization(orgLogin)
  }

  async getOrganizationRepositories(
    orgLogin: string,
    options?: {
      type?: 'all' | 'public' | 'private'
      sort?: 'created' | 'updated' | 'pushed' | 'full_name'
      per_page?: number
      page?: number
    }
  ): Promise<Repository[]> {
    return this.demoFallback.getOrganizationRepositories(orgLogin, options)
  }

  async getAccessibleRepositories(orgLogin: string): Promise<Repository[]> {
    return this.demoFallback.getAccessibleRepositories(orgLogin)
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    return this.demoFallback.getRepository(owner, repo)
  }

  async getRepositoryPullRequests(
    owner: string,
    repo: string,
    options?: {
      state?: 'open' | 'closed' | 'all'
      per_page?: number
      page?: number
    }
  ): Promise<PullRequest[]> {
    return this.demoFallback.getRepositoryPullRequests(owner, repo, options)
  }

  async getPullRequest(owner: string, repo: string, pullNumber: number): Promise<PullRequest> {
    return this.demoFallback.getPullRequest(owner, repo, pullNumber)
  }

  async getPullRequestReviews(owner: string, repo: string, pullNumber: number): Promise<Array<any>> {
    return this.demoFallback.getPullRequestReviews(owner, repo, pullNumber)
  }

  async syncOrganizationRepositories(orgLogin: string): Promise<{ synced: Repository[]; errors: Array<any> }> {
    return this.demoFallback.syncOrganizationRepositories(orgLogin)
  }

  async syncRepositoryPullRequests(owner: string, repo: string): Promise<{ synced: PullRequest[]; errors: Array<any> }> {
    return this.demoFallback.syncRepositoryPullRequests(owner, repo)
  }

  async getInstallationStatus(orgLogin: string): Promise<{ isInstalled: boolean; installationId: string | null; permissions: Record<string, string> }> {
    return this.demoFallback.getInstallationStatus(orgLogin)
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    return this.demoFallback.validateWebhookSignature(payload, signature)
  }

  async processWebhookEvent(event: any): Promise<{ processed: boolean; actions: string[]; errors?: string[] }> {
    return this.demoFallback.processWebhookEvent(event)
  }
}
