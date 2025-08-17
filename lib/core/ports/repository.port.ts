/**
 * Repository Port
 * Defines the contract for repository data operations
 */

import { Repository, RepositoryMetrics } from '../domain/entities/repository'
import { Pagination, PaginatedResult } from '../domain/value-objects/pagination'
import { TimeRange } from '../domain/value-objects/time-range'

export interface IRepository {
  /**
   * Get repository by ID
   */
  getById(repositoryId: string): Promise<Repository | null>

  /**
   * Get repositories for an organization
   */
  getByOrganization(
    organizationId: string,
    filters?: {
      isTracked?: boolean
      isArchived?: boolean
      language?: string
    }
  ): Promise<Repository[]>

  /**
   * Get repository by full name (owner/repo)
   */
  getByFullName(fullName: string): Promise<Repository | null>

  /**
   * Update repository information
   */
  update(
    repositoryId: string,
    updates: Partial<Repository>
  ): Promise<Repository>

  /**
   * Set repository tracking status
   */
  setTrackingStatus(
    repositoryId: string,
    isTracked: boolean
  ): Promise<void>

  /**
   * Get repository metrics
   */
  getMetrics(repositoryId: string): Promise<RepositoryMetrics>

  /**
   * Get organization repositories with metrics
   */
  getOrganizationRepositories(organizationId: string): Promise<Repository[]>

  /**
   * Search repositories
   */
  search(
    organizationId: string,
    query: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<Repository>>

  /**
   * Sync repository from GitHub
   */
  syncFromGitHub(repositoryId: string): Promise<Repository>

  /**
   * Bulk update repositories
   */
  bulkUpdate(
    updates: Array<{
      id: string
      updates: Partial<Repository>
    }>
  ): Promise<Repository[]>

  /**
   * Get repository activity summary
   */
  getActivitySummary(
    repositoryId: string,
    timeRange?: TimeRange
  ): Promise<{
    pullRequests: number
    commits: number
    contributors: number
    lastActivity: Date
  }>
}
