/**
 * GitHub App Service Adapter
 * Implements IGitHubAppService using GitHub App authentication
 */

import jwt from 'jsonwebtoken'
import { IGitHubAppService, InstallationInfo } from '../../../core/ports/github-app.port'
import { Organization } from '../../../core/domain/entities/organization'
import { Repository } from '../../../core/domain/entities/repository'
import { GitHubClient } from '../../../github'
import { syncRepositoryPage } from './organization-sync'
import { mapDbOrganizationToDomain } from '../turso/mappers'
import * as OrganizationRepository from '../../../repositories/organization-repository'

// Token cache to store installation tokens with expiration times
interface CachedToken {
  token: string
  expiresAt: number // Unix timestamp in ms when token expires
  permissions: Record<string, string>
}

interface GitHubInstallationAccount {
  id: number
  login: string
  type: 'Organization' | 'User'
  avatar_url?: string | null
}

interface GitHubAppInstallationPayload {
  id: number
  account: GitHubInstallationAccount | null
  permissions?: Record<string, string>
  repository_selection?: 'all' | 'selected'
  repository_count?: number | null
  suspended_at?: string | null
  created_at: string
  updated_at: string
}


// In-memory cache for installation tokens
// In production, consider using Redis for distributed caching
const tokenCache: Map<number, CachedToken> = new Map()

export class GitHubAppService implements IGitHubAppService {

  /**
   * Generate a JWT token for GitHub App authentication
   */
  async generateAppJWT(): Promise<string> {
    const appId = process.env.GITHUB_APP_ID
    
    if (!appId) {
      throw new Error('GitHub App ID (GITHUB_APP_ID) is not configured')
    }

    // Get private key from environment
    let privateKey = process.env.GITHUB_APP_PRIVATE_KEY
    
    if (!privateKey) {
      throw new Error('GitHub App private key (GITHUB_APP_PRIVATE_KEY) is not configured')
    }

    // Clean up the private key format
    privateKey = privateKey.replace(/^["']|["']$/g, '') // Remove quotes
    privateKey = privateKey.replace(/\\n/g, '\n') // Replace escaped newlines
    
    // JWT expiration (10 minutes maximum per GitHub requirements)
    const now = Math.floor(Date.now() / 1000)
    
    const payload = {
      iat: now - 60, // Issued at time, 60 seconds in the past for clock drift
      exp: now + (10 * 60), // Expiration time (10 minutes from now)
      iss: appId // GitHub App ID
    }

    try {
      return jwt.sign(payload, privateKey, { algorithm: 'RS256' })
    } catch (error) {
      console.error('Error generating GitHub App JWT:', error)
      throw new Error('Failed to generate GitHub App JWT: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  /**
   * Get an installation access token for a specific installation ID
   */
  async getInstallationToken(installationId: number): Promise<string> {
    try {
      // Check for cached token
      const cachedToken = tokenCache.get(installationId)
      const bufferTimeMs = 5 * 60 * 1000 // 5 minute buffer before expiration
      const now = Date.now()
      
      // Use cached token if valid and not expiring soon
      if (cachedToken && (cachedToken.expiresAt - now > bufferTimeMs)) {
        console.log(`[GitHubApp] Using cached token for installation ${installationId}, expires in ${Math.floor((cachedToken.expiresAt - now) / 1000 / 60)} minutes`)
        return cachedToken.token
      }

      // Generate new token
      console.log(`[GitHubApp] Generating new token for installation ${installationId}`)
      
      const appJwt = await this.generateAppJWT()
      const appClient = new GitHubClient(appJwt)
      
      // Exchange JWT for installation token
      const token = await appClient.createInstallationAccessToken(installationId)
      
      // Cache token with expiration (GitHub tokens expire in 1 hour)
      const expiresAt = now + (60 * 60 * 1000)
      tokenCache.set(installationId, {
        token,
        expiresAt,
        permissions: {} // TODO: Get actual permissions from installation
      })
      
      console.log(`[GitHubApp] Generated and cached new token for installation ${installationId}`)
      return token
    } catch (error) {
      console.error(`[GitHubApp] Error getting installation token for ${installationId}:`, error)
      throw new Error('Failed to get installation token: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  /**
   * Get installation information for a specific installation ID
   */
  async getInstallation(installationId: number): Promise<InstallationInfo> {
    try {
      const appJwt = await this.generateAppJWT()
      const appClient = new GitHubClient(appJwt)
      
      // Get installation details  
      const response = await appClient.octokitClient.apps.getInstallation({
        installation_id: installationId
      })
      
      const installation = response.data

      return this.mapInstallationToInfo(installation as unknown as GitHubAppInstallationPayload)
    } catch (error) {
      console.error(`[GitHubApp] Error getting installation ${installationId}:`, error)
      throw new Error('Failed to get installation: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  /**
   * List all installations for the GitHub App
   */
  async listInstallations(): Promise<InstallationInfo[]> {
    try {
      const appJwt = await this.generateAppJWT()
      const appClient = new GitHubClient(appJwt)
      
      const response = await appClient.octokitClient.apps.listInstallations()
      
      return response.data.map(installation =>
        this.mapInstallationToInfo(installation as unknown as GitHubAppInstallationPayload)
      )
    } catch (error) {
      console.error('[GitHubApp] Error listing installations:', error)
      throw new Error('Failed to list installations: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  /**
   * Get installation for a specific organization by GitHub ID
   */
  async getOrganizationInstallation(orgGitHubId: number): Promise<InstallationInfo | null> {
    try {
      const installations = await this.listInstallations()
      return installations.find(installation => 
        installation.account.id === orgGitHubId && 
        installation.account.type === 'Organization'
      ) || null
    } catch (error) {
      console.error(`[GitHubApp] Error getting organization installation for ${orgGitHubId}:`, error)
      return null
    }
  }

  /**
   * Get repositories accessible by an installation
   */
  async getInstallationRepositories(installationId: number, page = 1): Promise<Repository[]> {
    try {
      const token = await this.getInstallationToken(installationId)
      const client = new GitHubClient(token, installationId)
      
      const response = await client.octokitClient.apps.listReposAccessibleToInstallation({ page, per_page: 100 })
      
      return response.data.repositories.map(repo => ({
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || null,
        htmlUrl: repo.html_url,
        defaultBranch: repo.default_branch || 'main',
        isPrivate: repo.private,
        isTracked: false,
        isArchived: repo.archived || false,
        language: repo.language || null,
        size: repo.size || 0,
        stargazersCount: repo.stargazers_count || 0,
        forksCount: repo.forks_count || 0,
        openIssuesCount: repo.open_issues_count || 0,
        organizationId: repo.owner.id.toString(),
        createdAt: new Date(repo.created_at || Date.now()),
        updatedAt: new Date(repo.updated_at || Date.now()),
        pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null
      }))
    } catch (error) {
      console.error(`[GitHubApp] Error getting installation repositories for ${installationId}:`, error)
      throw new Error('Failed to get installation repositories: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  /**
   * Check if GitHub App is installed for an organization
   */
  async isInstalledForOrganization(orgLogin: string): Promise<{
    isInstalled: boolean
    installationId?: number
    permissions?: Record<string, string>
  }> {
    try {
      const installations = await this.listInstallations()
      const installation = installations.find(inst => 
        inst.account.login === orgLogin && 
        inst.account.type === 'Organization'
      )

      if (installation) {
        return {
          isInstalled: true,
          installationId: installation.id,
          permissions: installation.permissions
        }
      }

      return { isInstalled: false }
    } catch (error) {
      console.error(`[GitHubApp] Error checking installation for org ${orgLogin}:`, error)
      return { isInstalled: false }
    }
  }

  /**
   * Sync installation data with database
   */
  async syncInstallation(installationId: number): Promise<{
    organization: Organization
    repositories: Repository[]
    errors: string[]
  }> {
    const errors: string[] = []
    
    try {
      // Get installation info
      const installation = await this.getInstallation(installationId)
      
      if (installation.account.type !== 'Organization') {
        throw new Error('Only organization installations are supported')
      }

      console.log(`[GitHubApp] Syncing installation ${installationId} for org ${installation.account.login}`)

      // Create or update organization in database
      let organization: Organization
      try {
        const dbOrg = await OrganizationRepository.findOrganizationByGitHubId(installation.account.id)
        
        if (dbOrg) {
          // Update existing organization
          const updatedOrg = await OrganizationRepository.updateOrganization(dbOrg.id, {
            installation_id: installationId,
            name: installation.account.login,
            avatar_url: installation.account.avatarUrl || null
          })
          organization = mapDbOrganizationToDomain(updatedOrg!)
        } else {
          // Create new organization
          const newOrg = await OrganizationRepository.createOrganization({
            github_id: installation.account.id,
            name: installation.account.login,
            avatar_url: installation.account.avatarUrl || null,
            installation_id: installationId
          })
          organization = mapDbOrganizationToDomain(newOrg)
        }
      } catch (error) {
        const errorMsg = `Failed to sync organization: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        throw new Error(errorMsg)
      }

      // Get and sync repositories
      const repositories: Repository[] = []
      try {
        for (let page = 1; ; page++) {
          const installationRepos = await this.getInstallationRepositories(installationId, page)
          await syncRepositoryPage(Number(organization.id), installationRepos.map(repo => ({
            id: Number(repo.id), name: repo.name, full_name: repo.fullName,
            description: repo.description ?? undefined, private: repo.isPrivate
          })))
          repositories.push(...installationRepos)
          if (installationRepos.length < 100) break
        }
      } catch (error) {
        const errorMsg = `Failed to get installation repositories: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(`[GitHubApp] ${errorMsg}`)
      }

      console.log(`[GitHubApp] Synced installation ${installationId}: org=${organization.name}, repos=${repositories.length}, errors=${errors.length}`)
      
      return {
        organization,
        repositories,
        errors
      }
    } catch (error) {
      const errorMsg = `Failed to sync installation ${installationId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(`[GitHubApp] ${errorMsg}`)
      throw new Error(errorMsg)
    }
  }

  /**
   * Clear cached tokens for an installation
   */
  async clearTokenCache(installationId?: number): Promise<void> {
    if (installationId) {
      tokenCache.delete(installationId)
      console.log(`[GitHubApp] Cleared token cache for installation ${installationId}`)
    } else {
      tokenCache.clear()
      console.log('[GitHubApp] Cleared all installation tokens from cache')
    }
  }

  /**
   * Validate if the GitHub App is properly configured
   */
  async validateConfiguration(): Promise<{
    isValid: boolean
    errors: string[]
    appId?: string
    hasPrivateKey: boolean
  }> {
    const errors: string[] = []
    const appId = process.env.GITHUB_APP_ID
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY

    if (!appId) {
      errors.push('GITHUB_APP_ID environment variable is not set')
    }

    if (!privateKey) {
      errors.push('GITHUB_APP_PRIVATE_KEY environment variable is not set')
    } else {
      // Validate private key format
      try {
        await this.generateAppJWT()
      } catch {
        errors.push('Invalid GitHub App private key format')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      appId: appId || undefined,
      hasPrivateKey: !!privateKey
    }
  }

  private mapInstallationToInfo(installation: GitHubAppInstallationPayload): InstallationInfo {
    const account = installation.account
    if (!account) {
      throw new Error('Installation account payload is missing')
    }

    return {
      id: installation.id,
      account: {
        id: account.id,
        login: account.login,
        type: account.type,
        avatarUrl: account.avatar_url || undefined
      },
      permissions: installation.permissions || {},
      repositorySelection: installation.repository_selection || 'all',
      repositoryCount: installation.repository_count || undefined,
      suspendedAt: installation.suspended_at ? new Date(installation.suspended_at) : null,
      createdAt: new Date(installation.created_at),
      updatedAt: new Date(installation.updated_at)
    }
  }
}

/**
 * Legacy compatibility functions - these wrap the new service
 */

let githubAppService: GitHubAppService | null = null

function getGitHubAppService(): GitHubAppService {
  if (!githubAppService) {
    githubAppService = new GitHubAppService()
  }
  return githubAppService
}

export async function generateAppJwt(): Promise<string> {
  return getGitHubAppService().generateAppJWT()
}

export async function getInstallationToken(installationId: number): Promise<string> {
  return getGitHubAppService().getInstallationToken(installationId)
}

export async function createInstallationClient(installationId: number): Promise<GitHubClient> {
  const token = await getInstallationToken(installationId)
  return new GitHubClient(token, installationId)
}

export function clearTokenFromCache(installationId: number): void {
  getGitHubAppService().clearTokenCache(installationId)
}

export function clearTokenCache(): void {
  getGitHubAppService().clearTokenCache()
}
