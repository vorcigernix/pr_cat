/**
 * GitHub API Service Adapter
 * Implements IGitHubService using real GitHub API calls
 */

import { IGitHubService } from '../../../core/ports'
import { Organization, Repository, PullRequest, User } from '../../../core/domain/entities'
import { getGitHubApp, getGitHubClient } from '@/lib/github-app'

export class GitHubAPIService implements IGitHubService {
  
  async getUser(accessToken: string): Promise<User> {
    try {
      const github = getGitHubClient(accessToken)
      const { data: userData } = await github.rest.users.getAuthenticated()

      return {
        id: userData.id.toString(),
        login: userData.login,
        name: userData.name,
        email: userData.email,
        avatarUrl: userData.avatar_url,
        htmlUrl: userData.html_url,
        type: userData.type === 'Bot' ? 'Bot' : 'User',
        isNewUser: false, // Will be determined by database check
        hasGithubApp: false, // Will be determined by organization check
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at || userData.created_at)
      }
    } catch (error) {
      console.error('Error getting GitHub user:', error)
      throw new Error('Failed to get user from GitHub')
    }
  }

  async getUserOrganizations(accessToken: string): Promise<Organization[]> {
    try {
      const github = getGitHubClient(accessToken)
      const { data: orgs } = await github.rest.orgs.listForAuthenticatedUser()

      return orgs.map(org => ({
        id: org.id.toString(),
        login: org.login,
        name: org.name,
        description: org.description,
        avatarUrl: org.avatar_url,
        type: 'Organization',
        htmlUrl: org.html_url,
        isInstalled: false, // Will be checked separately
        installationId: null,
        createdAt: new Date(org.created_at),
        updatedAt: new Date(org.updated_at)
      }))
    } catch (error) {
      console.error('Error getting user organizations:', error)
      throw new Error('Failed to get organizations from GitHub')
    }
  }

  async getOrganization(orgLogin: string): Promise<Organization> {
    try {
      const github = getGitHubApp()
      const { data: org } = await github.rest.orgs.get({ org: orgLogin })

      return {
        id: org.id.toString(),
        login: org.login,
        name: org.name,
        description: org.description,
        avatarUrl: org.avatar_url,
        type: 'Organization',
        htmlUrl: org.html_url,
        isInstalled: false, // Will be checked separately
        installationId: null,
        createdAt: new Date(org.created_at),
        updatedAt: new Date(org.updated_at)
      }
    } catch (error) {
      console.error('Error getting organization:', error)
      throw new Error('Failed to get organization from GitHub')
    }
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
    try {
      const github = getGitHubApp()
      const { data: repos } = await github.rest.repos.listForOrg({
        org: orgLogin,
        type: options?.type || 'all',
        sort: options?.sort || 'updated',
        per_page: options?.per_page || 30,
        page: options?.page || 1
      })

      return repos.map(repo => ({
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        htmlUrl: repo.html_url,
        defaultBranch: repo.default_branch,
        isPrivate: repo.private,
        isTracked: false, // Will be determined by database
        isArchived: repo.archived,
        language: repo.language,
        size: repo.size,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        openIssuesCount: repo.open_issues_count,
        organizationId: repo.owner.id.toString(),
        createdAt: new Date(repo.created_at),
        updatedAt: new Date(repo.updated_at),
        pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null
      }))
    } catch (error) {
      console.error('Error getting organization repositories:', error)
      throw new Error('Failed to get repositories from GitHub')
    }
  }

  async getAccessibleRepositories(orgLogin: string): Promise<Repository[]> {
    // This would use the GitHub App installation to get accessible repos
    return this.getOrganizationRepositories(orgLogin)
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    try {
      const github = getGitHubApp()
      const { data: repoData } = await github.rest.repos.get({ owner, repo })

      return {
        id: repoData.id.toString(),
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description,
        htmlUrl: repoData.html_url,
        defaultBranch: repoData.default_branch,
        isPrivate: repoData.private,
        isTracked: false, // Will be determined by database
        isArchived: repoData.archived,
        language: repoData.language,
        size: repoData.size,
        stargazersCount: repoData.stargazers_count,
        forksCount: repoData.forks_count,
        openIssuesCount: repoData.open_issues_count,
        organizationId: repoData.owner.id.toString(),
        createdAt: new Date(repoData.created_at),
        updatedAt: new Date(repoData.updated_at),
        pushedAt: repoData.pushed_at ? new Date(repoData.pushed_at) : null
      }
    } catch (error) {
      console.error('Error getting repository from GitHub:', error)
      throw new Error('Failed to get repository from GitHub')
    }
  }

  // Placeholder implementations for remaining methods
  async getRepositoryPullRequests(): Promise<PullRequest[]> {
    throw new Error('Not implemented yet')
  }

  async getPullRequest(): Promise<PullRequest> {
    throw new Error('Not implemented yet')
  }

  async getPullRequestReviews(): Promise<Array<any>> {
    throw new Error('Not implemented yet')
  }

  async syncOrganizationRepositories(): Promise<{ synced: Repository[]; errors: Array<any> }> {
    throw new Error('Not implemented yet')
  }

  async syncRepositoryPullRequests(): Promise<{ synced: PullRequest[]; errors: Array<any> }> {
    throw new Error('Not implemented yet')
  }

  async getInstallationStatus(): Promise<{ isInstalled: boolean; installationId: string | null; permissions: Record<string, string> }> {
    throw new Error('Not implemented yet')
  }

  validateWebhookSignature(): boolean {
    throw new Error('Not implemented yet')
  }

  async processWebhookEvent(): Promise<{ processed: boolean; actions: string[]; errors?: string[] }> {
    throw new Error('Not implemented yet')
  }
}
