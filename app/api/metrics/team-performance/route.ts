import { NextRequest, NextResponse } from 'next/server';
import * as OrganizationRepository from '@/lib/repositories/organization-repository';
import * as UserRepository from '@/lib/repositories/user-repository';
import { query } from '@/lib/db';
import { auth } from '@/auth';

export const runtime = 'nodejs';
// Cache for 1 hour - team performance metrics are aggregate data
export const revalidate = 3600;

type TeamMemberStats = {
  userId: string;
  name: string;
  prsCreated: number;
  prsReviewed: number;
  avgCycleTime: number;
  avgPRSize: number;
  reviewThoroughness: number;
  contributionScore: number;
};

type TeamPerformanceMetrics = {
  teamMembers: TeamMemberStats[];
  totalContributors: number;
  avgTeamCycleTime: number;
  avgTeamPRSize: number;
  collaborationIndex: number;
  reviewCoverage: number;
};

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

    const orgId = organizations[0].id;

    // Get repository filter from query params
    const { searchParams } = new URL(request.url);
    const repositoriesParam = searchParams.get('repositories');
    const repositoryIds = repositoriesParam ? repositoriesParam.split(',').map(id => parseInt(id)) : null;

    // Calculate time range - last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build repository filter condition
    const repoFilterCondition = repositoryIds 
      ? `AND pr.repository_id IN (${repositoryIds.join(',')})`
      : '';

    // 1. Get PR author statistics
    const authorStats = await query<{
      author_id: string;
      pr_count: number;
      avg_cycle_time: number;
      avg_pr_size: number;
      total_additions: number;
      total_deletions: number;
    }>(`
      SELECT 
        pr.author_id,
        COUNT(pr.id) as pr_count,
        AVG(CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL)) as avg_cycle_time,
        AVG(COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) as avg_pr_size,
        SUM(COALESCE(pr.additions, 0)) as total_additions,
        SUM(COALESCE(pr.deletions, 0)) as total_deletions
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.created_at >= ?
      AND pr.author_id IS NOT NULL
      ${repoFilterCondition}
      GROUP BY pr.author_id
      HAVING pr_count > 0
    `, [orgId, thirtyDaysAgo.toISOString()]);

    // 2. Get reviewer statistics
    const reviewerStats = await query<{
      reviewer_id: string;
      review_count: number;
      avg_review_comments: number;
    }>(`
      SELECT 
        rev.reviewer_id,
        COUNT(rev.id) as review_count,
        AVG(1) as avg_review_comments -- Placeholder for comment count
      FROM pr_reviews rev
      JOIN pull_requests pr ON rev.pull_request_id = pr.id
      JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND rev.submitted_at >= ?
      AND rev.reviewer_id IS NOT NULL
      ${repoFilterCondition}
      GROUP BY rev.reviewer_id
      HAVING review_count > 0
    `, [orgId, thirtyDaysAgo.toISOString()]);

    // 3. Create team member statistics
    const teamMembers: TeamMemberStats[] = [];
    const allUserIds = new Set([
      ...authorStats.map(s => s.author_id),
      ...reviewerStats.map(s => s.reviewer_id)
    ]);

    for (const userId of allUserIds) {
      // Get user details
      const user = await UserRepository.findUserById(userId);
      const userName = user?.name || user?.email || 'Unknown User';

      const authorStat = authorStats.find(s => s.author_id === userId);
      const reviewerStat = reviewerStats.find(s => s.reviewer_id === userId);

      const prsCreated = authorStat?.pr_count || 0;
      const prsReviewed = reviewerStat?.review_count || 0;
      const avgCycleTime = authorStat?.avg_cycle_time || 0;
      const avgPRSize = Math.round(authorStat?.avg_pr_size || 0);

      // Calculate review thoroughness (reviews given vs PRs created ratio)
      const reviewThoroughness = prsCreated > 0 ? (prsReviewed / prsCreated) * 100 : 0;

      // Calculate contribution score (weighted combination of PRs and reviews)
      const contributionScore = (prsCreated * 2) + prsReviewed;

      teamMembers.push({
        userId,
        name: userName,
        prsCreated,
        prsReviewed,
        avgCycleTime: Math.round(avgCycleTime * 10) / 10,
        avgPRSize,
        reviewThoroughness: Math.round(reviewThoroughness * 10) / 10,
        contributionScore
      });
    }

    // Sort by contribution score
    teamMembers.sort((a, b) => b.contributionScore - a.contributionScore);

    // 4. Calculate team-level metrics
    const totalPRs = authorStats.reduce((sum, stat) => sum + stat.pr_count, 0);
    const totalReviews = reviewerStats.reduce((sum, stat) => sum + stat.review_count, 0);

    const avgTeamCycleTime = authorStats.length > 0
      ? authorStats.reduce((sum, stat) => sum + (stat.avg_cycle_time || 0), 0) / authorStats.length
      : 0;

    const avgTeamPRSize = authorStats.length > 0
      ? authorStats.reduce((sum, stat) => sum + (stat.avg_pr_size || 0), 0) / authorStats.length
      : 0;

    // Collaboration index: reviews per PR (how well the team collaborates)
    const collaborationIndex = totalPRs > 0 ? (totalReviews / totalPRs) : 0;

    // Review coverage: percentage of PRs that received at least one review
    const reviewedPRsCount = await query<{ count: number }>(`
      SELECT COUNT(DISTINCT pr.id) as count
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      JOIN pr_reviews rev ON pr.id = rev.pull_request_id
      WHERE r.organization_id = ?
      AND pr.created_at >= ?
      ${repoFilterCondition}
    `, [orgId, thirtyDaysAgo.toISOString()]);

    const reviewCoverage = totalPRs > 0 
      ? ((reviewedPRsCount[0]?.count || 0) / totalPRs) * 100 
      : 0;

    const metrics: TeamPerformanceMetrics = {
      teamMembers,
      totalContributors: teamMembers.length,
      avgTeamCycleTime: Math.round(avgTeamCycleTime * 10) / 10,
      avgTeamPRSize: Math.round(avgTeamPRSize),
      collaborationIndex: Math.round(collaborationIndex * 10) / 10,
      reviewCoverage: Math.round(reviewCoverage * 10) / 10
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error calculating team performance metrics:', error);
    return NextResponse.json({ error: 'Failed to calculate team metrics' }, { status: 500 });
  }
} 