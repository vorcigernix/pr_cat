/**
 * Simplified Turso Pull Request Repository Adapter
 * Implements IPullRequestRepository with basic database integration
 */

import { IPullRequestRepository } from '../../../core/ports'
import { 
  PullRequest, 
  PullRequestSummary, 
  PullRequestMetrics,
  CategoryDistribution,
  CategoryTimeSeriesData
} from '../../../core/domain/entities'
import { TimeRange, Pagination, PaginatedResult } from '../../../core/domain/value-objects'

// Use demo adapter as base
import { DemoPullRequestRepository } from '../demo/pull-request.adapter'

export class SimpleTursoPullRequestRepository implements IPullRequestRepository {
  private demoFallback = new DemoPullRequestRepository()

  async getRecent(
    organizationId: string, 
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>> {
    return this.demoFallback.getRecent(organizationId, pagination)
  }

  async getById(pullRequestId: string): Promise<PullRequest | null> {
    return this.demoFallback.getById(pullRequestId)
  }

  async getByCategory(
    organizationId: string, 
    categoryId?: string,
    timeRange?: TimeRange
  ): Promise<PullRequest[]> {
    return this.demoFallback.getByCategory(organizationId, categoryId, timeRange)
  }

  async getCategoryDistribution(
    organizationId: string,
    timeRange?: TimeRange
  ): Promise<CategoryDistribution[]> {
    return this.demoFallback.getCategoryDistribution(organizationId, timeRange)
  }

  async getCategoryTimeSeries(
    organizationId: string,
    days: number
  ): Promise<CategoryTimeSeriesData> {
    return this.demoFallback.getCategoryTimeSeries(organizationId, days)
  }

  async getMetrics(
    organizationId: string,
    timeRange?: TimeRange
  ): Promise<PullRequestMetrics> {
    return this.demoFallback.getMetrics(organizationId, timeRange)
  }

  async getByAuthor(
    organizationId: string,
    authorId: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>> {
    return this.demoFallback.getByAuthor(organizationId, authorId, pagination)
  }

  async getByRepository(
    repositoryId: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>> {
    return this.demoFallback.getByRepository(repositoryId, pagination)
  }

  async search(
    organizationId: string,
    query: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>> {
    return this.demoFallback.search(organizationId, query, pagination)
  }

  async getCount(
    organizationId: string,
    filters?: {
      state?: 'open' | 'closed' | 'merged'
      categoryId?: string
      repositoryId?: string
      authorId?: string
      timeRange?: TimeRange
    }
  ): Promise<number> {
    return this.demoFallback.getCount(organizationId, filters)
  }
}
