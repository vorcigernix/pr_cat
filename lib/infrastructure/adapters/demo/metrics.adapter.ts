/**
 * Demo Metrics Service Adapter
 * Implements IMetricsService using static demo data and generators
 */

import { IMetricsService } from '../../../core/ports'
import { 
  MetricsSummary,
  TimeSeriesDataPoint,
  RecommendationsResponse,
  TeamPerformanceMetrics
} from '../../../core/domain/entities'
import { RepositoryInsights } from '../../../core/domain/entities'
import { TimeRange } from '../../../core/domain/value-objects'
import { 
  DEMO_METRICS_SUMMARY, 
  DEMO_RECOMMENDATIONS,
  DEMO_TEAM_MEMBERS,
  DemoDataGenerator
} from './data/demo-data'

export class DemoMetricsService implements IMetricsService {
  
  async getSummary(
    organizationId: string, 
    teamId?: number,
    timeRange?: string
  ): Promise<MetricsSummary> {
    // Return static demo data with current timestamp (team and time filtering simulated)
    const baseMetrics = {
      ...DEMO_METRICS_SUMMARY,
      lastUpdated: new Date().toISOString(),
      dataUpToDate: new Date().toISOString().split('T')[0],
      nextUpdateDue: new Date(Date.now() + 86400000).toISOString(),
      cacheStrategy: "static-demo-data" as const
    };

    // Simulate time range filtering by adjusting activity levels
    const timeMultiplier = timeRange === '7d' ? 0.5 :   // Less activity in shorter periods
                          timeRange === '14d' ? 1.0 :   // Base activity
                          timeRange === '30d' ? 1.8 :   // More activity in longer periods 
                          timeRange === '90d' ? 3.2 : 1.0;

    baseMetrics.prsMergedThisWeek = Math.ceil(baseMetrics.prsMergedThisWeek * timeMultiplier);
    baseMetrics.prsMergedLastWeek = Math.ceil(baseMetrics.prsMergedLastWeek * timeMultiplier);
    baseMetrics.openPRCount = Math.ceil(baseMetrics.openPRCount * timeMultiplier);

    // Simulate team filtering by adjusting metrics if teamId is provided
    if (teamId) {
      // Simulate team having fewer contributors/PRs than org-wide
      baseMetrics.prsMergedThisWeek = Math.ceil(baseMetrics.prsMergedThisWeek * 0.4); // ~40% of org
      baseMetrics.prsMergedLastWeek = Math.ceil(baseMetrics.prsMergedLastWeek * 0.4);
      baseMetrics.openPRCount = Math.ceil(baseMetrics.openPRCount * 0.4);
      baseMetrics.averagePRSize = Math.ceil(baseMetrics.averagePRSize * 1.1); // Teams might have slightly larger PRs
    }

    return baseMetrics;
  }

  async getTimeSeries(
    organizationId: string,
    days: number,
    repositoryId?: string,
    teamId?: number
  ): Promise<TimeSeriesDataPoint[]> {
    return DemoDataGenerator.generateTimeSeries(days)
  }

  async getRecommendations(
    organizationId: string, 
    teamId?: number, 
    timeRange?: string
  ): Promise<RecommendationsResponse> {
    let recommendations = [...DEMO_RECOMMENDATIONS]
    
    // Simulate team-specific recommendations
    if (teamId) {
      // Filter to more team-specific recommendations when a team is selected
      recommendations = recommendations.filter(rec => 
        rec.type === 'collaboration' || rec.type === 'performance' || rec.priority === 'high'
      );
      
      // Add team-specific titles/content adjustments
      recommendations = recommendations.map(rec => ({
        ...rec,
        title: `Team Focus: ${rec.title}`,
        description: rec.description.replace('organization', 'team')
      }));
    }
    
    // Simulate time-based recommendation relevance
    if (timeRange) {
      const isShortPeriod = timeRange === '7d' || timeRange === '14d';
      if (isShortPeriod) {
        // Short periods focus on immediate actionable items
        recommendations = recommendations.filter(rec => 
          rec.type === 'performance' || rec.priority === 'high'
        );
      }
    }
    
    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])

    const highPriorityCount = recommendations.filter(r => r.priority === 'high').length
    const focusAreas = Array.from(new Set(recommendations.map(r => r.type)))
    
    return {
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        highPriorityCount,
        estimatedImpact: highPriorityCount > 2 ? 'High - significant improvements possible' : 
                         highPriorityCount > 0 ? 'Medium - good optimization opportunities' :
                         'Low - your workflows are already well optimized',
        focusAreas
      }
    }
  }

  async getTeamPerformance(
    organizationId: string,
    repositoryIds?: string[],
    teamId?: number,
    timeRange?: string
  ): Promise<TeamPerformanceMetrics> {
    const teamMembers = [...DEMO_TEAM_MEMBERS]
    
    // Filter by repositories if specified (for demo, just return all)
    const filteredMembers = repositoryIds ? teamMembers : teamMembers

    const totalContributors = filteredMembers.length
    const avgTeamCycleTime = filteredMembers.length > 0
      ? filteredMembers.reduce((sum, member) => sum + member.avgCycleTime, 0) / filteredMembers.length
      : 0

    const avgTeamPRSize = filteredMembers.length > 0
      ? filteredMembers.reduce((sum, member) => sum + member.avgPRSize, 0) / filteredMembers.length
      : 0

    const totalPRsCreated = filteredMembers.reduce((sum, member) => sum + member.prsCreated, 0)
    const totalReviews = filteredMembers.reduce((sum, member) => sum + member.prsReviewed, 0)
    
    const collaborationIndex = totalPRsCreated > 0 ? (totalReviews / totalPRsCreated) : 0
    const reviewCoverage = 94.4 // Static demo value

    return {
      teamMembers: filteredMembers,
      totalContributors,
      avgTeamCycleTime: Math.round(avgTeamCycleTime * 10) / 10,
      avgTeamPRSize: Math.round(avgTeamPRSize),
      collaborationIndex: Math.round(collaborationIndex * 10) / 10,
      reviewCoverage
    }
  }

  async getRepositoryInsights(organizationId: string): Promise<RepositoryInsights> {
    // Demo repository insights data
    const repositories = [
      {
        repositoryId: 'demo-repo-1',
        name: 'frontend-app',
        fullName: 'example-corp/frontend-app',
        isTracked: true,
        hasData: true,
        metrics: {
          totalPRs: 45,
          openPRs: 8,
          avgCycleTime: 28.5,
          avgPRSize: 180,
          categorizationRate: 92.1,
          activityScore: 95,
          contributorCount: 6,
          reviewCoverage: 96.7,
          healthScore: 88.3
        },
        trends: {
          prVelocityTrend: 'up' as const,
          cycleTimeTrend: 'up' as const,
          qualityTrend: 'stable' as const
        }
      },
      {
        repositoryId: 'demo-repo-2',
        name: 'api-server',
        fullName: 'example-corp/api-server',
        isTracked: true,
        hasData: true,
        metrics: {
          totalPRs: 32,
          openPRs: 5,
          avgCycleTime: 42.1,
          avgPRSize: 220,
          categorizationRate: 87.5,
          activityScore: 75,
          contributorCount: 4,
          reviewCoverage: 90.6,
          healthScore: 81.2
        },
        trends: {
          prVelocityTrend: 'stable' as const,
          cycleTimeTrend: 'down' as const,
          qualityTrend: 'up' as const
        }
      },
      {
        repositoryId: 'demo-repo-3',
        name: 'mobile-app',
        fullName: 'example-corp/mobile-app',
        isTracked: true,
        hasData: true,
        metrics: {
          totalPRs: 18,
          openPRs: 3,
          avgCycleTime: 35.7,
          avgPRSize: 195,
          categorizationRate: 78.3,
          activityScore: 60,
          contributorCount: 3,
          reviewCoverage: 85.4,
          healthScore: 75.8
        },
        trends: {
          prVelocityTrend: 'stable' as const,
          cycleTimeTrend: 'stable' as const,
          qualityTrend: 'down' as const
        }
      }
    ]

    const topPerformers = repositories
      .filter(repo => repo.hasData)
      .sort((a, b) => b.metrics.healthScore - a.metrics.healthScore)
      .slice(0, 2)

    const needsAttention = repositories
      .filter(repo => repo.hasData && (repo.metrics.healthScore < 80 || repo.metrics.reviewCoverage < 90))
      .slice(0, 2)

    const repositoriesWithData = repositories.filter(repo => repo.hasData)
    const organizationAverages = {
      avgCycleTime: Math.round(
        repositoriesWithData.reduce((sum, repo) => sum + repo.metrics.avgCycleTime, 0) / repositoriesWithData.length * 10
      ) / 10,
      avgPRSize: Math.round(
        repositoriesWithData.reduce((sum, repo) => sum + repo.metrics.avgPRSize, 0) / repositoriesWithData.length
      ),
      avgCategorizationRate: Math.round(
        repositoriesWithData.reduce((sum, repo) => sum + repo.metrics.categorizationRate, 0) / repositoriesWithData.length * 10
      ) / 10,
      avgHealthScore: Math.round(
        repositoriesWithData.reduce((sum, repo) => sum + repo.metrics.healthScore, 0) / repositoriesWithData.length * 10
      ) / 10
    }

    return {
      repositories,
      topPerformers,
      needsAttention,
      organizationAverages
    }
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
    let metrics = DEMO_TEAM_MEMBERS.map(member => ({
      userId: member.userId,
      name: member.name,
      prsCreated: member.prsCreated,
      prsReviewed: member.prsReviewed,
      avgCycleTime: member.avgCycleTime,
      avgPRSize: member.avgPRSize,
      contributionScore: member.contributionScore
    }))

    if (userId) {
      metrics = metrics.filter(m => m.userId === userId)
    }

    return metrics
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
    const range = timeRange || TimeRange.fromPreset('30d')
    const days = range.getDays()
    const trends = []
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      trends.push({
        date: date.toISOString().split('T')[0],
        avgCycleTime: Math.round((30 + Math.random() * 40) * 10) / 10,
        prCount: Math.floor(Math.random() * 8) + 1
      })
    }
    
    return trends
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
    return {
      totalPRs: 127,
      reviewedPRs: 120,
      coverage: 94.5,
      trendDirection: 'stable'
    }
  }
}
