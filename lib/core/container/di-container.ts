/**
 * Dependency Injection Container
 * Manages service registration and resolution based on configuration
 */

import { EnvironmentConfig } from '../../infrastructure/config/environment'

// Import port interfaces
import {
  IPullRequestRepository,
  IMetricsService,
  IAuthService,
  IOrganizationRepository,
  IRepository,
  IGitHubService
} from '../ports'

// Service registry types
export type ServiceName = 
  | 'PullRequestRepository'
  | 'MetricsService'
  | 'AuthService'
  | 'OrganizationRepository'
  | 'Repository'
  | 'GitHubService'

export type ServiceInstance = 
  | IPullRequestRepository
  | IMetricsService
  | IAuthService
  | IOrganizationRepository
  | IRepository
  | IGitHubService

export interface ServiceFactory<T = ServiceInstance> {
  (): T | Promise<T>
}

export interface ServiceRegistration {
  factory: ServiceFactory
  singleton: boolean
  instance?: ServiceInstance
}

/**
 * Dependency Injection Container
 * 
 * Usage:
 * ```typescript
 * const container = DIContainer.getInstance()
 * const prRepository = container.get<IPullRequestRepository>('PullRequestRepository')
 * ```
 */
export class DIContainer {
  private static _instance: DIContainer
  private services = new Map<ServiceName, ServiceRegistration>()
  private initialized = false
  private config: EnvironmentConfig

  private constructor() {
    this.config = EnvironmentConfig.getInstance()
  }

  static getInstance(): DIContainer {
    if (!DIContainer._instance) {
      DIContainer._instance = new DIContainer()
      DIContainer._instance.initialize()
    }
    return DIContainer._instance
  }

  /**
   * Initialize the container with appropriate services
   */
  private initialize(): void {
    if (this.initialized) return

    console.log(`[DI Container] Initializing in ${this.config.config.mode} mode`)
    
    if (this.config.isDemoMode()) {
      this.registerDemoServices()
    } else {
      this.registerProductionServices()
    }

    this.initialized = true
    this.logRegisteredServices()
  }

  /**
   * Register demo services (no external dependencies)
   */
  private registerDemoServices(): void {
    console.log('[DI Container] Registering demo services...')

    // Dynamic imports to avoid loading production dependencies in demo mode
    this.register('PullRequestRepository', async () => {
      const { DemoPullRequestRepository } = await import('../../infrastructure/adapters/demo')
      return new DemoPullRequestRepository()
    }, true)

    this.register('MetricsService', async () => {
      const { DemoMetricsService } = await import('../../infrastructure/adapters/demo')
      return new DemoMetricsService()
    }, true)

    this.register('AuthService', async () => {
      const { DemoAuthService } = await import('../../infrastructure/adapters/demo')
      return new DemoAuthService()
    }, true)

    this.register('OrganizationRepository', async () => {
      const { DemoOrganizationRepository } = await import('../../infrastructure/adapters/demo')
      return new DemoOrganizationRepository()
    }, true)

    this.register('Repository', async () => {
      const { DemoRepository } = await import('../../infrastructure/adapters/demo')
      return new DemoRepository()
    }, true)

    this.register('GitHubService', async () => {
      const { DemoGitHubService } = await import('../../infrastructure/adapters/demo')
      return new DemoGitHubService()
    }, true)
  }

  /**
   * Register production services (requires database and GitHub configuration)
   */
  private registerProductionServices(): void {
    console.log('[DI Container] Registering production services...')

    try {
      // Register Turso database adapters
      this.register('PullRequestRepository', async () => {
        const { TursoPullRequestRepository } = await import('../../infrastructure/adapters/turso')
        return new TursoPullRequestRepository()
      }, true)

      this.register('MetricsService', async () => {
        const { TursoMetricsService } = await import('../../infrastructure/adapters/turso')
        return new TursoMetricsService()
      }, true)

      this.register('AuthService', async () => {
        const { TursoAuthService } = await import('../../infrastructure/adapters/turso')
        return new TursoAuthService()
      }, true)

      this.register('OrganizationRepository', async () => {
        const { TursoOrganizationRepository } = await import('../../infrastructure/adapters/turso')
        return new TursoOrganizationRepository()
      }, true)

      this.register('Repository', async () => {
        const { TursoRepository } = await import('../../infrastructure/adapters/turso')
        return new TursoRepository()
      }, true)

      // Register GitHub API service if GitHub App is configured
      if (this.config.hasFeature('github')) {
        this.register('GitHubService', async () => {
          const { GitHubAPIService } = await import('../../infrastructure/adapters/github')
          return new GitHubAPIService()
        }, true)
      } else {
        // Fall back to demo GitHub service if GitHub App not configured
        this.register('GitHubService', async () => {
          const { DemoGitHubService } = await import('../../infrastructure/adapters/demo')
          return new DemoGitHubService()
        }, true)
      }

      console.log('[DI Container] Production services registered successfully')
    } catch (error) {
      console.error('[DI Container] Failed to register production services:', error)
      console.warn('[DI Container] Falling back to demo services')
      this.registerDemoServices()
    }
  }

  /**
   * Register a service with its factory function
   */
  register<T extends ServiceInstance>(
    name: ServiceName,
    factory: ServiceFactory<T>,
    singleton: boolean = true
  ): void {
    this.services.set(name, {
      factory: factory as ServiceFactory,
      singleton,
      instance: undefined
    })
  }

  /**
   * Get a service instance by name
   */
  async get<T extends ServiceInstance>(name: ServiceName): Promise<T> {
    const registration = this.services.get(name)
    
    if (!registration) {
      throw new Error(`Service '${name}' is not registered`)
    }

    // Return existing singleton instance
    if (registration.singleton && registration.instance) {
      return registration.instance as T
    }

    try {
      // Create new instance
      const instance = await registration.factory()
      
      // Store singleton instance
      if (registration.singleton) {
        registration.instance = instance
      }
      
      return instance as T
    } catch (error) {
      console.error(`[DI Container] Failed to create service '${name}':`, error)
      throw new Error(`Failed to create service '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get a service synchronously (only works if already instantiated)
   */
  getSync<T extends ServiceInstance>(name: ServiceName): T | null {
    const registration = this.services.get(name)
    
    if (!registration || !registration.instance) {
      return null
    }
    
    return registration.instance as T
  }

  /**
   * Check if a service is registered
   */
  has(name: ServiceName): boolean {
    return this.services.has(name)
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear()
    this.initialized = false
  }

  /**
   * Reset the container (useful for testing)
   */
  static reset(): void {
    if (DIContainer._instance) {
      DIContainer._instance.clear()
      DIContainer._instance = undefined!
    }
  }

  /**
   * Preload all singleton services
   */
  async preload(): Promise<void> {
    console.log('[DI Container] Preloading singleton services...')
    
    const serviceNames: ServiceName[] = Array.from(this.services.keys())
    const preloadPromises = serviceNames
      .filter(name => this.services.get(name)?.singleton)
      .map(name => this.get(name))
    
    try {
      await Promise.all(preloadPromises)
      console.log(`[DI Container] Preloaded ${preloadPromises.length} services`)
    } catch (error) {
      console.error('[DI Container] Failed to preload services:', error)
      throw error
    }
  }

  /**
   * Get container status and debug information
   */
  getStatus(): {
    initialized: boolean
    mode: string
    registeredServices: string[]
    instantiatedServices: string[]
    config: any
  } {
    const registeredServices = Array.from(this.services.keys())
    const instantiatedServices = registeredServices.filter(name => 
      Boolean(this.services.get(name)?.instance)
    )

    return {
      initialized: this.initialized,
      mode: this.config.config.mode,
      registeredServices,
      instantiatedServices,
      config: this.config.getDebugInfo()
    }
  }

  /**
   * Log registered services for debugging
   */
  private logRegisteredServices(): void {
    const serviceNames = Array.from(this.services.keys())
    console.log(`[DI Container] Registered ${serviceNames.length} services:`, serviceNames)
  }
}

/**
 * Convenience function to get the DI container instance
 */
export function getContainer(): DIContainer {
  return DIContainer.getInstance()
}

/**
 * Convenience function to get a service from the container
 */
export async function getService<T extends ServiceInstance>(name: ServiceName): Promise<T> {
  const container = getContainer()
  return container.get<T>(name)
}
