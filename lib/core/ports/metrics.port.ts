/**
 * Metrics Service Port
 * Defines the contract for metrics and analytics operations
 */

import { 
  MetricsSummary,
  TimeSeriesDataPoint,
  RecommendationsResponse,
  TeamPerformanceMetrics
} from '../domain/entities/metrics'
import { RepositoryInsights } from '../domain/entities/repository'
import { TimeRange } from '../domain/value-objects/time-range'

export interface IMetricsService {
  /**
   * Get metrics summary for an organization
   */
  getSummary(organizationId: string): Promise<MetricsSummary>

  /**
   * Get time series data for engineering metrics
   */
  getTimeSeries(
    organizationId: string,
    days: number,
    repositoryId?: string
  ): Promise<TimeSeriesDataPoint[]>

  /**
   * Get workflow recommendations for an organization
   */
  getRecommendations(organizationId: string): Promise<RecommendationsResponse>

  /**
   * Get team performance metrics
   */
  getTeamPerformance(
    organizationId: string,
    repositoryIds?: string[]
  ): Promise<TeamPerformanceMetrics>

  /**
   * Get repository insights and comparisons
   */
  getRepositoryInsights(organizationId: string): Promise<RepositoryInsights>

  /**
   * Get developer productivity metrics
   */
  getDeveloperMetrics(
    organizationId: string,
    userId?: string,
    timeRange?: TimeRange
  ): Promise<{
    userId: string
    name: string
    prsCreated: number
    prsReviewed: number
    avgCycleTime: number
    avgPRSize: number
    contributionScore: number
  }[]>

  /**
   * Get cycle time trends
   */
  getCycleTimeTrends(
    organizationId: string,
    repositoryId?: string,
    timeRange?: TimeRange
  ): Promise<{
    date: string
    avgCycleTime: number
    prCount: number
  }[]>

  /**
   * Get review coverage statistics
   */
  getReviewCoverage(
    organizationId: string,
    timeRange?: TimeRange
  ): Promise<{
    totalPRs: number
    reviewedPRs: number
    coverage: number
    trendDirection: 'up' | 'down' | 'stable'
  }>
}
