/**
 * Real GitHub API Service Adapter
 * Implements IGitHubService using actual GitHub API calls via Octokit
 */

import { IGitHubService } from '../../../core/ports'
import { Organization, Repository, PullRequest, User } from '../../../core/domain/entities'
import { GitHubClient, createGitHubClient, createGitHubInstallationClient } from '../../../github'
import { createInstallationClient } from '../../../github-app'
import crypto from 'crypto'
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
  findOrCreateUserByGitHubId,
  findOrganizationById,
  findRepositoryByFullName,
  updatePullRequestCategory,
  getOrganizationCategories,
  getOrganizationAiSettings,
  getOrganizationApiKey,
  findCategoryByNameAndOrg
} from '../../../repositories'
import * as OrganizationRepository from '../../../repositories/organization-repository'
import * as PullRequestRepository from '../../../repositories/pr-repository'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAnthropic } from '@ai-sdk/anthropic'

export class RealGitHubAPIService implements IGitHubService {
  private client?: GitHubClient

  constructor(private accessToken?: string) {
    if (accessToken) {
      this.client = createGitHubClient(accessToken)
    }
  }

  /**
   * Get user information from GitHub
   */
  async getUser(accessToken: string): Promise<User> {
    const client = createGitHubClient(accessToken)
    const githubUser = await client.getCurrentUser()
    
    return {
      id: githubUser.id.toString(),
      login: githubUser.login,
      name: githubUser.name || githubUser.login,
      email: githubUser.email || null,
      avatarUrl: githubUser.avatar_url || '',
      htmlUrl: githubUser.html_url || `https://github.com/${githubUser.login}`,
      type: 'User' as const,
      isNewUser: false, // Determined elsewhere in the application
      hasGithubApp: false, // Determined elsewhere in the application
      createdAt: new Date(), // GitHub API doesn't provide creation date for users in basic calls
      updatedAt: new Date()
    }
  }

  /**
   * Get user's organizations from GitHub
   */
  async getUserOrganizations(accessToken: string): Promise<Organization[]> {
    const client = createGitHubClient(accessToken)
    const githubOrgs = await client.getUserOrganizations()
    
    return githubOrgs.map(org => ({
      id: org.id.toString(),
      login: org.login,
      name: org.login, // GitHub Organizations only have login in basic API
      description: org.description || null,
      avatarUrl: org.avatar_url || '',
      type: 'Organization' as const,
      htmlUrl: `https://github.com/${org.login}`,
      isInstalled: false, // Will be updated when we check installation status
      installationId: null,
      createdAt: new Date(), // GitHub API doesn't provide creation date
      updatedAt: new Date()
    }))
  }

  /**
   * Get organization information from GitHub
   */
  async getOrganization(orgLogin: string): Promise<Organization> {
    if (!this.client) {
      throw new Error('GitHub client not initialized. Access token required.')
    }

    // Use the organization repositories endpoint to get org info
    const repos = await this.client.getOrganizationRepositories(orgLogin)
    const firstRepo = repos[0]
    
    if (!firstRepo) {
      throw new Error(`No repositories found for organization: ${orgLogin}`)
    }

    const owner = firstRepo.owner
    return {
      id: owner.id.toString(),
      login: owner.login,
      name: owner.login, // Owner type doesn't have name property
      description: null,
      avatarUrl: (owner as any).avatar_url || '',
      type: 'Organization' as const,
      htmlUrl: `https://github.com/${owner.login}`,
      isInstalled: false,
      installationId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * Get organization repositories from GitHub
   */
  async getOrganizationRepositories(
    orgLogin: string,
    options?: {
      type?: 'all' | 'public' | 'private'
      sort?: 'created' | 'updated' | 'pushed' | 'full_name'
      per_page?: number
      page?: number
    }
  ): Promise<Repository[]> {
    if (!this.client) {
      throw new Error('GitHub client not initialized. Access token required.')
    }

    const githubRepos = await this.client.getOrganizationRepositories(orgLogin)
    
    return githubRepos.map(repo => ({
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || null,
      htmlUrl: repo.html_url,
      defaultBranch: (repo as any).default_branch || 'main',
      isPrivate: (repo as any).private || false,
      isTracked: false,
      isArchived: (repo as any).archived || false,
      language: (repo as any).language || null,
      size: (repo as any).size || 0,
      stargazersCount: (repo as any).stargazers_count || 0,
      forksCount: (repo as any).forks_count || 0,
      openIssuesCount: (repo as any).open_issues_count || 0,
      organizationId: repo.owner.id.toString(),
      createdAt: new Date((repo as any).created_at || Date.now()),
      updatedAt: new Date((repo as any).updated_at || Date.now()),
      pushedAt: (repo as any).pushed_at ? new Date((repo as any).pushed_at) : null
    }))
  }

  /**
   * Get accessible repositories for an organization (requires GitHub App)
   */
  async getAccessibleRepositories(orgLogin: string): Promise<Repository[]> {
    // For now, return all org repositories
    // In production, this would filter based on GitHub App installation permissions
    return this.getOrganizationRepositories(orgLogin)
  }

  /**
   * Get repository information from GitHub
   */
  async getRepository(owner: string, repo: string): Promise<Repository> {
    if (!this.client) {
      throw new Error('GitHub client not initialized. Access token required.')
    }

    const githubRepo = await this.client.getRepository(owner, repo)
    
    return {
      id: githubRepo.id.toString(),
      name: githubRepo.name,
      fullName: githubRepo.full_name,
      description: githubRepo.description || null,
      htmlUrl: githubRepo.html_url,
      defaultBranch: (githubRepo as any).default_branch || 'main',
      isPrivate: (githubRepo as any).private || false,
      isTracked: false,
      isArchived: (githubRepo as any).archived || false,
      language: (githubRepo as any).language || null,
      size: (githubRepo as any).size || 0,
      stargazersCount: (githubRepo as any).stargazers_count || 0,
      forksCount: (githubRepo as any).forks_count || 0,
      openIssuesCount: (githubRepo as any).open_issues_count || 0,
      organizationId: githubRepo.owner.id.toString(),
      createdAt: new Date((githubRepo as any).created_at || Date.now()),
      updatedAt: new Date((githubRepo as any).updated_at || Date.now()),
      pushedAt: (githubRepo as any).pushed_at ? new Date((githubRepo as any).pushed_at) : null
    }
  }

  /**
   * Get pull requests for a repository
   */
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
    if (!this.client) {
      throw new Error('GitHub client not initialized. Access token required.')
    }

    const state = options?.state || 'all'
    const githubPRs = await this.client.getAllPullRequests(owner, repo, state)
    
    return githubPRs.map(pr => this.mapGitHubPRToDomain(pr))
  }

  /**
   * Get pull request details from GitHub
   */
  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<PullRequest> {
    if (!this.client) {
      throw new Error('GitHub client not initialized. Access token required.')
    }

    const githubPR = await this.client.getPullRequest(owner, repo, pullNumber)
    return this.mapGitHubPRToDomain(githubPR)
  }

  /**
   * Get pull request reviews
   */
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
    if (!this.client) {
      throw new Error('GitHub client not initialized. Access token required.')
    }

    const reviews = await this.client.getPullRequestReviews(owner, repo, pullNumber)
    
    return reviews
      .filter(review => review.user) // Only include reviews with user data
      .map(review => ({
        id: review.id.toString(),
        user: {
          id: review.user!.id.toString(),
          login: review.user!.login,
          name: review.user!.name || review.user!.login,
          email: review.user!.email || null,
          avatarUrl: review.user!.avatar_url || '',
          htmlUrl: (review.user as any).html_url || `https://github.com/${review.user!.login}`,
          type: 'User' as const,
          isNewUser: false,
          hasGithubApp: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        state: this.mapReviewState(review.state),
        body: (review as any).body || '',
        submittedAt: new Date((review as any).submitted_at)
      }))
  }

  /**
   * Sync organization repositories from GitHub
   */
  async syncOrganizationRepositories(orgLogin: string): Promise<{
    synced: Repository[]
    errors: Array<{ repo: string; error: string }>
  }> {
    try {
      const repositories = await this.getOrganizationRepositories(orgLogin)
      
      // Store repositories in database
      const org = await findOrCreateOrganization({
        github_id: repositories[0] ? parseInt(repositories[0].id) : 0,
        name: orgLogin,
        avatar_url: '',
      })

      const synced: Repository[] = []
      const errors: Array<{ repo: string; error: string }> = []

      for (const repo of repositories) {
        try {
          await findOrCreateRepository({
            github_id: parseInt(repo.id),
            organization_id: org.id,
            name: repo.name,
            full_name: repo.fullName,
            description: repo.description,
            private: repo.isPrivate,
            is_tracked: false
          })
          synced.push(repo)
        } catch (error) {
          errors.push({
            repo: repo.fullName,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return { synced, errors }
    } catch (error) {
      return {
        synced: [],
        errors: [{ repo: orgLogin, error: error instanceof Error ? error.message : 'Unknown error' }]
      }
    }
  }

  /**
   * Sync repository pull requests from GitHub
   */
  async syncRepositoryPullRequests(
    repositoryId: string,
    since?: Date
  ): Promise<{
    synced: PullRequest[]
    errors: Array<{ pr: number; error: string }>
  }> {
    try {
      // Find repository in database
      const dbRepo = await findRepositoryById(parseInt(repositoryId))
      if (!dbRepo) {
        return {
          synced: [],
          errors: [{ pr: 0, error: `Repository ${repositoryId} not found` }]
        }
      }

      const [owner, repo] = dbRepo.full_name.split('/')
      if (!owner || !repo) {
        return {
          synced: [],
          errors: [{ pr: 0, error: 'Invalid repository full name format' }]
        }
      }

      let pullRequests = await this.getRepositoryPullRequests(owner, repo)
      
      // Filter by 'since' date if provided
      if (since) {
        pullRequests = pullRequests.filter(pr => new Date(pr.createdAt) >= since)
      }

      const synced: PullRequest[] = []
      const errors: Array<{ pr: number; error: string }> = []

      for (const pr of pullRequests) {
        try {
          const existingPR = await findPullRequestByNumber(parseInt(repositoryId), pr.number)
          
          if (existingPR) {
            // Update existing PR
            await updatePullRequest(existingPR.id, {
              title: pr.title,
              state: pr.status as 'open' | 'closed' | 'merged'
            })
          } else {
            // Create new PR
            const author = await findOrCreateUserByGitHubId({
              id: pr.developer.id.toString(),
              login: pr.developer.name, // Use name as login since domain only has name
              avatar_url: '',
              name: pr.developer.name
            })

            if (author) {
              await createPullRequest({
                github_id: parseInt(pr.id.toString()),
                repository_id: parseInt(repositoryId),
                number: pr.number,
                title: pr.title,
                description: null, // Domain entity doesn't have description
                author_id: author.id,
                state: pr.status as 'open' | 'closed' | 'merged',
                created_at: pr.createdAt,
                updated_at: pr.createdAt, // Use createdAt since domain has both as strings
                closed_at: null,
                merged_at: pr.status === 'merged' ? pr.mergedAt : null,
                draft: false,
                additions: pr.linesAdded || 0,
                deletions: 0,
                changed_files: pr.files || 0,
                category_id: null,
                category_confidence: null
              })
            }
          }
          
          synced.push(pr)
        } catch (error) {
          errors.push({
            pr: pr.number,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return { synced, errors }
    } catch (error) {
      return {
        synced: [],
        errors: [{ pr: 0, error: error instanceof Error ? error.message : 'Unknown error' }]
      }
    }
  }

  /**
   * Check GitHub App installation status
   */
  async getInstallationStatus(orgLogin: string): Promise<{
    isInstalled: boolean
    installationId: string | null
    permissions: Record<string, string>
  }> {
    try {
      // Find organization in database to get installation ID
      const org = await findOrCreateOrganization({
        github_id: 0,
        name: orgLogin,
        avatar_url: '',
      })

      const isInstalled = !!org.installation_id
      const installationId = org.installation_id?.toString() || null

      return {
        isInstalled,
        installationId,
        permissions: isInstalled ? {
          contents: 'read',
          pull_requests: 'read',
          metadata: 'read'
        } : {}
      }
    } catch (error) {
      console.error('Error checking installation status:', error)
      return {
        isInstalled: false,
        installationId: null,
        permissions: {}
      }
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    if (!signature || !secret) {
      return false
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')

    const expectedSignatureWithPrefix = `sha256=${expectedSignature}`

    // Use crypto.timingSafeEqual to prevent timing attacks
    if (signature.length !== expectedSignatureWithPrefix.length) {
      return false
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignatureWithPrefix, 'utf8')
    )
  }

  /**
   * Process GitHub webhook event
   */
  async processWebhookEvent(
    event: string,
    payload: any
  ): Promise<{
    processed: boolean
    actions: string[]
    errors?: string[]
  }> {
    const supportedEvents = ['pull_request', 'pull_request_review', 'installation', 'ping']
    
    if (!supportedEvents.includes(event)) {
      return {
        processed: false,
        actions: [],
        errors: [`Unsupported event type: ${event}`]
      }
    }

    const actions: string[] = []
    const errors: string[] = []

    try {
      switch (event) {
        case 'pull_request':
          await this.handlePullRequestWebhook(payload)
          actions.push(`Processed pull_request.${payload.action}`)
          break
          
        case 'pull_request_review':
          await this.handlePullRequestReviewWebhook(payload)
          actions.push(`Processed pull_request_review.${payload.action}`)
          break
          
        case 'installation':
          await this.handleInstallationWebhook(payload)
          actions.push(`Processed installation.${payload.action}`)
          break
          
        case 'ping':
          actions.push('Processed ping event')
          break
      }

      return {
        processed: true,
        actions,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        processed: false,
        actions,
        errors: [error instanceof Error ? error.message : 'Unknown webhook processing error']
      }
    }
  }

  /**
   * Handle pull request webhook events
   */
  private async handlePullRequestWebhook(payload: any): Promise<void> {
    const { action, repository, pull_request: pr } = payload

    console.log(`[Webhook] Processing PR #${pr.number} action=${action} repo=${repository.full_name}`)

    // Find repository in database
    const repoInDb = await findRepositoryByFullName(repository.full_name)
    if (!repoInDb) {
      console.log(`Repository ${repository.full_name} not tracked, skipping webhook`)
      return
    }

    // Map GitHub PR state to our state format
    const prState = pr.merged_at 
      ? 'merged' 
      : pr.state === 'closed' ? 'closed' : 'open'

    // Check if PR exists
    const existingPR = await findPullRequestByNumber(repoInDb.id, pr.number)

    if (existingPR) {
      // Update existing PR
      await updatePullRequest(existingPR.id, {
        title: pr.title,
        description: pr.body,
        state: prState,
        updated_at: pr.updated_at,
        closed_at: pr.closed_at,
        merged_at: pr.merged_at,
        draft: pr.draft,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files
      })

      console.log(`[Webhook] Updated PR #${pr.number} in ${repository.full_name}`)

      // Process AI categorization if action is 'opened'
      if (action === 'opened' && repoInDb.organization_id) {
        try {
          await this.fetchAdditionalPRData(repository, pr, existingPR.id, repoInDb.organization_id, payload)
        } catch (error) {
          console.error('[Webhook] Error in AI categorization for existing PR:', error)
        }
      }
    } else {
      // Create new PR
      console.log(`[Webhook] Creating new PR #${pr.number} in ${repository.full_name}`)

      const author = await findOrCreateUserByGitHubId({
        id: pr.user.id.toString(),
        login: pr.user.login,
        avatar_url: pr.user.avatar_url,
        name: pr.user.name || pr.user.login
      })

      if (!author) {
        console.error(`[Webhook] Could not create user for GitHub ID: ${pr.user.id}`)
        return
      }

      const newPR = await createPullRequest({
        github_id: pr.id,
        repository_id: repoInDb.id,
        number: pr.number,
        title: pr.title,
        description: pr.body,
        author_id: author.id,
        state: prState,
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
      })

      console.log(`[Webhook] Created PR #${pr.number} with DB ID ${newPR.id}`)

      // Process AI categorization if action is 'opened'
      if (action === 'opened' && repoInDb.organization_id) {
        try {
          await this.fetchAdditionalPRData(repository, pr, newPR.id, repoInDb.organization_id, payload)
        } catch (error) {
          console.error('[Webhook] Error in AI categorization for new PR:', error)
        }
      }
    }
  }

  /**
   * Handle pull request review webhook events
   */
  private async handlePullRequestReviewWebhook(payload: any): Promise<void> {
    const { repository, pull_request, review } = payload

    // Find repository and PR
    const repoInDb = await this.findRepositoryByFullName(repository.full_name)
    if (!repoInDb) return

    const existingPR = await findPullRequestByNumber(repoInDb.id, pull_request.number)
    if (!existingPR) return

    // Check if review exists
    const existingReview = await findReviewByGitHubId(review.id)
    const reviewState = this.mapReviewState(review.state) as 'approved' | 'changes_requested' | 'commented' | 'dismissed'

    if (existingReview) {
      // Update review (implementation depends on your updatePullRequestReview function)
      // await updatePullRequestReview(existingReview.id, { state: reviewState })
    } else {
      // Create new review
      await createPullRequestReview({
        github_id: review.id,
        pull_request_id: existingPR.id,
        reviewer_id: review.user.id.toString(),
        state: reviewState,
        submitted_at: review.submitted_at
      })
    }
  }

  /**
   * Handle installation webhook events
   */
  private async handleInstallationWebhook(payload: any): Promise<void> {
    const { action, installation, repositories } = payload
    const account = installation.account

    if (account.type !== 'Organization') {
      console.log(`[Webhook] Skipping installation event for non-organization: ${account.login}`)
      return
    }

    const orgGitHubId = account.id
    const orgLogin = account.login
    const installationId = installation.id
    const orgAvatarUrl = account.avatar_url || null

    console.log(`[Webhook] Installation ${action} for org ${orgLogin} (${orgGitHubId}), installation ID: ${installationId}`)

    try {
      // Find or create organization
      let org = await OrganizationRepository.findOrganizationByGitHubId(orgGitHubId)

      if (!org && action === 'created') {
        console.log(`[Webhook] Creating organization ${orgLogin}`)
        org = await OrganizationRepository.createOrganization({
          github_id: orgGitHubId,
          name: orgLogin,
          avatar_url: orgAvatarUrl
        })
        console.log(`[Webhook] Created organization ${orgLogin} with DB ID ${org.id}`)
      } else if (!org) {
        console.log(`[Webhook] Organization ${orgLogin} not found for action ${action}`)
        return
      }

      if (action === 'created') {
        // Update with installation ID
        const updatedOrg = await OrganizationRepository.updateOrganization(org.id, {
          installation_id: installationId,
          name: orgLogin,
          avatar_url: orgAvatarUrl
        })
        
        if (updatedOrg) {
          console.log(`[Webhook] Stored installation ID ${installationId} for org ${orgLogin}`)
        } else {
          console.error(`[Webhook] Failed to update org ${orgLogin} with installation ID`)
        }

        // Process repositories if provided in payload
        if (repositories && repositories.length > 0) {
          console.log(`[Webhook] Processing ${repositories.length} repositories for installation`)
          
          for (const repoData of repositories) {
            try {
              await findOrCreateRepository({
                github_id: repoData.id,
                name: repoData.name,
                full_name: repoData.full_name,
                private: repoData.private,
                organization_id: org.id,
                description: null,
                is_tracked: true
              })
              console.log(`[Webhook] Added repository ${repoData.full_name} to org ${org.id}`)
            } catch (repoError) {
              console.error(`[Webhook] Error adding repository ${repoData.full_name}:`, repoError)
            }
          }
        }
      } else if (action === 'deleted') {
        // Clear installation ID
        const updatedOrg = await OrganizationRepository.updateOrganization(org.id, {
          installation_id: null
        })
        
        if (updatedOrg) {
          console.log(`[Webhook] Cleared installation ID for org ${orgLogin}`)
        } else {
          console.error(`[Webhook] Failed to clear installation ID for org ${orgLogin}`)
        }
      } else if (action === 'suspend') {
        console.log(`[Webhook] App suspended for org ${orgLogin}`)
        await OrganizationRepository.updateOrganization(org.id, { installation_id: null })
      } else if (action === 'unsuspend') {
        console.log(`[Webhook] App unsuspended for org ${orgLogin}`)
        await OrganizationRepository.updateOrganization(org.id, { installation_id: installationId })
      } else {
        console.log(`[Webhook] Unhandled installation action: ${action}`)
      }
    } catch (error) {
      console.error(`[Webhook] Error handling installation event:`, error)
      throw error
    }
  }

  /**
   * Fetch additional PR data including AI categorization
   */
  private async fetchAdditionalPRData(
    repository: any, 
    pr: any, 
    prDbId: number,
    organizationId: number,
    fullPayload?: any
  ): Promise<void> {
    console.log(`[Webhook] Fetching additional data for PR #${pr.number} in org ${organizationId}`)

    try {
      // Get organization details to find installation ID
      const orgDetails = await findOrganizationById(organizationId)
      if (!orgDetails) {
        console.error(`[Webhook] Organization ${organizationId} not found`)
        await PullRequestRepository.updatePullRequest(prDbId, { 
          ai_status: 'error', 
          error_message: 'Organization not found' 
        })
        return
      }

      let installationId = orgDetails.installation_id
      
      // Fallback to payload installation ID if not in DB
      if (!installationId) {
        installationId = fullPayload?.installation?.id || repository?.installation?.id
      }

      if (!installationId) {
        console.warn(`[Webhook] No installation ID for org ${organizationId}`)
        await PullRequestRepository.updatePullRequest(prDbId, { 
          ai_status: 'skipped', 
          error_message: 'No GitHub App installation' 
        })
        return
      }

      // Get AI settings
      const aiSettings = await getOrganizationAiSettings(organizationId)
      const selectedModelId = aiSettings.selectedModelId
      
      if (!selectedModelId || selectedModelId === '__none__') {
        console.log(`[Webhook] AI categorization disabled for org ${organizationId}`)
        await PullRequestRepository.updatePullRequest(prDbId, { 
          ai_status: 'skipped', 
          error_message: 'AI categorization disabled' 
        })
        return
      }

      const provider = aiSettings.provider
      if (!provider) {
        console.log(`[Webhook] AI provider not set for org ${organizationId}`)
        await PullRequestRepository.updatePullRequest(prDbId, { 
          ai_status: 'skipped', 
          error_message: 'AI provider not set' 
        })
        return
      }

      const apiKey = await getOrganizationApiKey(organizationId, provider)
      if (!apiKey) {
        console.warn(`[Webhook] API key for ${provider} not set for org ${organizationId}`)
        await PullRequestRepository.updatePullRequest(prDbId, { 
          ai_status: 'skipped', 
          error_message: `API key for ${provider} not set` 
        })
        return
      }

      // Create AI client
      let aiClientProvider
      switch (provider) {
        case 'openai':
          aiClientProvider = createOpenAI({ apiKey })
          break
        case 'google':
          aiClientProvider = createGoogleGenerativeAI({ apiKey })
          break
        case 'anthropic':
          aiClientProvider = createAnthropic({ apiKey })
          break
        default:
          console.error(`[Webhook] Unsupported AI provider: ${provider}`)
          await PullRequestRepository.updatePullRequest(prDbId, { 
            ai_status: 'error', 
            error_message: `Unsupported AI provider: ${provider}` 
          })
          return
      }

      const modelInstance = aiClientProvider(selectedModelId)
      if (!modelInstance) {
        console.error(`[Webhook] Could not get model instance for ${selectedModelId}`)
        await PullRequestRepository.updatePullRequest(prDbId, { 
          ai_status: 'error', 
          error_message: `Could not get AI model instance ${selectedModelId}` 
        })
        return
      }

      // Create GitHub client with installation
      let githubClient: GitHubClient
      try {
        githubClient = await createInstallationClient(installationId)
        console.log(`[Webhook] Created GitHub client with installation ID ${installationId}`)
      } catch (error) {
        console.error(`[Webhook] Failed to create GitHub client:`, error)
        await PullRequestRepository.updatePullRequest(prDbId, { 
          ai_status: 'error', 
          error_message: 'Failed to create GitHub client' 
        })
        return
      }

      // Fetch PR diff
      let diff: string
      try {
        diff = await githubClient.getPullRequestDiff(repository.owner.login, repository.name, pr.number)
      } catch (error: any) {
        if (error.message?.includes('expired') || error.message?.includes('invalid') || error.status === 401) {
          console.warn(`[Webhook] Token expired, retrying with fresh client`)
          try {
            githubClient = await createInstallationClient(installationId)
            diff = await githubClient.getPullRequestDiff(repository.owner.login, repository.name, pr.number)
          } catch (retryError) {
            console.error(`[Webhook] Failed to fetch PR diff after retry:`, retryError)
            await PullRequestRepository.updatePullRequest(prDbId, { 
              ai_status: 'error', 
              error_message: 'Failed to fetch PR diff' 
            })
            return
          }
        } else {
          console.error(`[Webhook] Failed to fetch PR diff:`, error)
          await PullRequestRepository.updatePullRequest(prDbId, { 
            ai_status: 'error', 
            error_message: 'Failed to fetch PR diff' 
          })
          return
        }
      }

      if (!diff) {
        console.warn(`[Webhook] Empty PR diff for ${repository.full_name}#${pr.number}`)
        await PullRequestRepository.updatePullRequest(prDbId, { 
          ai_status: 'skipped', 
          error_message: 'Empty PR diff' 
        })
        return
      }

      // Get organization categories
      const orgCategories = await getOrganizationCategories(organizationId)
      const categoryNames = orgCategories.map(c => c.name)
      
      if (categoryNames.length === 0) {
        console.warn(`[Webhook] No categories for org ${organizationId}`)
        await PullRequestRepository.updatePullRequest(prDbId, { 
          ai_status: 'skipped', 
          error_message: 'No categories configured' 
        })
        return
      }

      // Update PR status to processing
      await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'processing' })

      // Generate AI categorization
      const systemPrompt = `You are an expert at categorizing GitHub pull requests. Analyze the pull request title, body, and diff. Respond with the most relevant category from the provided list and a confidence score (0-1). Available categories: ${categoryNames.join(', ')}. Respond in the format: Category: [Selected Category], Confidence: [Score]. Example: Category: Bug Fix, Confidence: 0.9`
      
      const userPrompt = `Title: ${pr.title}
Body: ${pr.body || ''}
Diff:
${diff}`

      try {
        const { text } = await generateText({
          model: modelInstance,
          system: systemPrompt,
          prompt: userPrompt,
        })

        console.log(`[Webhook] AI Response for PR #${pr.number}: ${text}`)

        // Parse AI response
        const categoryMatch = text.match(/Category: (.*?), Confidence: (\d\.?\d*)/i)
        if (categoryMatch && categoryMatch[1] && categoryMatch[2]) {
          const categoryName = categoryMatch[1].trim()
          const confidence = parseFloat(categoryMatch[2])

          const category = await findCategoryByNameAndOrg(organizationId, categoryName)
          if (category) {
            await updatePullRequestCategory(prDbId, category.id, confidence)
            await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'completed' })
            console.log(`[Webhook] PR #${pr.number} categorized as '${categoryName}' with confidence ${confidence}`)
          } else {
            console.warn(`[Webhook] AI suggested category '${categoryName}' not found`)
            await PullRequestRepository.updatePullRequest(prDbId, { 
              ai_status: 'error', 
              error_message: `AI suggested category '${categoryName}' not found` 
            })
          }
        } else {
          console.warn(`[Webhook] Could not parse AI response: ${text}`)
          await PullRequestRepository.updatePullRequest(prDbId, { 
            ai_status: 'error', 
            error_message: 'Could not parse AI response' 
          })
        }
      } catch (aiError) {
        console.error('[Webhook] AI text generation failed:', aiError)
        await PullRequestRepository.updatePullRequest(prDbId, { 
          ai_status: 'error', 
          error_message: 'AI text generation failed' 
        })
      }
    } catch (error) {
      console.error('[Webhook] Error in fetchAdditionalPRData:', error)
      await PullRequestRepository.updatePullRequest(prDbId, { 
        ai_status: 'error', 
        error_message: 'Critical error in AI processing' 
      })
    }
  }

  /**
   * Helper methods
   */
  private mapGitHubPRToDomain(githubPR: any): PullRequest {
    const state = githubPR.merged_at 
      ? 'merged' 
      : githubPR.state === 'closed' ? 'closed' : 'open'

    const createdAt = new Date(githubPR.created_at || Date.now())
    const mergedAt = githubPR.merged_at ? new Date(githubPR.merged_at) : null
    const cycleTime = mergedAt ? Math.round((mergedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) : 0 // hours

    return {
      id: githubPR.id.toString(),
      number: githubPR.number,
      title: githubPR.title,
      developer: {
        id: githubPR.user.id.toString(),
        name: githubPR.user.name || githubPR.user.login
      },
      repository: {
        id: githubPR.base?.repo?.id?.toString() || '',
        name: githubPR.base?.repo?.name || ''
      },
      status: state,
      createdAt: createdAt.toISOString(),
      mergedAt: mergedAt ? mergedAt.toISOString() : createdAt.toISOString(), // fallback to createdAt for domain compatibility
      cycleTime,
      investmentArea: undefined, // To be determined by AI categorization
      linesAdded: githubPR.additions || 0,
      files: githubPR.changed_files || 0
    }
  }

  private mapReviewState(state: string): 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' {
    switch (state.toLowerCase()) {
      case 'approved':
        return 'APPROVED'
      case 'changes_requested':
        return 'CHANGES_REQUESTED'
      default:
        return 'COMMENTED'
    }
  }

  private async findRepositoryByFullName(fullName: string): Promise<any> {
    try {
      return await findRepositoryByFullName && await findRepositoryByFullName(fullName)
    } catch (error) {
      return null
    }
  }

  private async findOrganizationByGitHubId(githubId: number): Promise<any> {
    try {
      return await findOrganizationById && await findOrganizationById(githubId)
    } catch (error) {
      return null
    }
  }
}
