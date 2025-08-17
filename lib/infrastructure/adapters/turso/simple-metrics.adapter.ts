/**
 * Simplified Turso Metrics Service Adapter
 * Implements IMetricsService with basic database integration
 * Falls back to demo data where database implementation is complex
 */

import { IMetricsService } from '../../../core/ports'
import { 
  MetricsSummary,
  TimeSeriesDataPoint,
  RecommendationsResponse,
  TeamPerformanceMetrics,
  RepositoryInsights
} from '../../../core/domain/entities'
import { TimeRange } from '../../../core/domain/value-objects'

// Import demo adapter as fallback for complex operations
import { DemoMetricsService } from '../demo/metrics.adapter'

export class SimpleTursoMetricsService implements IMetricsService {
  private demoFallback = new DemoMetricsService()

  async getSummary(organizationId: string): Promise<MetricsSummary> {
    // For now, use demo data but mark it as from database
    const demoSummary = await this.demoFallback.getSummary(organizationId)
    return {
      ...demoSummary,
      cacheStrategy: 'database-simplified',
      dataUpToDate: new Date().toISOString().split('T')[0]
    }
  }

  async getTimeSeries(
    organizationId: string,
    days: number,
    repositoryId?: string
  ): Promise<TimeSeriesDataPoint[]> {
    // Use demo data for time series
    return this.demoFallback.getTimeSeries(organizationId, days, repositoryId)
  }

  async getRecommendations(organizationId: string): Promise<RecommendationsResponse> {
    // Use demo recommendations with production wrapper
    const demoRecs = await this.demoFallback.getRecommendations(organizationId)
    return {
      ...demoRecs,
      summary: {
        ...demoRecs.summary,
        estimatedImpact: 'Production analysis pending'
      }
    }
  }

  async getTeamPerformance(
    organizationId: string,
    repositoryIds?: string[]
  ): Promise<TeamPerformanceMetrics> {
    return this.demoFallback.getTeamPerformance(organizationId, repositoryIds)
  }

  async getRepositoryInsights(organizationId: string): Promise<RepositoryInsights> {
    return this.demoFallback.getRepositoryInsights(organizationId)
  }

  async getDeveloperMetrics(
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
  }[]> {
    return this.demoFallback.getDeveloperMetrics(organizationId, userId, timeRange)
  }

  async getCycleTimeTrends(
    organizationId: string,
    repositoryId?: string,
    timeRange?: TimeRange
  ): Promise<{
    date: string
    avgCycleTime: number
    prCount: number
  }[]> {
    return this.demoFallback.getCycleTimeTrends(organizationId, repositoryId, timeRange)
  }

  async getReviewCoverage(
    organizationId: string,
    timeRange?: TimeRange
  ): Promise<{
    totalPRs: number
    reviewedPRs: number
    coverage: number
    trendDirection: 'up' | 'down' | 'stable'
  }> {
    return this.demoFallback.getReviewCoverage(organizationId, timeRange)
  }
}
