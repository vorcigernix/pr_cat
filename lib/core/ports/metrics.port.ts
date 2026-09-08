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

export interface IMetricsService {
  /**
   * Get metrics summary for an organization
   */
  getSummary(
    organizationId: string, 
    teamId?: number,
    timeRange?: string,
    repositoryId?: string
  ): Promise<MetricsSummary>

  /**
   * Get time series data for engineering metrics
   */
  getTimeSeries(
    organizationId: string,
    days: number,
    repositoryId?: string,
    teamId?: number
  ): Promise<TimeSeriesDataPoint[]>

  /**
   * Get workflow recommendations for an organization
   */
  getRecommendations(
    organizationId: string, 
    teamId?: number, 
    timeRange?: string,
    repositoryId?: string
  ): Promise<RecommendationsResponse>

  /**
   * Get team performance metrics
   */
  getTeamPerformance(
    organizationId: string,
    repositoryIds?: string[],
    teamId?: number,
    timeRange?: string
  ): Promise<TeamPerformanceMetrics>

  /**
   * Get repository insights and comparisons
   */
  getRepositoryInsights(organizationId: string, teamId?: number, timeRange?: string, repositoryId?: string): Promise<RepositoryInsights>

}
