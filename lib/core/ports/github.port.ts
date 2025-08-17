/**
 * GitHub API Service Port
 * Defines the contract for GitHub API operations
 */

import { Organization } from '../domain/entities/organization'
import { Repository } from '../domain/entities/repository'
import { PullRequest } from '../domain/entities/pull-request'
import { User } from '../domain/entities/user'

export interface IGitHubService {
  /**
   * Get user information from GitHub
   */
  getUser(accessToken: string): Promise<User>

  /**
   * Get user's organizations from GitHub
   */
  getUserOrganizations(accessToken: string): Promise<Organization[]>

  /**
   * Get organization information from GitHub
   */
  getOrganization(orgLogin: string): Promise<Organization>

  /**
   * Get organization repositories from GitHub
   */
  getOrganizationRepositories(
    orgLogin: string,
    options?: {
      type?: 'all' | 'public' | 'private'
      sort?: 'created' | 'updated' | 'pushed' | 'full_name'
      per_page?: number
      page?: number
    }
  ): Promise<Repository[]>

  /**
   * Get accessible repositories for an organization (requires GitHub App)
   */
  getAccessibleRepositories(orgLogin: string): Promise<Repository[]>

  /**
   * Get repository information from GitHub
   */
  getRepository(owner: string, repo: string): Promise<Repository>

  /**
   * Get pull requests for a repository
   */
  getRepositoryPullRequests(
    owner: string,
    repo: string,
    options?: {
      state?: 'open' | 'closed' | 'all'
      sort?: 'created' | 'updated' | 'popularity' | 'long-running'
      direction?: 'asc' | 'desc'
      per_page?: number
      page?: number
    }
  ): Promise<PullRequest[]>

  /**
   * Get pull request details from GitHub
   */
  getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<PullRequest>

  /**
   * Get pull request reviews
   */
  getPullRequestReviews(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<Array<{
    id: string
    user: User
    state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED'
    body: string
    submittedAt: Date
  }>>

  /**
   * Sync organization repositories from GitHub
   */
  syncOrganizationRepositories(orgLogin: string): Promise<{
    synced: Repository[]
    errors: Array<{ repo: string; error: string }>
  }>

  /**
   * Sync repository pull requests from GitHub
   */
  syncRepositoryPullRequests(
    repositoryId: string,
    since?: Date
  ): Promise<{
    synced: PullRequest[]
    errors: Array<{ pr: number; error: string }>
  }>

  /**
   * Check GitHub App installation status
   */
  getInstallationStatus(orgLogin: string): Promise<{
    isInstalled: boolean
    installationId: string | null
    permissions: Record<string, string>
  }>

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean

  /**
   * Process GitHub webhook event
   */
  processWebhookEvent(
    event: string,
    payload: any
  ): Promise<{
    processed: boolean
    actions: string[]
    errors?: string[]
  }>
}
