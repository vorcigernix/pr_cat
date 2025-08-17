/**
 * Pull Request Repository Port
 * Defines the contract for pull request data operations
 */

import { 
  PullRequest, 
  PullRequestSummary, 
  PullRequestMetrics 
} from '../domain/entities/pull-request'
import { 
  CategoryDistribution, 
  CategoryTimeSeriesData 
} from '../domain/entities/metrics'
import { TimeRange, TimeRangeFilter } from '../domain/value-objects/time-range'
import { Pagination, PaginatedResult } from '../domain/value-objects/pagination'

export interface IPullRequestRepository {
  /**
   * Get recent pull requests for an organization
   */
  getRecent(
    organizationId: string, 
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>>

  /**
   * Get pull request by ID
   */
  getById(pullRequestId: string): Promise<PullRequest | null>

  /**
   * Get pull requests by category
   */
  getByCategory(
    organizationId: string, 
    categoryId?: string,
    timeRange?: TimeRange
  ): Promise<PullRequest[]>

  /**
   * Get category distribution for an organization
   */
  getCategoryDistribution(
    organizationId: string,
    timeRange?: TimeRange
  ): Promise<CategoryDistribution[]>

  /**
   * Get category distribution time series data
   */
  getCategoryTimeSeries(
    organizationId: string,
    days: number
  ): Promise<CategoryTimeSeriesData>

  /**
   * Get pull request metrics for an organization
   */
  getMetrics(
    organizationId: string,
    timeRange?: TimeRange
  ): Promise<PullRequestMetrics>

  /**
   * Get pull requests by author
   */
  getByAuthor(
    organizationId: string,
    authorId: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>>

  /**
   * Get pull requests by repository
   */
  getByRepository(
    repositoryId: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>>

  /**
   * Search pull requests
   */
  search(
    organizationId: string,
    query: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>>

  /**
   * Get pull request count by filters
   */
  getCount(
    organizationId: string,
    filters?: {
      state?: 'open' | 'closed' | 'merged'
      categoryId?: string
      repositoryId?: string
      authorId?: string
      timeRange?: TimeRange
    }
  ): Promise<number>
}
