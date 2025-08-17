/**
 * Service Locator
 * Provides convenient access to services with proper typing
 */

import { DIContainer, ServiceName } from './di-container'
import {
  IPullRequestRepository,
  IMetricsService,
  IAuthService,
  IOrganizationRepository,
  IRepository,
  IGitHubService
} from '../ports'

/**
 * Service Locator - Provides type-safe service access
 */
export class ServiceLocator {
  private static container: DIContainer

  static initialize(): void {
    ServiceLocator.container = DIContainer.getInstance()
  }

  private static getContainer(): DIContainer {
    if (!ServiceLocator.container) {
      ServiceLocator.initialize()
    }
    return ServiceLocator.container
  }

  // Typed service getters
  static async getPullRequestRepository(): Promise<IPullRequestRepository> {
    return ServiceLocator.getContainer().get<IPullRequestRepository>('PullRequestRepository')
  }

  static async getMetricsService(): Promise<IMetricsService> {
    return ServiceLocator.getContainer().get<IMetricsService>('MetricsService')
  }

  static async getAuthService(): Promise<IAuthService> {
    return ServiceLocator.getContainer().get<IAuthService>('AuthService')
  }

  static async getOrganizationRepository(): Promise<IOrganizationRepository> {
    return ServiceLocator.getContainer().get<IOrganizationRepository>('OrganizationRepository')
  }

  static async getRepository(): Promise<IRepository> {
    return ServiceLocator.getContainer().get<IRepository>('Repository')
  }

  static async getGitHubService(): Promise<IGitHubService> {
    return ServiceLocator.getContainer().get<IGitHubService>('GitHubService')
  }

  // Batch service loading for common use cases
  static async getDashboardServices(): Promise<{
    prRepository: IPullRequestRepository
    metricsService: IMetricsService
    authService: IAuthService
  }> {
    const [prRepository, metricsService, authService] = await Promise.all([
      ServiceLocator.getPullRequestRepository(),
      ServiceLocator.getMetricsService(),
      ServiceLocator.getAuthService()
    ])

    return { prRepository, metricsService, authService }
  }

  static async getOrganizationServices(): Promise<{
    orgRepository: IOrganizationRepository
    repository: IRepository
    authService: IAuthService
  }> {
    const [orgRepository, repository, authService] = await Promise.all([
      ServiceLocator.getOrganizationRepository(),
      ServiceLocator.getRepository(),
      ServiceLocator.getAuthService()
    ])

    return { orgRepository, repository, authService }
  }

  static async getGitHubServices(): Promise<{
    githubService: IGitHubService
    prRepository: IPullRequestRepository
    repository: IRepository
  }> {
    const [githubService, prRepository, repository] = await Promise.all([
      ServiceLocator.getGitHubService(),
      ServiceLocator.getPullRequestRepository(),
      ServiceLocator.getRepository()
    ])

    return { githubService, prRepository, repository }
  }

  // Utility methods
  static async preloadServices(): Promise<void> {
    await ServiceLocator.getContainer().preload()
  }

  static getContainerStatus() {
    return ServiceLocator.getContainer().getStatus()
  }

  static reset(): void {
    DIContainer.reset()
    ServiceLocator.container = undefined!
  }
}

/**
 * Hook-style service access for React components
 * These functions return promises, so use with React.Suspense or async effects
 */
export const useServices = {
  async pullRequestRepository(): Promise<IPullRequestRepository> {
    return ServiceLocator.getPullRequestRepository()
  },

  async metricsService(): Promise<IMetricsService> {
    return ServiceLocator.getMetricsService()
  },

  async authService(): Promise<IAuthService> {
    return ServiceLocator.getAuthService()
  },

  async organizationRepository(): Promise<IOrganizationRepository> {
    return ServiceLocator.getOrganizationRepository()
  },

  async repository(): Promise<IRepository> {
    return ServiceLocator.getRepository()
  },

  async githubService(): Promise<IGitHubService> {
    return ServiceLocator.getGitHubService()
  }
}

/**
 * Convenience functions for common service combinations
 */
export async function getDashboardServices() {
  return ServiceLocator.getDashboardServices()
}

export async function getOrganizationServices() {
  return ServiceLocator.getOrganizationServices()
}

export async function getGitHubServices() {
  return ServiceLocator.getGitHubServices()
}
