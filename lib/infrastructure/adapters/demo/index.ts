/**
 * Demo Adapters Index
 * Exports all demo adapter implementations
 */

export { DemoPullRequestRepository } from './pull-request.adapter'
export { DemoMetricsService } from './metrics.adapter'
export { DemoAuthService } from './auth.adapter'
export { DemoOrganizationRepository } from './organization.adapter'
export { DemoRepository } from './repository.adapter'
export { DemoGitHubService } from './github.adapter'

// Export demo data for external use
export * from './data/demo-data'
