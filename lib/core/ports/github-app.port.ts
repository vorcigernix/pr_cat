/**
 * GitHub App Service Port
 * Defines the contract for GitHub App operations
 */

import { Organization } from '../domain/entities/organization'
import { Repository } from '../domain/entities/repository'

export interface InstallationInfo {
  id: number
  account: {
    id: number
    login: string
    type: 'Organization' | 'User'
    avatarUrl?: string
  }
  permissions: Record<string, string>
  repositorySelection: 'all' | 'selected'
  repositoryCount?: number
  suspendedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface InstallationToken {
  token: string
  expiresAt: Date
  permissions: Record<string, string>
}

export interface IGitHubAppService {
  /**
   * Generate a JWT token for GitHub App authentication
   */
  generateAppJWT(): Promise<string>

  /**
   * Get an installation access token for a specific installation ID
   * This method handles caching and automatic refresh
   */
  getInstallationToken(installationId: number): Promise<string>

  /**
   * Get installation information for a specific installation ID
   */
  getInstallation(installationId: number): Promise<InstallationInfo>

  /**
   * List all installations for the GitHub App
   */
  listInstallations(): Promise<InstallationInfo[]>

  /**
   * Get installation for a specific organization by GitHub ID
   */
  getOrganizationInstallation(orgGitHubId: number): Promise<InstallationInfo | null>

  /**
   * Get repositories accessible by an installation
   */
  getInstallationRepositories(installationId: number): Promise<Repository[]>

  /**
   * Check if GitHub App is installed for an organization
   */
  isInstalledForOrganization(orgLogin: string): Promise<{
    isInstalled: boolean
    installationId?: number
    permissions?: Record<string, string>
  }>

  /**
   * Sync installation data with database
   */
  syncInstallation(installationId: number): Promise<{
    organization: Organization
    repositories: Repository[]
    errors: string[]
  }>

  /**
   * Clear cached tokens for an installation (useful when tokens are revoked)
   */
  clearTokenCache(installationId?: number): Promise<void>

  /**
   * Validate if the GitHub App is properly configured
   */
  validateConfiguration(): Promise<{
    isValid: boolean
    errors: string[]
    appId?: string
    hasPrivateKey: boolean
  }>
}
