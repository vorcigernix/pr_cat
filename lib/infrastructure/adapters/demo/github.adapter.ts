/**
 * Demo GitHub Service Adapter
 * Implements IGitHubService using mock GitHub API responses
 */

import { IGitHubService } from '../../../core/ports'
import { Organization, Repository, PullRequest, User } from '../../../core/domain/entities'
import { 
  DEMO_USERS, 
  DEMO_ORGANIZATIONS, 
  DEMO_REPOSITORIES,
  DEMO_PULL_REQUESTS
} from './data/demo-data'

export class DemoGitHubService implements IGitHubService {
  
  async getUser(accessToken: string): Promise<User> {
    // Return first demo user for any access token
    return DEMO_USERS[0]
  }

  async getUserOrganizations(accessToken: string): Promise<Organization[]> {
    // Return all demo organizations
    return DEMO_ORGANIZATIONS
  }

  async getOrganization(orgLogin: string): Promise<Organization> {
    const org = DEMO_ORGANIZATIONS.find(o => o.login === orgLogin)
    if (!org) {
      throw new Error(`Organization ${orgLogin} not found`)
    }
    return org
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
    const org = DEMO_ORGANIZATIONS.find(o => o.login === orgLogin)
    if (!org) {
      throw new Error(`Organization ${orgLogin} not found`)
    }

    let repositories = DEMO_REPOSITORIES.filter(repo => repo.organizationId === org.id)

    // Apply type filter
    if (options?.type === 'public') {
      repositories = repositories.filter(repo => !repo.isPrivate)
    } else if (options?.type === 'private') {
      repositories = repositories.filter(repo => repo.isPrivate)
    }

    // Apply sorting
    if (options?.sort) {
      repositories.sort((a, b) => {
        switch (options.sort) {
          case 'created':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          case 'updated':
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          case 'pushed':
            const aPushed = a.pushedAt || a.updatedAt
            const bPushed = b.pushedAt || b.updatedAt
            return new Date(bPushed).getTime() - new Date(aPushed).getTime()
          case 'full_name':
            return a.fullName.localeCompare(b.fullName)
          default:
            return 0
        }
      })
    }

    // Apply pagination
    if (options?.page && options?.per_page) {
      const startIndex = (options.page - 1) * options.per_page
      const endIndex = startIndex + options.per_page
      repositories = repositories.slice(startIndex, endIndex)
    }

    return repositories
  }

  async getAccessibleRepositories(orgLogin: string): Promise<Repository[]> {
    // In demo mode, return all repositories as accessible
    return this.getOrganizationRepositories(orgLogin)
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    const fullName = `${owner}/${repo}`
    const repository = DEMO_REPOSITORIES.find(r => r.fullName === fullName)
    if (!repository) {
      throw new Error(`Repository ${fullName} not found`)
    }
    return repository
  }

  async getRepositoryPullRequests(
    owner: string,
    repo: string,
    options?: {
      state?: 'open' | 'closed' | 'all'
      sort?: 'created' | 'updated' | 'popularity' | 'long-running'
      direction?: 'asc' | 'desc'
      per_page?: number
      page?: number
    }
  ): Promise<PullRequest[]> {
    const repository = await this.getRepository(owner, repo)
    
    // Filter PRs by repository
    let prs = DEMO_PULL_REQUESTS.filter(pr => pr.repository.name === repository.name)
    
    // Apply state filter
    if (options?.state && options.state !== 'all') {
      prs = prs.filter(pr => pr.state === options.state)
    }

    // Convert summaries to full PRs
    const fullPRs: PullRequest[] = prs.map(summary => ({
      ...summary,
      createdAt: summary.createdAt.toISOString(),
      mergedAt: summary.mergedAt ? summary.mergedAt.toISOString() : '',
      developer: {
        id: `demo-user-${summary.author.login}`,
        name: summary.author.login.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
      },
      status: summary.state,
      cycleTime: summary.mergedAt ? 
        Math.round((summary.mergedAt.getTime() - summary.createdAt.getTime()) / (1000 * 60 * 60) * 10) / 10 : 0,
      author: {
        id: `demo-user-${summary.author.login}`,
        login: summary.author.login,
        name: summary.author.login.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        avatarUrl: summary.author.avatarUrl
      },
      repository: {
        id: `demo-repo-${summary.repository.name}`,
        name: summary.repository.name,
        fullName: `${owner}/${summary.repository.name}`
      },
      category: summary.category ? {
        id: summary.category.name.toLowerCase().replace(/\s+/g, '-'),
        name: summary.category.name
      } : undefined,
      description: `Detailed description for PR #${summary.number}`,
      isDraft: false,
      changedFiles: Math.floor(summary.additions / 20) + Math.floor(summary.deletions / 20),
      reviewers: [
        {
          id: 'demo-reviewer-1',
          login: 'reviewer1',
          name: 'Code Reviewer'
        }
      ],
      labels: [
        {
          id: 'enhancement',
          name: 'enhancement',
          color: '#a2eeef'
        }
      ],
      htmlUrl: `https://github.com/${owner}/${repo}/pull/${summary.number}`,
      updatedAt: summary.mergedAt || summary.createdAt,
      closedAt: summary.state === 'closed' ? summary.mergedAt : null
    }))

    // Apply sorting
    if (options?.sort) {
      fullPRs.sort((a, b) => {
        let comparison = 0
        switch (options.sort) {
          case 'created':
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            break
          case 'updated':
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            break
          default:
            comparison = 0
        }
        
        return options.direction === 'desc' ? -comparison : comparison
      })
    }

    // Apply pagination
    if (options?.page && options?.per_page) {
      const startIndex = (options.page - 1) * options.per_page
      const endIndex = startIndex + options.per_page
      return fullPRs.slice(startIndex, endIndex)
    }

    return fullPRs
  }

  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<PullRequest> {
    const prs = await this.getRepositoryPullRequests(owner, repo)
    const pr = prs.find(p => p.number === pullNumber)
    if (!pr) {
      throw new Error(`Pull request ${owner}/${repo}#${pullNumber} not found`)
    }
    return pr
  }

  async getPullRequestReviews(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<Array<{
    id: string
    user: User
    state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED'
    body: string
    submittedAt: Date
  }>> {
    const pr = await this.getPullRequest(owner, repo, pullNumber)
    
    // Generate demo reviews
    const reviews = []
    // Use a default review count based on PR number (demo purposes)
    const reviewCount = (pr.number % 3) + 1
    
    for (let i = 0; i < reviewCount; i++) {
      const reviewer = DEMO_USERS[i % DEMO_USERS.length]
      reviews.push({
        id: `demo-review-${i}`,
        user: reviewer,
        state: i === 0 ? 'APPROVED' as const : 'COMMENTED' as const,
        body: `Review comment from ${reviewer.name}`,
        submittedAt: new Date(new Date(pr.createdAt).getTime() + (i + 1) * 3600000) // 1 hour after creation
      })
    }
    
    return reviews
  }

  async syncOrganizationRepositories(orgLogin: string): Promise<{
    synced: Repository[]
    errors: Array<{ repo: string; error: string }>
  }> {
    try {
      const repositories = await this.getOrganizationRepositories(orgLogin)
      return {
        synced: repositories,
        errors: []
      }
    } catch (error) {
      return {
        synced: [],
        errors: [{ repo: orgLogin, error: error instanceof Error ? error.message : 'Unknown error' }]
      }
    }
  }

  async syncRepositoryPullRequests(
    repositoryId: string,
    since?: Date
  ): Promise<{
    synced: PullRequest[]
    errors: Array<{ pr: number; error: string }>
  }> {
    const repository = DEMO_REPOSITORIES.find(r => r.id === repositoryId)
    if (!repository) {
      return {
        synced: [],
        errors: [{ pr: 0, error: `Repository ${repositoryId} not found` }]
      }
    }

    try {
      const [owner, repo] = repository.fullName.split('/')
      let pullRequests = await this.getRepositoryPullRequests(owner, repo)
      
      // Filter by 'since' date if provided
      if (since) {
        pullRequests = pullRequests.filter(pr => new Date(pr.createdAt) >= since)
      }

      return {
        synced: pullRequests,
        errors: []
      }
    } catch (error) {
      return {
        synced: [],
        errors: [{ pr: 0, error: error instanceof Error ? error.message : 'Unknown error' }]
      }
    }
  }

  async getInstallationStatus(orgLogin: string): Promise<{
    isInstalled: boolean
    installationId: string | null
    permissions: Record<string, string>
  }> {
    const org = DEMO_ORGANIZATIONS.find(o => o.login === orgLogin)
    
    return {
      isInstalled: org?.isInstalled || false,
      installationId: org?.installationId || null,
      permissions: {
        contents: 'read',
        pull_requests: 'read',
        metadata: 'read'
      }
    }
  }

  validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    // In demo mode, always return true for webhook validation
    return true
  }

  async processWebhookEvent(
    event: string,
    payload: any
  ): Promise<{
    processed: boolean
    actions: string[]
    errors?: string[]
  }> {
    // In demo mode, simulate successful processing
    const supportedEvents = ['pull_request', 'push', 'installation', 'installation_repositories']
    
    if (supportedEvents.includes(event)) {
      return {
        processed: true,
        actions: [`Processed ${event} event`],
      }
    }

    return {
      processed: false,
      actions: [],
      errors: [`Unsupported event type: ${event}`]
    }
  }
}
