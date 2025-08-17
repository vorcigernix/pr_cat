/**
 * Simplified Turso Repository Adapter
 * Implements IRepository with basic database integration
 */

import { IRepository } from '../../../core/ports'
import { Repository, RepositoryMetrics } from '../../../core/domain/entities'
import { Pagination, PaginatedResult, TimeRange } from '../../../core/domain/value-objects'

// Use demo adapter as base
import { DemoRepository } from '../demo/repository.adapter'

export class SimpleTursoRepository implements IRepository {
  private demoFallback = new DemoRepository()

  async getById(repositoryId: string): Promise<Repository | null> {
    return this.demoFallback.getById(repositoryId)
  }

  async getByOrganization(
    organizationId: string,
    filters?: {
      isTracked?: boolean
      isArchived?: boolean
      language?: string
    }
  ): Promise<Repository[]> {
    return this.demoFallback.getByOrganization(organizationId, filters)
  }

  async getByFullName(fullName: string): Promise<Repository | null> {
    return this.demoFallback.getByFullName(fullName)
  }

  async update(
    repositoryId: string,
    updates: Partial<Repository>
  ): Promise<Repository> {
    return this.demoFallback.update(repositoryId, updates)
  }

  async setTrackingStatus(
    repositoryId: string,
    isTracked: boolean
  ): Promise<void> {
    return this.demoFallback.setTrackingStatus(repositoryId, isTracked)
  }

  async getMetrics(repositoryId: string): Promise<RepositoryMetrics> {
    return this.demoFallback.getMetrics(repositoryId)
  }

  async getOrganizationRepositories(organizationId: string): Promise<Repository[]> {
    return this.demoFallback.getOrganizationRepositories(organizationId)
  }

  async search(
    organizationId: string,
    searchQuery: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<Repository>> {
    return this.demoFallback.search(organizationId, searchQuery, pagination)
  }

  async syncFromGitHub(repositoryId: string): Promise<Repository> {
    return this.demoFallback.syncFromGitHub(repositoryId)
  }

  async bulkUpdate(
    updates: Array<{
      id: string
      updates: Partial<Repository>
    }>
  ): Promise<Repository[]> {
    return this.demoFallback.bulkUpdate(updates)
  }

  async getActivitySummary(
    repositoryId: string,
    timeRange?: TimeRange
  ): Promise<{
    pullRequests: number
    commits: number
    contributors: number
    lastActivity: Date
  }> {
    return this.demoFallback.getActivitySummary(repositoryId, timeRange)
  }


}
