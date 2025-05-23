import { NextRequest, NextResponse } from 'next/server';
import { getUserWithOrganizations } from '@/lib/auth-context';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Use cached user context to avoid repeated queries
    const { user, primaryOrganization } = await getUserWithOrganizations(request);
    const orgId = primaryOrganization.id;

    // Calculate all metrics in optimized SQL queries
    
    // 1. Total PRs and recent activity (last 30 days and weekly)
    const prStats = await query<{
      total_prs: number;
      recent_prs: number;
      merged_prs: number;
      recent_merged: number;
      this_week_merged: number;
      last_week_merged: number;
    }>(`
      SELECT 
        COUNT(*) as total_prs,
        SUM(CASE WHEN pr.created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) as recent_prs,
        SUM(CASE WHEN pr.state = 'merged' THEN 1 ELSE 0 END) as merged_prs,
        SUM(CASE WHEN pr.state = 'merged' AND pr.merged_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) as recent_merged,
        SUM(CASE WHEN pr.state = 'merged' AND pr.merged_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as this_week_merged,
        SUM(CASE WHEN pr.state = 'merged' AND pr.merged_at >= datetime('now', '-14 days') AND pr.merged_at < datetime('now', '-7 days') THEN 1 ELSE 0 END) as last_week_merged
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
    `, [orgId]);

    // 2. Average cycle time and PR size (for merged PRs in last 30 days)
    const sizeAndTimeStats = await query<{
      avg_cycle_time_hours: number;
      avg_review_time_hours: number;
      avg_pr_size: number;
    }>(`
      SELECT 
        AVG(CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL)) as avg_cycle_time_hours,
        AVG(CAST((julianday(rev.submitted_at) - julianday(pr.created_at)) * 24 AS REAL)) as avg_review_time_hours,
        AVG(COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) as avg_pr_size
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      LEFT JOIN pr_reviews rev ON pr.id = rev.pull_request_id
      WHERE r.organization_id = ?
      AND pr.state = 'merged'
      AND pr.merged_at >= datetime('now', '-30 days')
      AND pr.created_at IS NOT NULL
      AND pr.merged_at IS NOT NULL
      AND (rev.submitted_at IS NULL OR rev.submitted_at = (
        SELECT MIN(rev2.submitted_at) 
        FROM pr_reviews rev2 
        WHERE rev2.pull_request_id = pr.id
      ))
    `, [orgId]);

    // 3. Categorization stats
    const categorizationStats = await query<{
      categorized_prs: number;
      total_recent_prs: number;
    }>(`
      SELECT 
        SUM(CASE WHEN pr.category_id IS NOT NULL THEN 1 ELSE 0 END) as categorized_prs,
        COUNT(*) as total_recent_prs
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.created_at >= datetime('now', '-30 days')
    `, [orgId]);

    // 4. Open PRs count and tracked repositories
    const additionalStats = await query<{
      open_prs: number;
      tracked_repositories: number;
    }>(`
      SELECT 
        (SELECT COUNT(*) FROM pull_requests pr2 
         JOIN repositories r2 ON pr2.repository_id = r2.id 
         WHERE r2.organization_id = ? AND pr2.state = 'open') as open_prs,
        (SELECT COUNT(*) FROM repositories r3 
         WHERE r3.organization_id = ? AND r3.is_tracked = 1) as tracked_repositories
    `, [orgId, orgId]);

    // Extract values with fallbacks
    const totalPRs = prStats[0]?.total_prs || 0;
    const recentPRs = prStats[0]?.recent_prs || 0;
    const mergedPRs = prStats[0]?.merged_prs || 0;
    const recentMerged = prStats[0]?.recent_merged || 0;
    const thisWeekMerged = prStats[0]?.this_week_merged || 0;
    const lastWeekMerged = prStats[0]?.last_week_merged || 0;
    
    const avgCycleTime = sizeAndTimeStats[0]?.avg_cycle_time_hours || 0;
    const avgReviewTime = sizeAndTimeStats[0]?.avg_review_time_hours || 0;
    const avgPRSize = Math.round(sizeAndTimeStats[0]?.avg_pr_size || 0);
    
    const categorizedPRs = categorizationStats[0]?.categorized_prs || 0;
    const totalRecentPRs = categorizationStats[0]?.total_recent_prs || 0;
    const categorizationRate = totalRecentPRs > 0 ? (categorizedPRs / totalRecentPRs) * 100 : 0;
    
    const openPRCount = additionalStats[0]?.open_prs || 0;
    const trackedRepositories = additionalStats[0]?.tracked_repositories || 0;
    
    const weeklyPRVolumeChange = lastWeekMerged > 0 ? ((thisWeekMerged - lastWeekMerged) / lastWeekMerged) * 100 : 0;
    const mergeRate = recentPRs > 0 ? (recentMerged / recentPRs) * 100 : 0;

    // Return both old and new format for backward compatibility
    return NextResponse.json({
      // Legacy format for existing components
      trackedRepositories,
      prsMergedThisWeek: thisWeekMerged,
      prsMergedLastWeek: lastWeekMerged,
      weeklyPRVolumeChange: Math.round(weeklyPRVolumeChange * 10) / 10,
      averagePRSize: avgPRSize,
      openPRCount,
      categorizationRate: Math.round(categorizationRate * 10) / 10,
      
      // New format for enhanced components
      totalPRs,
      recentPRs,
      mergedPRs,
      avgCycleTime: Math.round(avgCycleTime * 10) / 10,
      avgReviewTime: Math.round(avgReviewTime * 10) / 10,
      mergeRate: Math.round(mergeRate * 10) / 10,
      
      // Metadata
      period: 'last 30 days',
      organization: {
        id: primaryOrganization.id,
        name: primaryOrganization.name
      }
    });
  } catch (error) {
    console.error('Error calculating metrics summary:', error);
    return NextResponse.json({ error: 'Failed to calculate metrics' }, { status: 500 });
  }
} 