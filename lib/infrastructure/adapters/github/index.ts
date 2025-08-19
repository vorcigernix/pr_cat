/**
 * GitHub Adapters Index
 * Exports all GitHub API adapter implementations
 */

export { SimpleGitHubAPIService } from './simple-github.adapter'
export { RealGitHubAPIService } from './real-github.adapter'
export { GitHubAppService } from './github-app.adapter'

// Export the appropriate services based on environment
export { RealGitHubAPIService as GitHubAPIService } from './real-github.adapter'
export { GitHubAppService as GitHubApp } from './github-app.adapter'
