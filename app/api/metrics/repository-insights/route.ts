import { NextRequest, NextResponse } from 'next/server';
import * as OrganizationRepository from '@/lib/repositories/organization-repository';
import * as RepositoryRepository from '@/lib/repositories/repository-repository';
import { query } from '@/lib/db';
import { auth } from '@/auth';

export const runtime = 'nodejs';

type RepositoryInsight = {
  repositoryId: number;
  name: string;
  fullName: string;
  isTracked: boolean;
  metrics: {
    totalPRs: number;
    openPRs: number;
    avgCycleTime: number;
    avgPRSize: number;
    categorizationRate: number;
    activityScore: number;
    contributorCount: number;
    reviewCoverage: number;
    healthScore: number;
  };
  trends: {
    prVelocityTrend: 'up' | 'down' | 'stable';
    cycleTimeTrend: 'up' | 'down' | 'stable';
    qualityTrend: 'up' | 'down' | 'stable';
  };
};

type RepositoryInsightsResponse = {
  repositories: RepositoryInsight[];
  topPerformers: RepositoryInsight[];
  needsAttention: RepositoryInsight[];
  organizationAverages: {
    avgCycleTime: number;
    avgPRSize: number;
    avgCategorizationRate: number;
    avgHealthScore: number;
  };
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

    // Get time ranges for trend analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Get all repositories for the organization
    const repositories = await RepositoryRepository.getOrganizationRepositories(orgId);
    
    const repositoryInsights: RepositoryInsight[] = [];

    for (const repo of repositories) {
      // Get PR statistics for this repository
      const repoStats = await query<{
        total_prs: number;
        open_prs: number;
        avg_cycle_time: number;
        avg_pr_size: number;
        categorized_prs: number;
        contributor_count: number;
        reviewed_prs: number;
      }>(`
        SELECT 
          COUNT(pr.id) as total_prs,
          SUM(CASE WHEN pr.state = 'open' THEN 1 ELSE 0 END) as open_prs,
          AVG(CASE 
            WHEN pr.state = 'merged' AND pr.created_at IS NOT NULL AND pr.merged_at IS NOT NULL 
            THEN CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL)
            ELSE NULL 
          END) as avg_cycle_time,
          AVG(COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) as avg_pr_size,
          SUM(CASE WHEN pr.category_id IS NOT NULL THEN 1 ELSE 0 END) as categorized_prs,
          COUNT(DISTINCT pr.author_id) as contributor_count,
          COUNT(DISTINCT CASE 
            WHEN EXISTS(SELECT 1 FROM pr_reviews rev WHERE rev.pull_request_id = pr.id) 
            THEN pr.id 
            ELSE NULL 
          END) as reviewed_prs
        FROM pull_requests pr
        WHERE pr.repository_id = ?
        AND pr.created_at >= ?
      `, [repo.id, thirtyDaysAgo.toISOString()]);

      const stats = repoStats[0];
      if (!stats) continue;

      // Calculate metrics
      const totalPRs = stats.total_prs || 0;
      const openPRs = stats.open_prs || 0;
      const avgCycleTime = stats.avg_cycle_time || 0;
      const avgPRSize = stats.avg_pr_size || 0;
      const categorizationRate = totalPRs > 0 ? (stats.categorized_prs / totalPRs) * 100 : 0;
      const contributorCount = stats.contributor_count || 0;
      const reviewCoverage = totalPRs > 0 ? (stats.reviewed_prs / totalPRs) * 100 : 0;
      
      // Activity score based on PR volume and contributors
      const activityScore = Math.min(100, (totalPRs * 2) + (contributorCount * 5));

      // Health score - composite metric
      const healthFactors = [
        Math.min(100, reviewCoverage), // Review coverage (0-100)
        Math.min(100, categorizationRate), // Categorization rate (0-100)
        Math.max(0, 100 - (avgCycleTime * 2)), // Inverse cycle time (lower is better)
        Math.max(0, 100 - (avgPRSize / 10)), // Inverse PR size (smaller is better)
      ];
      const healthScore = healthFactors.reduce((sum, factor) => sum + factor, 0) / healthFactors.length;

      // Get previous period stats for trend analysis
      const previousStats = await query<{
        total_prs: number;
        avg_cycle_time: number;
        reviewed_prs: number;
      }>(`
        SELECT 
          COUNT(pr.id) as total_prs,
          AVG(CASE 
            WHEN pr.state = 'merged' AND pr.created_at IS NOT NULL AND pr.merged_at IS NOT NULL 
            THEN CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL)
            ELSE NULL 
          END) as avg_cycle_time,
          COUNT(DISTINCT CASE 
            WHEN EXISTS(SELECT 1 FROM pr_reviews rev WHERE rev.pull_request_id = pr.id) 
            THEN pr.id 
            ELSE NULL 
          END) as reviewed_prs
        FROM pull_requests pr
        WHERE pr.repository_id = ?
        AND pr.created_at >= ?
        AND pr.created_at < ?
      `, [repo.id, sixtyDaysAgo.toISOString(), thirtyDaysAgo.toISOString()]);

      const prevStats = previousStats[0];

      // Calculate trends
      const prVelocityChange = prevStats?.total_prs 
        ? ((totalPRs - prevStats.total_prs) / prevStats.total_prs) * 100 
        : 0;
      
      const cycleTimeChange = prevStats?.avg_cycle_time 
        ? ((avgCycleTime - prevStats.avg_cycle_time) / prevStats.avg_cycle_time) * 100 
        : 0;

      const prevReviewCoverage = prevStats?.total_prs 
        ? (prevStats.reviewed_prs / prevStats.total_prs) * 100 
        : 0;
      const qualityChange = prevReviewCoverage > 0 
        ? ((reviewCoverage - prevReviewCoverage) / prevReviewCoverage) * 100 
        : 0;

      repositoryInsights.push({
        repositoryId: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        isTracked: repo.is_tracked,
        metrics: {
          totalPRs,
          openPRs,
          avgCycleTime: Math.round(avgCycleTime * 10) / 10,
          avgPRSize: Math.round(avgPRSize),
          categorizationRate: Math.round(categorizationRate * 10) / 10,
          activityScore: Math.round(activityScore),
          contributorCount,
          reviewCoverage: Math.round(reviewCoverage * 10) / 10,
          healthScore: Math.round(healthScore * 10) / 10
        },
        trends: {
          prVelocityTrend: Math.abs(prVelocityChange) < 5 ? 'stable' : prVelocityChange > 0 ? 'up' : 'down',
          cycleTimeTrend: Math.abs(cycleTimeChange) < 5 ? 'stable' : cycleTimeChange < 0 ? 'up' : 'down', // Lower cycle time is better
          qualityTrend: Math.abs(qualityChange) < 5 ? 'stable' : qualityChange > 0 ? 'up' : 'down'
        }
      });
    }

    // Sort by health score for analysis
    repositoryInsights.sort((a, b) => b.metrics.healthScore - a.metrics.healthScore);

    // Identify top performers and repos needing attention
    const topPerformers = repositoryInsights.slice(0, 3);
    const needsAttention = repositoryInsights
      .filter(repo => repo.metrics.healthScore < 60 || repo.metrics.reviewCoverage < 50)
      .slice(0, 3);

    // Calculate organization averages
    const avgCycleTime = repositoryInsights.length > 0
      ? repositoryInsights.reduce((sum, repo) => sum + repo.metrics.avgCycleTime, 0) / repositoryInsights.length
      : 0;

    const avgPRSize = repositoryInsights.length > 0
      ? repositoryInsights.reduce((sum, repo) => sum + repo.metrics.avgPRSize, 0) / repositoryInsights.length
      : 0;

    const avgCategorizationRate = repositoryInsights.length > 0
      ? repositoryInsights.reduce((sum, repo) => sum + repo.metrics.categorizationRate, 0) / repositoryInsights.length
      : 0;

    const avgHealthScore = repositoryInsights.length > 0
      ? repositoryInsights.reduce((sum, repo) => sum + repo.metrics.healthScore, 0) / repositoryInsights.length
      : 0;

    const response: RepositoryInsightsResponse = {
      repositories: repositoryInsights,
      topPerformers,
      needsAttention,
      organizationAverages: {
        avgCycleTime: Math.round(avgCycleTime * 10) / 10,
        avgPRSize: Math.round(avgPRSize),
        avgCategorizationRate: Math.round(avgCategorizationRate * 10) / 10,
        avgHealthScore: Math.round(avgHealthScore * 10) / 10
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error calculating repository insights:', error);
    return NextResponse.json({ error: 'Failed to calculate repository insights' }, { status: 500 });
  }
} 