/**
 * Turso Metrics Service Adapter
 * Implements IMetricsService using real database analytics and calculations
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
import { query } from '@/lib/db'

export class TursoMetricsService implements IMetricsService {
  
  async getSummary(organizationId: string): Promise<MetricsSummary> {
    const orgId = parseInt(organizationId)
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    // Get tracked repositories count
    const trackedRepos = await query<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM repositories
      WHERE organization_id = ? AND is_tracked = true
    `, [orgId])

    // Get PRs merged this week vs last week
    const thisWeekPRs = await query<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.state = 'merged'
      AND pr.merged_at >= ?
    `, [orgId, oneWeekAgo.toISOString()])

    const lastWeekPRs = await query<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.state = 'merged'
      AND pr.merged_at >= ?
      AND pr.merged_at < ?
    `, [orgId, twoWeeksAgo.toISOString(), oneWeekAgo.toISOString()])

    // Calculate weekly change
    const thisPeriod = thisWeekPRs[0]?.count || 0
    const lastPeriod = lastWeekPRs[0]?.count || 0
    const weeklyChange = lastPeriod > 0 ? ((thisPeriod - lastPeriod) / lastPeriod) * 100 : 0

    // Get average PR size and open count
    const prStats = await query<{
      avg_size: number
      open_count: number
    }>(`
      SELECT 
        AVG(COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) as avg_size,
        SUM(CASE WHEN pr.state = 'open' THEN 1 ELSE 0 END) as open_count
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.created_at >= ?
    `, [orgId, twoWeeksAgo.toISOString()])

    // Get categorization rate
    const categorizationStats = await query<{
      total_prs: number
      categorized_prs: number
    }>(`
      SELECT 
        COUNT(*) as total_prs,
        SUM(CASE WHEN pr.category_id IS NOT NULL THEN 1 ELSE 0 END) as categorized_prs
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.created_at >= ?
    `, [orgId, twoWeeksAgo.toISOString()])

    const categorizationRate = categorizationStats[0]?.total_prs > 0 
      ? (categorizationStats[0].categorized_prs / categorizationStats[0].total_prs) * 100 
      : 0

    return {
      trackedRepositories: trackedRepos[0]?.count || 0,
      prsMergedThisWeek: thisPeriod,
      prsMergedLastWeek: lastPeriod,
      weeklyPRVolumeChange: Math.round(weeklyChange * 10) / 10,
      averagePRSize: Math.round(prStats[0]?.avg_size || 0),
      openPRCount: prStats[0]?.open_count || 0,
      categorizationRate: Math.round(categorizationRate * 10) / 10,
      dataUpToDate: now.toISOString().split('T')[0],
      lastUpdated: now.toISOString(),
      cacheStrategy: 'database-live',
      nextUpdateDue: new Date(now.getTime() + 60 * 60 * 1000).toISOString() // 1 hour
    }
  }

  async getTimeSeries(
    organizationId: string,
    days: number,
    repositoryId?: string
  ): Promise<TimeSeriesDataPoint[]> {
    const orgId = parseInt(organizationId)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
    
    const timeSeriesData: TimeSeriesDataPoint[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const nextDateStr = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      let whereClause = 'WHERE r.organization_id = ? AND DATE(pr.created_at) = ?'
      let params: any[] = [orgId, dateStr]

      if (repositoryId) {
        whereClause += ' AND pr.repository_id = ?'
        params.push(parseInt(repositoryId))
      }

      // Get PR throughput (PRs created)
      const throughputResult = await query<{ count: number }>(`
        SELECT COUNT(*) as count
        FROM pull_requests pr
        LEFT JOIN repositories r ON pr.repository_id = r.id
        ${whereClause}
      `, params)

      // Get merged PRs for this date to calculate cycle time
      const mergedPRs = await query<{
        cycle_time_hours: number
      }>(`
        SELECT 
          CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL) as cycle_time_hours
        FROM pull_requests pr
        LEFT JOIN repositories r ON pr.repository_id = r.id
        ${whereClause.replace('pr.created_at', 'pr.merged_at')}
        AND pr.state = 'merged'
        AND pr.merged_at IS NOT NULL
      `, params)

      // Calculate average cycle time for the day
      const avgCycleTime = mergedPRs.length > 0
        ? mergedPRs.reduce((sum, pr) => sum + (pr.cycle_time_hours || 0), 0) / mergedPRs.length
        : 0

      // Estimate review time as 30% of cycle time
      const reviewTime = avgCycleTime * 0.3

      // Estimate coding hours based on lines changed
      const codingStats = await query<{ total_lines: number }>(`
        SELECT SUM(COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) as total_lines
        FROM pull_requests pr
        LEFT JOIN repositories r ON pr.repository_id = r.id
        ${whereClause}
      `, params)

      // Estimate 1 hour per 50 lines (conservative estimate)
      const codingHours = (codingStats[0]?.total_lines || 0) / 50

      timeSeriesData.push({
        date: dateStr,
        prThroughput: throughputResult[0]?.count || 0,
        cycleTime: Math.round(avgCycleTime * 10) / 10,
        reviewTime: Math.round(reviewTime * 10) / 10,
        codingHours: Math.round(codingHours * 10) / 10
      })
    }

    return timeSeriesData
  }

  async getRecommendations(organizationId: string): Promise<RecommendationsResponse> {
    const orgId = parseInt(organizationId)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recommendations = []

    // 1. Analyze cycle time
    const cycleTimeStats = await query<{
      avg_cycle_time: number
      slow_pr_count: number
      total_merged_prs: number
    }>(`
      SELECT 
        AVG(CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL)) as avg_cycle_time,
        SUM(CASE 
          WHEN CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL) > 72 
          THEN 1 ELSE 0 
        END) as slow_pr_count,
        COUNT(pr.id) as total_merged_prs
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.state = 'merged'
      AND pr.created_at >= ?
      AND pr.merged_at IS NOT NULL
    `, [orgId, thirtyDaysAgo.toISOString()])

    const cycleStats = cycleTimeStats[0]
    if (cycleStats && cycleStats.avg_cycle_time > 48) {
      recommendations.push({
        id: 'cycle-time-optimization',
        type: 'performance' as const,
        priority: cycleStats.avg_cycle_time > 96 ? 'high' as const : 'medium' as const,
        title: 'Optimize Delivery Cycle Time',
        description: `Your average cycle time is ${Math.round(cycleStats.avg_cycle_time)} hours. Consider breaking down large PRs and implementing automated pipelines.`,
        impact: 'Faster delivery cycles improve developer productivity and reduce context switching costs.',
        actionItems: [
          'Break down large PRs into smaller, focused changes',
          'Implement automated CI/CD pipelines to reduce manual delays',
          'Set up PR review rotation to ensure timely reviews'
        ],
        metrics: {
          currentValue: Math.round(cycleStats.avg_cycle_time),
          targetValue: 36,
          improvementPotential: '40-60% reduction in cycle time'
        },
        timeFrame: '2-4 weeks'
      })
    }

    // 2. Analyze PR size
    const prSizeStats = await query<{
      avg_pr_size: number
      large_pr_count: number
      total_prs: number
    }>(`
      SELECT 
        AVG(COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) as avg_pr_size,
        SUM(CASE 
          WHEN (COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) > 500 
          THEN 1 ELSE 0 
        END) as large_pr_count,
        COUNT(pr.id) as total_prs
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.state = 'merged'
      AND pr.created_at >= ?
    `, [orgId, thirtyDaysAgo.toISOString()])

    const sizeStats = prSizeStats[0]
    if (sizeStats && sizeStats.avg_pr_size > 300) {
      recommendations.push({
        id: 'pr-size-optimization',
        type: 'quality' as const,
        priority: sizeStats.avg_pr_size > 600 ? 'high' as const : 'medium' as const,
        title: 'Reduce PR Size for Better Reviews',
        description: `Average PR size is ${Math.round(sizeStats.avg_pr_size)} lines. Smaller PRs get reviewed faster and have fewer bugs.`,
        impact: 'Smaller PRs get reviewed faster, have fewer bugs, and are easier to understand.',
        actionItems: [
          'Encourage developers to make smaller, atomic commits',
          'Implement PR size linting rules in your CI pipeline',
          'Use feature flags to merge incomplete features safely'
        ],
        metrics: {
          currentValue: Math.round(sizeStats.avg_pr_size),
          targetValue: 200,
          improvementPotential: '25-40% faster review time'
        },
        timeFrame: '1-2 weeks'
      })
    }

    // 3. Analyze review coverage
    const reviewCoverageStats = await query<{
      total_prs: number
      reviewed_prs: number
    }>(`
      SELECT 
        COUNT(DISTINCT pr.id) as total_prs,
        COUNT(DISTINCT CASE 
          WHEN EXISTS(SELECT 1 FROM pr_reviews rev WHERE rev.pull_request_id = pr.id) 
          THEN pr.id 
        END) as reviewed_prs
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.created_at >= ?
      AND pr.state = 'merged'
    `, [orgId, thirtyDaysAgo.toISOString()])

    const reviewStats = reviewCoverageStats[0]
    if (reviewStats && reviewStats.total_prs > 0) {
      const reviewCoverage = (reviewStats.reviewed_prs / reviewStats.total_prs) * 100
      
      if (reviewCoverage < 90) {
        recommendations.push({
          id: 'review-coverage-improvement',
          type: 'quality' as const,
          priority: reviewCoverage < 50 ? 'high' as const : 'medium' as const,
          title: 'Improve Code Review Coverage',
          description: `${Math.round(reviewCoverage)}% of merged PRs received code reviews. Increase review coverage for better code quality.`,
          impact: 'Better review coverage catches bugs early and improves code quality.',
          actionItems: [
            'Implement branch protection rules requiring reviews',
            'Set up CODEOWNERS files for automatic reviewer assignment',
            'Create review checklists and guidelines'
          ],
          metrics: {
            currentValue: Math.round(reviewCoverage),
            targetValue: 90,
            improvementPotential: 'Reduce bugs by 40-60%'
          },
          timeFrame: '1 week'
        })
      } else {
        // Positive reinforcement for good coverage
        recommendations.push({
          id: 'review-coverage-excellence',
          type: 'quality' as const,
          priority: 'low' as const,
          title: 'Maintain Code Review Excellence',
          description: `Great job! ${Math.round(reviewCoverage)}% of merged PRs receive code reviews.`,
          impact: 'Consistent review coverage maintains high code quality.',
          actionItems: [
            'Continue current review practices',
            'Consider more detailed review checklists',
            'Share review best practices with new team members'
          ],
          metrics: {
            currentValue: Math.round(reviewCoverage),
            targetValue: 90,
            improvementPotential: 'Maintain current standards'
          },
          timeFrame: 'Ongoing'
        })
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
    repositoryIds?: string[]
  ): Promise<TeamPerformanceMetrics> {
    const orgId = parseInt(organizationId)
    let repositoryFilter = ''
    let params: any[] = [orgId]

    if (repositoryIds && repositoryIds.length > 0) {
      repositoryFilter = `AND pr.repository_id IN (${repositoryIds.map(() => '?').join(',')})`
      params.push(...repositoryIds.map(id => parseInt(id)))
    }

    // Get team member statistics
    const teamStats = await query<{
      author_id: string
      author_name: string
      prs_created: number
      avg_cycle_time: number
      avg_pr_size: number
    }>(`
      SELECT 
        pr.author_id,
        u.name as author_name,
        COUNT(pr.id) as prs_created,
        AVG(CASE 
          WHEN pr.state = 'merged' AND pr.merged_at IS NOT NULL
          THEN CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL)
          ELSE NULL
        END) as avg_cycle_time,
        AVG(COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) as avg_pr_size
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      LEFT JOIN users u ON pr.author_id = u.id
      WHERE r.organization_id = ?
      AND pr.created_at >= datetime('now', '-30 days')
      AND pr.author_id IS NOT NULL
      ${repositoryFilter}
      GROUP BY pr.author_id, u.name
      HAVING prs_created >= 1
      ORDER BY prs_created DESC
    `, params)

    // Get review counts for each team member
    const reviewStats = await query<{
      reviewer_id: string
      reviews_given: number
    }>(`
      SELECT 
        rev.reviewer_id,
        COUNT(rev.id) as reviews_given
      FROM pr_reviews rev
      LEFT JOIN pull_requests pr ON rev.pull_request_id = pr.id
      LEFT JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND rev.submitted_at >= datetime('now', '-30 days')
      AND rev.reviewer_id IS NOT NULL
      ${repositoryFilter}
      GROUP BY rev.reviewer_id
    `, params)

    // Combine team stats with review stats
    const reviewMap = new Map(reviewStats.map(r => [r.reviewer_id, r.reviews_given]))
    
    const teamMembers = teamStats.map(member => {
      const reviewsGiven = reviewMap.get(member.author_id) || 0
      const reviewThoroughness = member.prs_created > 0 ? (reviewsGiven / member.prs_created) * 100 : 0
      
      return {
        userId: member.author_id,
        name: member.author_name || 'Unknown',
        prsCreated: member.prs_created,
        prsReviewed: reviewsGiven,
        avgCycleTime: Math.round((member.avg_cycle_time || 0) * 10) / 10,
        avgPRSize: Math.round(member.avg_pr_size || 0),
        reviewThoroughness: Math.round(reviewThoroughness * 10) / 10,
        contributionScore: Math.round((member.prs_created * 2 + reviewsGiven) * 0.8)
      }
    })

    // Calculate team averages
    const totalContributors = teamMembers.length
    const avgTeamCycleTime = totalContributors > 0
      ? teamMembers.reduce((sum, member) => sum + member.avgCycleTime, 0) / totalContributors
      : 0

    const avgTeamPRSize = totalContributors > 0
      ? teamMembers.reduce((sum, member) => sum + member.avgPRSize, 0) / totalContributors
      : 0

    const totalPRsCreated = teamMembers.reduce((sum, member) => sum + member.prsCreated, 0)
    const totalReviews = teamMembers.reduce((sum, member) => sum + member.prsReviewed, 0)
    
    const collaborationIndex = totalPRsCreated > 0 ? totalReviews / totalPRsCreated : 0

    // Calculate review coverage (different from individual thoroughness)
    const coverageStats = await query<{
      total_prs: number
      reviewed_prs: number
    }>(`
      SELECT 
        COUNT(DISTINCT pr.id) as total_prs,
        COUNT(DISTINCT CASE 
          WHEN EXISTS(SELECT 1 FROM pr_reviews rev WHERE rev.pull_request_id = pr.id) 
          THEN pr.id 
        END) as reviewed_prs
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.created_at >= datetime('now', '-30 days')
      ${repositoryFilter}
    `, params)

    const reviewCoverage = coverageStats[0]?.total_prs > 0
      ? (coverageStats[0].reviewed_prs / coverageStats[0].total_prs) * 100
      : 0

    return {
      teamMembers,
      totalContributors,
      avgTeamCycleTime: Math.round(avgTeamCycleTime * 10) / 10,
      avgTeamPRSize: Math.round(avgTeamPRSize),
      collaborationIndex: Math.round(collaborationIndex * 10) / 10,
      reviewCoverage: Math.round(reviewCoverage * 10) / 10
    }
  }

  async getRepositoryInsights(organizationId: string): Promise<RepositoryInsights> {
    const orgId = parseInt(organizationId)

    // Get all tracked repositories with their metrics
    const repositories = await query<{
      id: number
      name: string
      full_name: string
      is_tracked: boolean
      total_prs: number
      open_prs: number
      avg_cycle_time: number
      avg_pr_size: number
      categorized_prs: number
      contributor_count: number
    }>(`
      SELECT 
        r.id,
        r.name,
        r.full_name,
        r.is_tracked,
        COUNT(pr.id) as total_prs,
        SUM(CASE WHEN pr.state = 'open' THEN 1 ELSE 0 END) as open_prs,
        AVG(CASE 
          WHEN pr.state = 'merged' AND pr.merged_at IS NOT NULL
          THEN CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL)
          ELSE NULL
        END) as avg_cycle_time,
        AVG(COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) as avg_pr_size,
        SUM(CASE WHEN pr.category_id IS NOT NULL THEN 1 ELSE 0 END) as categorized_prs,
        COUNT(DISTINCT pr.author_id) as contributor_count
      FROM repositories r
      LEFT JOIN pull_requests pr ON r.id = pr.repository_id
      WHERE r.organization_id = ?
      AND r.is_tracked = true
      AND (pr.id IS NULL OR pr.created_at >= datetime('now', '-90 days'))
      GROUP BY r.id, r.name, r.full_name, r.is_tracked
      ORDER BY total_prs DESC
    `, [orgId])

    const repoMetrics = repositories.map(repo => {
      const categorizationRate = repo.total_prs > 0 ? (repo.categorized_prs / repo.total_prs) * 100 : 0
      const activityScore = Math.min(100, repo.total_prs * 2) // Simple activity scoring
      
      // Calculate health score based on multiple factors
      const healthFactors = [
        Math.min(100, 100 - (repo.avg_cycle_time || 0)), // Lower cycle time is better
        Math.min(100, categorizationRate),
        Math.min(100, activityScore),
        Math.min(100, repo.contributor_count * 10) // More contributors is better
      ]
      const healthScore = healthFactors.reduce((sum, factor) => sum + factor, 0) / healthFactors.length

      return {
        repositoryId: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        isTracked: repo.is_tracked,
        hasData: repo.total_prs > 0,
        metrics: {
          totalPRs: repo.total_prs,
          openPRs: repo.open_prs,
          avgCycleTime: Math.round((repo.avg_cycle_time || 0) * 10) / 10,
          avgPRSize: Math.round(repo.avg_pr_size || 0),
          categorizationRate: Math.round(categorizationRate * 10) / 10,
          activityScore: Math.round(activityScore),
          contributorCount: repo.contributor_count,
          reviewCoverage: 85, // Placeholder - would need more complex query
          healthScore: Math.round(healthScore * 10) / 10
        },
        trends: {
          prVelocityTrend: 'stable' as const, // Placeholder - would need historical data
          cycleTimeTrend: 'stable' as const,
          qualityTrend: 'stable' as const
        }
      }
    })

    const repositoriesWithData = repoMetrics.filter(repo => repo.hasData)
    const topPerformers = repositoriesWithData
      .sort((a, b) => b.metrics.healthScore - a.metrics.healthScore)
      .slice(0, 3)

    const needsAttention = repositoriesWithData
      .filter(repo => repo.metrics.healthScore < 70 || repo.metrics.reviewCoverage < 80)
      .slice(0, 3)

    // Calculate organization averages
    const organizationAverages = {
      avgCycleTime: repositoriesWithData.length > 0
        ? Math.round(repositoriesWithData.reduce((sum, repo) => sum + repo.metrics.avgCycleTime, 0) / repositoriesWithData.length * 10) / 10
        : 0,
      avgPRSize: repositoriesWithData.length > 0
        ? Math.round(repositoriesWithData.reduce((sum, repo) => sum + repo.metrics.avgPRSize, 0) / repositoriesWithData.length)
        : 0,
      avgCategorizationRate: repositoriesWithData.length > 0
        ? Math.round(repositoriesWithData.reduce((sum, repo) => sum + repo.metrics.categorizationRate, 0) / repositoriesWithData.length * 10) / 10
        : 0,
      avgHealthScore: repositoriesWithData.length > 0
        ? Math.round(repositoriesWithData.reduce((sum, repo) => sum + repo.metrics.healthScore, 0) / repositoriesWithData.length * 10) / 10
        : 0
    }

    return {
      repositories: repoMetrics,
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
    const orgId = parseInt(organizationId)
    let timeFilter = 'AND pr.created_at >= datetime(\'now\', \'-30 days\')'
    let params: any[] = [orgId]

    if (timeRange) {
      timeFilter = 'AND pr.created_at >= ? AND pr.created_at <= ?'
      params.push(timeRange.start.toISOString(), timeRange.end.toISOString())
    }

    if (userId) {
      timeFilter += ' AND pr.author_id = ?'
      params.push(userId)
    }

    return this.getTeamPerformance(organizationId).then(teamData => 
      teamData.teamMembers.map(member => ({
        userId: member.userId,
        name: member.name,
        prsCreated: member.prsCreated,
        prsReviewed: member.prsReviewed,
        avgCycleTime: member.avgCycleTime,
        avgPRSize: member.avgPRSize,
        contributionScore: member.contributionScore
      }))
    )
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
    // Implementation would be similar to getTimeSeries but focused on cycle time
    return this.getTimeSeries(organizationId, 30, repositoryId).then(data =>
      data.map(point => ({
        date: point.date,
        avgCycleTime: point.cycleTime,
        prCount: point.prThroughput
      }))
    )
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
    const orgId = parseInt(organizationId)
    const range = timeRange || TimeRange.fromPreset('30d')

    const coverageStats = await query<{
      total_prs: number
      reviewed_prs: number
    }>(`
      SELECT 
        COUNT(DISTINCT pr.id) as total_prs,
        COUNT(DISTINCT CASE 
          WHEN EXISTS(SELECT 1 FROM pr_reviews rev WHERE rev.pull_request_id = pr.id) 
          THEN pr.id 
        END) as reviewed_prs
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.created_at >= ?
      AND pr.created_at <= ?
    `, [orgId, range.start.toISOString(), range.end.toISOString()])

    const stats = coverageStats[0] || { total_prs: 0, reviewed_prs: 0 }
    const coverage = stats.total_prs > 0 ? (stats.reviewed_prs / stats.total_prs) * 100 : 0

    return {
      totalPRs: stats.total_prs,
      reviewedPRs: stats.reviewed_prs,
      coverage: Math.round(coverage * 10) / 10,
      trendDirection: 'stable' // Would need historical comparison for real trend
    }
  }
}
