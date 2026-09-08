/**
 * Service Locator
 * Provides convenient access to services with proper typing
 */

import { getContainer, getService } from './di-container'
import {
  IPullRequestRepository,
  IMetricsService,
  IAuthService,
  IOrganizationRepository
} from '../ports'

/**
 * Service Locator - Provides type-safe service access
 */
export class ServiceLocator {
  // Typed service getters
  static async getPullRequestRepository(): Promise<IPullRequestRepository> {
    return getService<IPullRequestRepository>('PullRequestRepository')
  }

  static async getMetricsService(): Promise<IMetricsService> {
    return getService<IMetricsService>('MetricsService')
  }

  static async getAuthService(): Promise<IAuthService> {
    return getService<IAuthService>('AuthService')
  }

  static async getOrganizationRepository(): Promise<IOrganizationRepository> {
    return getService<IOrganizationRepository>('OrganizationRepository')
  }

  static getContainerStatus() {
    return getContainer().getStatus()
  }

}
