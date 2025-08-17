/**
 * Infrastructure Layer Index
 * Exports all adapters and infrastructure components
 */

// Demo adapters
export { DemoPullRequestRepository } from './adapters/demo/pull-request.adapter'
export { DemoMetricsService } from './adapters/demo/metrics.adapter'  
export { DemoAuthService } from './adapters/demo/auth.adapter'
export { DemoOrganizationRepository } from './adapters/demo/organization.adapter'
export { DemoRepository } from './adapters/demo/repository.adapter'
export { DemoGitHubService } from './adapters/demo/github.adapter'

// Production adapters
export * from './adapters/turso'
export * from './adapters/github'

// Configuration
export * from './config'
