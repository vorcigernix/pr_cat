import { NextRequest, NextResponse } from 'next/server';
import * as PRRepository from '@/lib/repositories/pr-repository';
import * as OrganizationRepository from '@/lib/repositories/organization-repository';
import * as RepositoryRepository from '@/lib/repositories/repository-repository';
import { auth } from '@/auth';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the user's active organization
    const organizations = await OrganizationRepository.getUserOrganizationsWithRole(session.user.id);
    if (!organizations || organizations.length === 0) {
      return NextResponse.json({ error: 'No organizations found' }, { status: 404 });
    }

    // For simplicity, use the first organization
    const orgId = organizations[0].id;

    // Calculate time ranges
    const now = new Date();
    
    // This week
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    thisWeekStart.setHours(0, 0, 0, 0);
    
    // Last week
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setMilliseconds(lastWeekEnd.getMilliseconds() - 1);
    
    // This month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Last month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 1. Total tracked repositories
    const repos = await RepositoryRepository.getOrganizationRepositories(orgId);
    const trackedRepos = repos.filter(repo => repo.is_tracked).length;
    
    // 2. PRs merged this week - use direct SQL query with time filter
    const thisWeekPRs = await query(`
      SELECT pr.* 
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.state = 'merged'
      AND pr.merged_at >= ?
      AND pr.merged_at <= ?
    `, [orgId, thisWeekStart.toISOString(), now.toISOString()]);
    
    // 3. PRs merged last week - use direct SQL query with time filter
    const lastWeekPRs = await query(`
      SELECT pr.* 
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.state = 'merged'
      AND pr.merged_at >= ?
      AND pr.merged_at <= ?
    `, [orgId, lastWeekStart.toISOString(), lastWeekEnd.toISOString()]);
    
    // 4. Weekly PR volume change
    const weeklyChange = lastWeekPRs.length > 0 
      ? ((thisWeekPRs.length - lastWeekPRs.length) / lastWeekPRs.length) * 100
      : 0;
    
    // 5. Average PR size - use the existing repository function with time range
    const sizeMetrics = await PRRepository.getAveragePullRequestSize(orgId, {
      from: thisWeekStart.toISOString(),
      to: now.toISOString()
    });
    const averagePRSize = sizeMetrics
      ? Math.floor(sizeMetrics.avg_additions + sizeMetrics.avg_deletions)
      : 0;
    
    // 6. Open PRs count
    const openPRs = await PRRepository.getOrganizationPullRequests(orgId, {
      state: 'open'
    });
    
    // 7. PR categorization rate
    // Get count of all PRs
    const allPRsCount = await query<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
    `, [orgId]);
    
    // Get count of categorized PRs
    const categorizedPRsCount = await query<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.category_id IS NOT NULL
    `, [orgId]);
    
    const totalPRs = allPRsCount[0]?.count || 0;
    const categorizedPRs = categorizedPRsCount[0]?.count || 0;
    const categorizationRate = totalPRs > 0
      ? (categorizedPRs / totalPRs) * 100
      : 0;

    // Return summary metrics
    return NextResponse.json({
      trackedRepositories: trackedRepos,
      prsMergedThisWeek: thisWeekPRs.length,
      prsMergedLastWeek: lastWeekPRs.length,
      weeklyPRVolumeChange: weeklyChange,
      averagePRSize: averagePRSize,
      openPRCount: openPRs.length,
      categorizationRate: categorizationRate
    });
  } catch (error) {
    console.error('Error calculating summary metrics:', error);
    return NextResponse.json({ error: 'Failed to calculate metrics' }, { status: 500 });
  }
} 