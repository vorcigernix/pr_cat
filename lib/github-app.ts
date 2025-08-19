/**
 * GitHub App Legacy API
 * Backward compatibility layer for existing GitHub App functionality
 * 
 * @deprecated Use the new GitHubAppService from DI container instead:
 * const githubAppService = await getService<IGitHubAppService>('GitHubAppService')
 */

// Re-export functions from the new adapter for backward compatibility
export { 
  generateAppJwt,
  getInstallationToken,
  createInstallationClient,
  clearTokenFromCache,
  clearTokenCache
} from './infrastructure/adapters/github/github-app.adapter'

// Legacy type exports for backward compatibility
export interface CachedToken {
  token: string
  expiresAt: number // Unix timestamp in ms when token expires
}