/**
 * Container Layer Index
 * Exports DI container and service location utilities
 */

export { DIContainer, getContainer, getService } from './di-container'
export { ServiceLocator, useServices, getDashboardServices, getOrganizationServices, getGitHubServices } from './service-locator'

// Export types
export type { ServiceName, ServiceInstance, ServiceFactory } from './di-container'
