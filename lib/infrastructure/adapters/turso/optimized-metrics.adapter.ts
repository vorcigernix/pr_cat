/**
 * Performance-Optimized Turso Metrics Service Adapter
 * Replaces N+1 query patterns with efficient single queries using GROUP BY
 */

import { IMetricsService } from '../../../core/ports'
import { 
  MetricsSummary,
  TimeSeriesDataPoint,
  RecommendationsResponse,
  TeamPerformanceMetrics
} from '../../../core/domain/entities'
import { RepositoryInsights } from '../../../core/domain/entities'
import { query } from '@/lib/db'
import type { InValue } from '@libsql/client'

export class OptimizedTursoMetricsService implements IMetricsService {
  
  async getSummary(
    organizationId: string, 
    teamId?: number,
    timeRange?: string,
    repositoryId?: string
  ): Promise<MetricsSummary> {
    const orgId = parseInt(organizationId)
    const now = new Date()
    
    // Parse time range to get appropriate periods for comparison
    const days = timeRange === '7d' ? 7 : 
                 timeRange === '14d' ? 14 : 
                 timeRange === '30d' ? 30 : 
                 timeRange === '90d' ? 90 : 14; // default to 14 days
    
    const thisPeriodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const lastPeriodStart = new Date(now.getTime() - (days * 2) * 24 * 60 * 60 * 1000)
    
    // Build team filter conditions if teamId provided
    const teamJoinClause = teamId ? `
      INNER JOIN team_members tm ON pr.author_id = tm.user_id
      INNER JOIN teams t ON tm.team_id = t.id
    ` : '';
    const teamWhereClause = teamId ? `AND t.id = ? AND t.organization_id = r.organization_id` : '';

    // Get tracked repositories count
    const trackedRepos = await query<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM repositories
      WHERE organization_id = ? AND is_tracked = true
      ${repositoryId ? 'AND id = ?' : ''}
    `, repositoryId ? [orgId, (Number(repositoryId) || -1)] : [orgId])

    // Read both comparison periods in the same scan of merged PRs.
    const mergedParams = [
      thisPeriodStart.toISOString(), thisPeriodStart.toISOString(),
      orgId, lastPeriodStart.toISOString()
    ]
    if (teamId) {
      mergedParams.push(teamId);
    }
    if (repositoryId) mergedParams.push((Number(repositoryId) || -1));
    const mergedPRs = await query<{ current_count: number; previous_count: number }>(`
      SELECT
        SUM(CASE WHEN pr.merged_at >= ? THEN 1 ELSE 0 END) as current_count,
        SUM(CASE WHEN pr.merged_at < ? THEN 1 ELSE 0 END) as previous_count
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      ${teamJoinClause}
      WHERE r.organization_id = ?
      AND pr.state = 'merged'
      AND pr.merged_at >= ?
      ${teamWhereClause}
      ${repositoryId ? 'AND pr.repository_id = ?' : ''}
    `, mergedParams)

    // Calculate weekly change
    const thisPeriod = mergedPRs[0]?.current_count || 0
    const lastPeriod = mergedPRs[0]?.previous_count || 0
    const weeklyChange = lastPeriod > 0 ? ((thisPeriod - lastPeriod) / lastPeriod) * 100 : 0

    // Size, open count, and categorization share the same creation-date filter.
    const prStatsParams = [orgId, thisPeriodStart.toISOString()]
    if (teamId) {
      prStatsParams.push(teamId);
    }
    if (repositoryId) prStatsParams.push((Number(repositoryId) || -1));
    const prStats = await query<{
      avg_size: number
      sized_prs: number
      open_count: number
      total_prs: number
      categorized_prs: number
    }>(`
      SELECT 
        AVG(pr.additions + pr.deletions) as avg_size,
        COUNT(pr.additions + pr.deletions) as sized_prs,
        SUM(CASE WHEN pr.state = 'open' THEN 1 ELSE 0 END) as open_count,
        COUNT(*) as total_prs,
        SUM(CASE WHEN pr.category_id IS NOT NULL THEN 1 ELSE 0 END) as categorized_prs
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      ${teamJoinClause}
      WHERE r.organization_id = ?
      AND pr.created_at >= ?
      ${teamWhereClause}
      ${repositoryId ? 'AND pr.repository_id = ?' : ''}
    `, prStatsParams)

    const categorizationRate = prStats[0]?.total_prs > 0
      ? (prStats[0].categorized_prs / prStats[0].total_prs) * 100
      : 0

    return {
      trackedRepositories: trackedRepos[0]?.count || 0,
      prsMergedThisWeek: thisPeriod,
      prsMergedLastWeek: lastPeriod,
      weeklyPRVolumeChange: Math.round(weeklyChange * 10) / 10,
      averagePRSize: Math.round(prStats[0]?.avg_size || 0),
      sizedPRCount: prStats[0]?.sized_prs || 0,
      openPRCount: prStats[0]?.open_count || 0,
      categorizationRate: Math.round(categorizationRate * 10) / 10,
      dataUpToDate: now.toISOString().split('T')[0],
      lastUpdated: now.toISOString(),
      cacheStrategy: 'database-optimized',
      nextUpdateDue: new Date(now.getTime() + 60 * 60 * 1000).toISOString() // 1 hour
    }
  }

  /**
   * OPTIMIZED: Single query with GROUP BY instead of 42 individual queries
   */
  async getTimeSeries(
    organizationId: string,
    days: number,
    repositoryId?: string,
    teamId?: number
  ): Promise<TimeSeriesDataPoint[]> {
    const orgId = parseInt(organizationId)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
    
    let whereClause = 'WHERE r.organization_id = ?'
    let joinClause = ''
    const params: InValue[] = [orgId]

    if (repositoryId) {
      whereClause += ' AND pr.repository_id = ?'
      params.push(Number(repositoryId) || -1)
    }

    if (teamId) {
      joinClause = `
        INNER JOIN team_members tm ON pr.author_id = tm.user_id
        INNER JOIN teams t ON tm.team_id = t.id
      `
      whereClause += ' AND t.id = ? AND t.organization_id = r.organization_id'
      params.push(teamId)
    }

    // Single optimized query that gets all metrics grouped by day
    const dailyMetrics = await query<{
      date_created: string
      pr_count: number
      merged_count: number
      total_cycle_time: number
      total_lines: number
    }>(`
      SELECT 
        DATE(pr.created_at) as date_created,
        COUNT(*) as pr_count,
        SUM(CASE WHEN pr.state = 'merged' AND pr.merged_at IS NOT NULL THEN 1 ELSE 0 END) as merged_count,
        SUM(CASE 
          WHEN pr.state = 'merged' AND pr.merged_at IS NOT NULL 
          THEN CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL)
          ELSE 0
        END) as total_cycle_time,
        SUM(COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) as total_lines
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      ${joinClause}
      ${whereClause}
      AND DATE(pr.created_at) >= DATE(?)
      AND DATE(pr.created_at) <= DATE(?)
      GROUP BY DATE(pr.created_at)
      ORDER BY DATE(pr.created_at)
    `, [...params, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]])

    // Create a map for quick lookup
    const metricsMap = new Map<string, typeof dailyMetrics[0]>()
    dailyMetrics.forEach(row => {
      metricsMap.set(row.date_created, row)
    })

    // Generate complete time series with all days, filling gaps with zeros
    const timeSeriesData: TimeSeriesDataPoint[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayMetrics = metricsMap.get(dateStr)
      const prThroughput = dayMetrics?.pr_count || 0
      const mergedCount = dayMetrics?.merged_count || 0
      const avgCycleTime = mergedCount > 0 ? (dayMetrics?.total_cycle_time || 0) / mergedCount : 0
      const reviewTime = avgCycleTime * 0.3 // 30% of cycle time
      const codingHours = (dayMetrics?.total_lines || 0) / 50 // 1 hour per 50 lines

      timeSeriesData.push({
        date: dateStr,
        prThroughput,
        cycleTime: Math.round(avgCycleTime * 10) / 10,
        reviewTime: Math.round(reviewTime * 10) / 10,
        codingHours: Math.round(codingHours * 10) / 10
      })
    }

    return timeSeriesData
  }

  // Keep all other methods from the original TursoMetricsService unchanged
  async getRecommendations(
    organizationId: string, 
    teamId?: number, 
    timeRange?: string,
    repositoryId?: string
  ): Promise<RecommendationsResponse> {
    const orgId = parseInt(organizationId)
    
    // Parse time range to days for recommendations analysis
    const days = timeRange === '7d' ? 7 : 
                 timeRange === '14d' ? 14 : 
                 timeRange === '30d' ? 30 : 
                 timeRange === '90d' ? 90 : 30; // default to 30 days
    
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recommendations = []
    
    // Build team filter conditions if teamId provided
    const teamJoinClause = teamId ? `
      INNER JOIN team_members tm ON pr.author_id = tm.user_id
      INNER JOIN teams t ON tm.team_id = t.id
    ` : '';
    const teamWhereClause = teamId ? `AND t.id = ? AND t.organization_id = r.organization_id` : '';
    const params = [orgId, cutoffDate.toISOString()]
    if (teamId) {
      params.push(teamId);
    }

    if (repositoryId) params.push((Number(repositoryId) || -1));

    // 1. Analyze cycle time (with team filtering)
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
      ${teamJoinClause}
      WHERE r.organization_id = ?
      AND pr.state = 'merged'
      AND pr.created_at >= ?
      AND pr.merged_at IS NOT NULL
      ${teamWhereClause}
      ${repositoryId ? 'AND pr.repository_id = ?' : ''}
    `, params)

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

    // 2. Analyze PR size (with team filtering)
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
      ${teamJoinClause}
      WHERE r.organization_id = ?
      AND pr.state = 'merged'
      AND pr.created_at >= ?
      ${teamWhereClause}
      ${repositoryId ? 'AND pr.repository_id = ?' : ''}
    `, params)

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
    `, [orgId, cutoffDate.toISOString()])

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
    repositoryIds?: string[],
    teamId?: number,
    timeRange = '14d'
  ): Promise<TeamPerformanceMetrics> {
    const cutoff = new Date(Date.now() - Number.parseInt(timeRange, 10) * 86400000).toISOString()
    const now = new Date().toISOString()
    const repositoryFilter = repositoryIds?.length
      ? `AND pr.repository_id IN (${repositoryIds.map(() => '?').join(',')})` : ''
    const scopeParams: InValue[] = [Number(organizationId), ...(repositoryIds || []).map(Number)]
    // Membership is checked for the contributor, independently of the author of a reviewed PR.
    const membership = teamId ? `AND EXISTS (
      SELECT 1 FROM team_members tm JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = contributor_id AND t.id = ? AND t.organization_id = ?
    )` : ''
    const memberParams: InValue[] = teamId ? [teamId, Number(organizationId)] : []
    const stats = await query<{
      contributor_id: string; name: string; prs_created: number; prs_reviewed: number;
      merged_count: number; cycle_hours: number; total_size: number; reviewed_prs: number
    }>(`
      WITH scoped_prs AS (
        SELECT pr.* FROM pull_requests pr JOIN repositories r ON r.id = pr.repository_id
        WHERE r.organization_id = ? ${repositoryFilter}
      ), authored AS (
        SELECT pr.author_id AS contributor_id, COUNT(*) AS prs_created,
          SUM(CASE WHEN pr.state = 'merged' AND pr.merged_at IS NOT NULL THEN 1 ELSE 0 END) AS merged_count,
          SUM(CASE WHEN pr.state = 'merged' AND pr.merged_at IS NOT NULL
            THEN (julianday(pr.merged_at) - julianday(pr.created_at)) * 24 ELSE 0 END) AS cycle_hours,
          SUM(COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) AS total_size,
          SUM(CASE WHEN EXISTS (SELECT 1 FROM pr_reviews rev WHERE rev.pull_request_id = pr.id
            AND rev.reviewer_id != pr.author_id AND julianday(rev.submitted_at) <= julianday(?))
            THEN 1 ELSE 0 END) AS reviewed_prs
        FROM scoped_prs pr
        WHERE julianday(pr.created_at) >= julianday(?) AND julianday(pr.created_at) <= julianday(?)
          AND pr.author_id IS NOT NULL
        GROUP BY pr.author_id
      ), reviewed AS (
        SELECT rev.reviewer_id AS contributor_id, COUNT(DISTINCT rev.pull_request_id) AS prs_reviewed
        FROM pr_reviews rev JOIN scoped_prs pr ON pr.id = rev.pull_request_id
        WHERE julianday(rev.submitted_at) >= julianday(?) AND julianday(rev.submitted_at) <= julianday(?)
          AND rev.reviewer_id IS NOT NULL AND (pr.author_id IS NULL OR rev.reviewer_id != pr.author_id)
        GROUP BY rev.reviewer_id
      ), contributors AS (
        SELECT contributor_id FROM authored UNION SELECT contributor_id FROM reviewed
      )
      SELECT c.contributor_id, u.name,
        COALESCE(a.prs_created, 0) AS prs_created, COALESCE(v.prs_reviewed, 0) AS prs_reviewed,
        COALESCE(a.merged_count, 0) AS merged_count, COALESCE(a.cycle_hours, 0) AS cycle_hours,
        COALESCE(a.total_size, 0) AS total_size, COALESCE(a.reviewed_prs, 0) AS reviewed_prs
      FROM contributors c LEFT JOIN authored a USING (contributor_id)
      LEFT JOIN reviewed v USING (contributor_id) LEFT JOIN users u ON u.id = c.contributor_id
      WHERE 1 = 1 ${membership}
      ORDER BY (COALESCE(a.prs_created, 0) + COALESCE(v.prs_reviewed, 0)) DESC, c.contributor_id
    `, [...scopeParams, now, cutoff, now, cutoff, now, ...memberParams])

    const teamMembers = stats.map(stat => ({
      userId: stat.contributor_id,
      name: stat.name || 'Unknown',
      prsCreated: stat.prs_created,
      prsReviewed: stat.prs_reviewed,
      avgCycleTime: stat.merged_count ? Math.round(stat.cycle_hours / stat.merged_count * 10) / 10 : 0,
      avgPRSize: stat.prs_created ? Math.round(stat.total_size / stat.prs_created) : 0,
      reviewThoroughness: stat.prs_created ? Math.round(stat.prs_reviewed / stat.prs_created * 1000) / 10 : 0,
      contributionScore: stat.prs_created + stat.prs_reviewed
    }))
    const totals = stats.reduce((sum, stat) => ({
      prs: sum.prs + stat.prs_created, reviews: sum.reviews + stat.prs_reviewed,
      merged: sum.merged + stat.merged_count, hours: sum.hours + stat.cycle_hours,
      size: sum.size + stat.total_size, covered: sum.covered + stat.reviewed_prs
    }), { prs: 0, reviews: 0, merged: 0, hours: 0, size: 0, covered: 0 })
    return {
      teamMembers,
      totalContributors: teamMembers.length,
      avgTeamCycleTime: totals.merged ? Math.round(totals.hours / totals.merged * 10) / 10 : 0,
      avgTeamPRSize: totals.prs ? Math.round(totals.size / totals.prs) : 0,
      collaborationIndex: totals.prs ? Math.round(totals.reviews / totals.prs * 100) / 100 : 0,
      reviewCoverage: totals.prs ? Math.round(totals.covered / totals.prs * 1000) / 10 : 0
    }
  }

  async getRepositoryInsights(organizationId: string, teamId?: number, timeRange = '14d', repositoryId?: string): Promise<RepositoryInsights> {
    const orgId = parseInt(organizationId)
    const cutoff = new Date(Date.now() - Number.parseInt(timeRange, 10) * 86400000);
    const params: InValue[] = [cutoff.toISOString()];
    if (teamId) params.push(teamId, orgId);
    params.push(orgId);
    if (repositoryId) params.push((Number(repositoryId) || -1));

    // Get repository insights with aggregated metrics
    const repositories = await query<{
      repository_id: number
      name: string
      full_name: string
      is_tracked: number
      total_prs: number
      open_prs: number
      avg_cycle_time: number | null
      avg_pr_size: number | null
      categorized_prs: number
      contributor_count: number
      reviewed_prs: number
    }>(`
      SELECT 
        r.id as repository_id,
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
        COUNT(DISTINCT pr.author_id) as contributor_count,
        SUM(CASE WHEN EXISTS (
          SELECT 1 FROM pr_reviews rev WHERE rev.pull_request_id = pr.id
        ) THEN 1 ELSE 0 END) as reviewed_prs
      FROM repositories r
      LEFT JOIN pull_requests pr ON r.id = pr.repository_id 
        AND pr.created_at >= ?
        ${teamId ? `AND EXISTS (SELECT 1 FROM team_members tm JOIN teams t ON tm.team_id = t.id
          WHERE tm.user_id = pr.author_id AND t.id = ? AND t.organization_id = ?)` : ''}
      WHERE r.organization_id = ?
      AND r.is_tracked = 1
      ${repositoryId ? 'AND r.id = ?' : ''}
      GROUP BY r.id, r.name, r.full_name, r.is_tracked
      HAVING total_prs > 0
      ORDER BY total_prs DESC
    `, params)

    const repositoryInsights = repositories.map(repo => {
      const categorizationRate = repo.total_prs > 0 
        ? (repo.categorized_prs / repo.total_prs) * 100 
        : 0;
      
      const reviewCoverage = repo.total_prs > 0 
        ? (repo.reviewed_prs / repo.total_prs) * 100 
        : 0;

      // Calculate activity score based on PR volume and recency
      const activityScore = Math.min(100, (repo.total_prs / 50) * 100);
      
      // Calculate health score as weighted average of key metrics
      const healthScore = (
        (Math.min(categorizationRate, 100) * 0.25) +
        (Math.min(reviewCoverage, 100) * 0.35) +
        (activityScore * 0.2) +
        ((repo.avg_cycle_time ? Math.max(0, 100 - (repo.avg_cycle_time / 2)) : 50) * 0.2)
      );

      return {
        repositoryId: repo.repository_id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        isTracked: repo.is_tracked === 1,
        hasData: repo.total_prs > 0,
        metrics: {
          totalPRs: repo.total_prs,
          openPRs: repo.open_prs,
          avgCycleTime: repo.avg_cycle_time || 0,
          avgPRSize: Math.round(repo.avg_pr_size || 0),
          categorizationRate: Math.round(categorizationRate * 10) / 10,
          activityScore: Math.round(activityScore),
          contributorCount: repo.contributor_count,
          reviewCoverage: Math.round(reviewCoverage * 10) / 10,
          healthScore: Math.round(healthScore * 10) / 10
        },
        trends: {
          prVelocityTrend: 'stable' as const, // TODO: Calculate actual trends
          cycleTimeTrend: 'stable' as const,
          qualityTrend: 'stable' as const
        }
      };
    });

    // Calculate organization averages
    const totalRepos = repositoryInsights.length;
    const organizationAverages = {
      avgCycleTime: totalRepos > 0 
        ? repositoryInsights.reduce((sum, repo) => sum + repo.metrics.avgCycleTime, 0) / totalRepos
        : 0,
      avgPRSize: totalRepos > 0 
        ? repositoryInsights.reduce((sum, repo) => sum + repo.metrics.avgPRSize, 0) / totalRepos
        : 0,
      avgCategorizationRate: totalRepos > 0 
        ? repositoryInsights.reduce((sum, repo) => sum + repo.metrics.categorizationRate, 0) / totalRepos
        : 0,
      avgHealthScore: totalRepos > 0 
        ? repositoryInsights.reduce((sum, repo) => sum + repo.metrics.healthScore, 0) / totalRepos
        : 0
    };

    // Identify top performers and repositories needing attention
    const topPerformers = repositoryInsights
      .filter(repo => repo.hasData && repo.metrics.healthScore >= 80)
      .sort((a, b) => b.metrics.healthScore - a.metrics.healthScore)
      .slice(0, 3);

    const needsAttention = repositoryInsights
      .filter(repo => repo.hasData && repo.metrics.healthScore < 70)
      .sort((a, b) => a.metrics.healthScore - b.metrics.healthScore)
      .slice(0, 3);

    return {
      repositories: repositoryInsights,
      topPerformers,
      needsAttention,
      organizationAverages: {
        avgCycleTime: Math.round(organizationAverages.avgCycleTime * 10) / 10,
        avgPRSize: Math.round(organizationAverages.avgPRSize),
        avgCategorizationRate: Math.round(organizationAverages.avgCategorizationRate * 10) / 10,
        avgHealthScore: Math.round(organizationAverages.avgHealthScore * 10) / 10
      }
    }
  }

}
