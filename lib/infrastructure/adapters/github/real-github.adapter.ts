/**
 * Real GitHub API Service Adapter
 * Implements IGitHubService using actual GitHub API calls via Octokit
 */

import { syncRepositoryPullRequests, savePullRequestReviews } from './pull-request-sync'
import { syncOrganizationRepositories } from './organization-sync'
import { query } from '@/lib/db'
import type { Organization as StoredOrganization } from '@/lib/types'
import type { PullRequestSyncResult, RepositorySyncResult } from '../../../core/ports/github.port'
import { IGitHubService } from '../../../core/ports'
import { Organization, Repository, PullRequest, User } from '../../../core/domain/entities'
import { GitHubClient, createGitHubClient } from '../../../github'
import { createInstallationClient } from '../../../github-app'
import type { GitHubPullRequest, GitHubRepository, GitHubUser } from '../../../types'
import crypto from 'crypto'
import { 
  findOrCreateOrganization, 
  findOrCreateRepository,
  createPullRequest,
  findPullRequestByNumber,
  updatePullRequest,
  findRepositoryById,
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
import { createGoogle } from '@ai-sdk/google'
import { createAnthropic } from '@ai-sdk/anthropic'

type GitHubRepositoryOwnerWithAvatar = GitHubRepository['owner'] & {
  avatar_url?: string
}

interface GitHubRepositoryDetails extends GitHubRepository {
  archived?: boolean
  size?: number
  stargazers_count?: number
  forks_count?: number
  open_issues_count?: number
  owner: GitHubRepositoryOwnerWithAvatar
}

interface GitHubPullRequestWithRepo extends GitHubPullRequest {
  base: GitHubPullRequest['base'] & {
    repo?: {
      id: number
      name: string
    }
  }
}

interface GitHubPullRequestReviewPayload {
  id: number
  user: GitHubUser | null
  state: string
  body?: string | null
  submitted_at: string
}

interface WebhookRepositoryPayload {
  id: number
  name: string
  full_name: string
  private: boolean
  owner: {
    id: number
    login: string
    avatar_url?: string
    name?: string
  }
  installation?: {
    id: number
  }
}

interface WebhookPullRequestPayload extends GitHubPullRequestWithRepo {
  body?: string
  user: GitHubUser
}

interface PullRequestWebhookPayload {
  action: string
  repository: WebhookRepositoryPayload
  pull_request: WebhookPullRequestPayload
  installation?: {
    id: number
  }
}

interface PullRequestReviewWebhookPayload extends PullRequestWebhookPayload {
  review: GitHubPullRequestReviewPayload
}

interface InstallationWebhookPayload {
  action: string
  installation: {
    id: number
    account: {
      id: number
      login: string
      type: string
      avatar_url?: string | null
    }
  }
  repositories?: Array<{
    id: number
    name: string
    full_name: string
    private: boolean
  }>
}

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

    const owner = firstRepo.owner as GitHubRepositoryOwnerWithAvatar
    return {
      id: owner.id.toString(),
      login: owner.login,
      name: owner.login, // Owner type doesn't have name property
      description: null,
      avatarUrl: owner.avatar_url || '',
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

    const githubRepos = await this.client.getOrganizationRepositories(orgLogin, options?.page ?? 1)
    
    return githubRepos.map(repo => {
      const repository = repo as GitHubRepositoryDetails
      return {
      id: repository.id.toString(),
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description || null,
      htmlUrl: repository.html_url,
      defaultBranch: repository.default_branch || 'main',
      isPrivate: repository.private || false,
      isTracked: false,
      isArchived: repository.archived || false,
      language: repository.language || null,
      size: repository.size || 0,
      stargazersCount: repository.stargazers_count || 0,
      forksCount: repository.forks_count || 0,
      openIssuesCount: repository.open_issues_count || 0,
      organizationId: repository.owner.id.toString(),
      createdAt: new Date(repository.created_at || Date.now()),
      updatedAt: new Date(repository.updated_at || Date.now()),
      pushedAt: repository.pushed_at ? new Date(repository.pushed_at) : null
      }
    })
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

    const githubRepo = await this.client.getRepository(owner, repo) as GitHubRepositoryDetails
    
    return {
      id: githubRepo.id.toString(),
      name: githubRepo.name,
      fullName: githubRepo.full_name,
      description: githubRepo.description || null,
      htmlUrl: githubRepo.html_url,
      defaultBranch: githubRepo.default_branch || 'main',
      isPrivate: githubRepo.private || false,
      isTracked: false,
      isArchived: githubRepo.archived || false,
      language: githubRepo.language || null,
      size: githubRepo.size || 0,
      stargazersCount: githubRepo.stargazers_count || 0,
      forksCount: githubRepo.forks_count || 0,
      openIssuesCount: githubRepo.open_issues_count || 0,
      organizationId: githubRepo.owner.id.toString(),
      createdAt: new Date(githubRepo.created_at || Date.now()),
      updatedAt: new Date(githubRepo.updated_at || Date.now()),
      pushedAt: githubRepo.pushed_at ? new Date(githubRepo.pushed_at) : null
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

    const reviews = await this.client.getPullRequestReviews(owner, repo, pullNumber) as GitHubPullRequestReviewPayload[]
    
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
          htmlUrl: review.user!.html_url || `https://github.com/${review.user!.login}`,
          type: 'User' as const,
          isNewUser: false,
          hasGithubApp: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        state: this.mapReviewState(review.state),
        body: review.body || '',
        submittedAt: new Date(review.submitted_at)
      }))
  }

  /**
   * Sync organization repositories from GitHub
   */
  async syncOrganizationRepositories(orgLogin: string): Promise<RepositorySyncResult> {
    try {
      const organizations = await query<StoredOrganization>('SELECT * FROM organizations WHERE name = ? COLLATE NOCASE', [orgLogin]);
      const organization = organizations[0];
      if (!organization) throw new Error('Organization not found; synchronize membership first');
      const client = this.client ?? (organization.installation_id ? await createInstallationClient(organization.installation_id) : undefined);
      if (!client) throw new Error('No GitHub client available; install the GitHub App or sign in again');
      return syncOrganizationRepositories(client, orgLogin, organization.id);
    } catch (error) {
      return { processed: 0, created: 0, updated: 0, unchanged: 0,
        errors: [{ repo: orgLogin, error: error instanceof Error ? error.message : String(error) }] };
    }
  }

  /**
   * Sync repository pull requests from GitHub
   */
  async syncRepositoryPullRequests(repositoryId: string, since?: Date): Promise<PullRequestSyncResult> {
    const empty: PullRequestSyncResult = { processed: 0, created: 0, updated: 0, unchanged: 0, errors: [] };
    try {
      const repository = await findRepositoryById(Number(repositoryId));
      if (!repository) throw new Error('Repository not found');
      const [owner, repo] = repository.full_name.split('/');
      if (!owner || !repo) throw new Error('Invalid repository full name');
      const organization = repository.organization_id === null ? null : await findOrganizationById(repository.organization_id);
      const client = this.client ?? (organization?.installation_id
        ? await createInstallationClient(organization.installation_id) : undefined);
      if (!client) throw new Error('GitHub access token or installation required');
      return syncRepositoryPullRequests(client, repository.id, owner, repo, since);
    } catch (error) {
      return { ...empty, errors: [{ pr: 0, error: error instanceof Error ? error.message : String(error) }] };
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
    payload: unknown
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
          await this.handlePullRequestWebhook(payload as PullRequestWebhookPayload)
          actions.push(`Processed pull_request.${this.getWebhookAction(payload)}`)
          break
          
        case 'pull_request_review':
          await this.handlePullRequestReviewWebhook(payload as PullRequestReviewWebhookPayload)
          actions.push(`Processed pull_request_review.${this.getWebhookAction(payload)}`)
          break
          
        case 'installation':
          await this.handleInstallationWebhook(payload as InstallationWebhookPayload)
          actions.push(`Processed installation.${this.getWebhookAction(payload)}`)
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
  private async handlePullRequestWebhook(payload: PullRequestWebhookPayload): Promise<void> {
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
        description: pr.body ?? null,
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
        description: pr.body ?? null,
        author_id: author.id,
        state: prState,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        closed_at: pr.closed_at,
        merged_at: pr.merged_at,
        draft: pr.draft,
        additions: pr.additions ?? null,
        deletions: pr.deletions ?? null,
        changed_files: pr.changed_files ?? null,
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
  private async handlePullRequestReviewWebhook(payload: PullRequestReviewWebhookPayload): Promise<void> {
    const { repository, pull_request, review } = payload

    // Find repository and PR
    const repoInDb = await findRepositoryByFullName(repository.full_name)
    if (!repoInDb) return

    const existingPR = await findPullRequestByNumber(repoInDb.id, pull_request.number)
    if (!existingPR) return

    await savePullRequestReviews(existingPR.id, [review])
  }

  /**
   * Handle installation webhook events
   */
  private async handleInstallationWebhook(payload: InstallationWebhookPayload): Promise<void> {
    const { action, installation, repositories } = payload
    const account = installation.account

    if (account.type !== 'Organization') {
      console.log(`[Webhook] Skipping installation event for non-organization: ${account.login}`)
      return
    }

    const orgGitHubId = account.id
    const orgLogin = account.login
    const installationId = installation.id
    const orgAvatarUrl: string | null = account.avatar_url ?? null

    console.log(`[Webhook] Installation ${action} for org ${orgLogin} (${orgGitHubId}), installation ID: ${installationId}`)

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
  }

  /**
   * Fetch additional PR data including AI categorization
   */
  private async fetchAdditionalPRData(
    repository: WebhookRepositoryPayload, 
    pr: WebhookPullRequestPayload, 
    prDbId: number,
    organizationId: number,
    fullPayload?: PullRequestWebhookPayload
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
          aiClientProvider = createGoogle({ apiKey })
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
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : ''
        const status = typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof (error as { status?: unknown }).status === 'number'
          ? (error as { status: number }).status
          : undefined
        if (message.includes('expired') || message.includes('invalid') || status === 401) {
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
          instructions: systemPrompt,
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
  private mapGitHubPRToDomain(githubPR: GitHubPullRequestWithRepo): PullRequest {
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

  private getWebhookAction(payload: unknown): string {
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'action' in payload &&
      typeof (payload as { action?: unknown }).action === 'string'
    ) {
      return (payload as { action: string }).action
    }
    return 'unknown'
  }
}
