import { NextRequest, NextResponse } from 'next/server';
import * as OrganizationRepository from '@/lib/repositories/organization-repository';
import { query } from '@/lib/db';
import { auth } from '@/auth';

export const runtime = 'nodejs';
// Cache for 2 hours - workflow recommendations change less frequently
export const revalidate = 7200;
// Force dynamic rendering since we use headers()
export const dynamic = 'force-dynamic';

type Recommendation = {
  id: string;
  type: 'performance' | 'quality' | 'collaboration' | 'process';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  actionItems: string[];
  metrics: {
    currentValue: number;
    targetValue: number;
    improvementPotential: string;
  };
  affectedRepositories?: string[];
  timeFrame: string;
};

type RecommendationsResponse = {
  recommendations: Recommendation[];
  summary: {
    totalRecommendations: number;
    highPriorityCount: number;
    estimatedImpact: string;
    focusAreas: string[];
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

    // Calculate time range - last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recommendations: Recommendation[] = [];

    // 1. Analyze cycle time patterns
    const cycleTimeAnalysis = await query<{
      avg_cycle_time: number;
      max_cycle_time: number;
      slow_pr_count: number;
      total_merged_prs: number;
    }>(`
      SELECT 
        AVG(CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL)) as avg_cycle_time,
        MAX(CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL)) as max_cycle_time,
        SUM(CASE 
          WHEN CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL) > 72 
          THEN 1 ELSE 0 
        END) as slow_pr_count,
        COUNT(pr.id) as total_merged_prs
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.state = 'merged'
      AND pr.created_at >= ?
      AND pr.created_at IS NOT NULL
      AND pr.merged_at IS NOT NULL
    `, [orgId, thirtyDaysAgo.toISOString()]);

    const cycleStats = cycleTimeAnalysis[0];
    if (cycleStats && cycleStats.avg_cycle_time > 48) {
      const slowPRPercent = cycleStats.total_merged_prs > 0 
        ? (cycleStats.slow_pr_count / cycleStats.total_merged_prs) * 100 
        : 0;

      recommendations.push({
        id: 'cycle-time-optimization',
        type: 'performance',
        priority: cycleStats.avg_cycle_time > 96 ? 'high' : 'medium',
        title: 'Optimize Delivery Cycle Time',
        description: `Your average cycle time is ${Math.round(cycleStats.avg_cycle_time)} hours, which is above the recommended 24-48 hour range. ${Math.round(slowPRPercent)}% of PRs take longer than 3 days to merge.`,
        impact: 'Faster delivery cycles improve developer productivity and reduce context switching costs.',
        actionItems: [
          'Break down large PRs into smaller, focused changes',
          'Implement automated CI/CD pipelines to reduce manual delays',
          'Set up PR review rotation to ensure timely reviews',
          'Consider implementing trunk-based development practices'
        ],
        metrics: {
          currentValue: Math.round(cycleStats.avg_cycle_time),
          targetValue: 36,
          improvementPotential: '40-60% reduction in cycle time'
        },
        timeFrame: '2-4 weeks'
      });
    }

    // 2. Analyze PR size patterns
    const prSizeAnalysis = await query<{
      avg_pr_size: number;
      large_pr_count: number;
      total_prs: number;
    }>(`
      SELECT 
        AVG(COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) as avg_pr_size,
        SUM(CASE 
          WHEN (COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) > 500 
          THEN 1 ELSE 0 
        END) as large_pr_count,
        COUNT(pr.id) as total_prs
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

    const sizeStats = prSizeAnalysis[0];
    if (sizeStats && sizeStats.avg_pr_size > 300) {
      const largePRPercent = sizeStats.total_prs > 0 
        ? (sizeStats.large_pr_count / sizeStats.total_prs) * 100 
        : 0;

      recommendations.push({
        id: 'pr-size-optimization',
        type: 'quality',
        priority: sizeStats.avg_pr_size > 600 ? 'high' : 'medium',
        title: 'Reduce PR Size for Better Reviews',
        description: `Average PR size is ${Math.round(sizeStats.avg_pr_size)} lines of code. ${Math.round(largePRPercent)}% of PRs are larger than 500 lines, making them harder to review effectively.`,
        impact: 'Smaller PRs get reviewed faster, have fewer bugs, and are easier to understand.',
        actionItems: [
          'Encourage developers to make smaller, atomic commits',
          'Implement PR size linting rules in your CI pipeline',
          'Break feature development into multiple smaller PRs',
          'Use feature flags to merge incomplete features safely'
        ],
        metrics: {
          currentValue: Math.round(sizeStats.avg_pr_size),
          targetValue: 200,
          improvementPotential: '25-40% faster review time'
        },
        timeFrame: '1-2 weeks'
      });
    }

    // 3. Analyze review coverage
    const reviewCoverageAnalysis = await query<{
      total_prs: number;
      reviewed_prs: number;
      unreviewed_prs: number;
    }>(`
      SELECT 
        COUNT(pr.id) as total_prs,
        COUNT(DISTINCT CASE 
          WHEN EXISTS(SELECT 1 FROM pr_reviews rev WHERE rev.pull_request_id = pr.id) 
          THEN pr.id 
        END) as reviewed_prs,
        COUNT(DISTINCT CASE 
          WHEN NOT EXISTS(SELECT 1 FROM pr_reviews rev WHERE rev.pull_request_id = pr.id) 
          THEN pr.id 
        END) as unreviewed_prs
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.created_at >= ?
      AND pr.state = 'merged'
    `, [orgId, thirtyDaysAgo.toISOString()]);

    const reviewStats = reviewCoverageAnalysis[0];
    if (reviewStats && reviewStats.total_prs > 0) {
      const reviewCoverage = (reviewStats.reviewed_prs / reviewStats.total_prs) * 100;
      
      if (reviewCoverage < 80) {
        recommendations.push({
          id: 'review-coverage-improvement',
          type: 'quality',
          priority: reviewCoverage < 50 ? 'high' : 'medium',
          title: 'Improve Code Review Coverage',
          description: `Only ${Math.round(reviewCoverage)}% of merged PRs received code reviews. ${reviewStats.unreviewed_prs} PRs were merged without review in the last 30 days.`,
          impact: 'Better review coverage catches bugs early and improves code quality.',
          actionItems: [
            'Implement branch protection rules requiring reviews',
            'Set up CODEOWNERS files for automatic reviewer assignment',
            'Create review checklists and guidelines',
            'Track and recognize good reviewing practices'
          ],
          metrics: {
            currentValue: Math.round(reviewCoverage),
            targetValue: 90,
            improvementPotential: 'Reduce bugs by 40-60%'
          },
          timeFrame: '1 week'
        });
      }
    }

    // 4. Analyze categorization effectiveness
    const categorizationAnalysis = await query<{
      total_prs: number;
      categorized_prs: number;
    }>(`
      SELECT 
        COUNT(pr.id) as total_prs,
        SUM(CASE WHEN pr.category_id IS NOT NULL THEN 1 ELSE 0 END) as categorized_prs
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
      AND pr.created_at >= ?
    `, [orgId, thirtyDaysAgo.toISOString()]);

    const categorizationStats = categorizationAnalysis[0];
    if (categorizationStats && categorizationStats.total_prs > 0) {
      const categorizationRate = (categorizationStats.categorized_prs / categorizationStats.total_prs) * 100;
      
      if (categorizationRate < 90) {
        recommendations.push({
          id: 'categorization-improvement',
          type: 'process',
          priority: categorizationRate < 50 ? 'high' : 'low',
          title: 'Improve Investment Area Classification',
          description: `${Math.round(categorizationRate)}% of PRs are properly categorized. Better categorization helps with investment area analysis and planning.`,
          impact: 'Better categorization provides clearer insights into where development effort is spent.',
          actionItems: [
            'Review and update PR templates to encourage better descriptions',
            'Train the AI model with more diverse examples',
            'Set up manual review process for uncategorized PRs',
            'Create better category definitions and examples'
          ],
          metrics: {
            currentValue: Math.round(categorizationRate),
            targetValue: 95,
            improvementPotential: 'Better investment insights and planning'
          },
          timeFrame: '2-3 weeks'
        });
      }
    }

    // 5. Analyze team collaboration patterns
    const collaborationAnalysis = await query<{
      total_contributors: number;
      total_reviewers: number;
      review_concentration: number;
    }>(`
      SELECT 
        COUNT(DISTINCT pr.author_id) as total_contributors,
        COUNT(DISTINCT rev.reviewer_id) as total_reviewers,
        COUNT(rev.id) as total_reviews
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      LEFT JOIN pr_reviews rev ON pr.id = rev.pull_request_id
      WHERE r.organization_id = ?
      AND pr.created_at >= ?
    `, [orgId, thirtyDaysAgo.toISOString()]);

    const collaborationStats = collaborationAnalysis[0];
    if (collaborationStats && collaborationStats.total_contributors > 0) {
      const reviewParticipation = collaborationStats.total_reviewers / collaborationStats.total_contributors;
      
      if (reviewParticipation < 0.7) {
        recommendations.push({
          id: 'collaboration-improvement',
          type: 'collaboration',
          priority: 'medium',
          title: 'Improve Team Collaboration',
          description: `Only ${Math.round(reviewParticipation * 100)}% of contributors are actively participating in code reviews. This may indicate review bottlenecks or uneven workload distribution.`,
          impact: 'Better collaboration leads to knowledge sharing and more resilient teams.',
          actionItems: [
            'Rotate review assignments to spread knowledge',
            'Encourage junior developers to participate in reviews',
            'Set up pair programming sessions',
            'Create internal tech talks and knowledge sharing sessions'
          ],
          metrics: {
            currentValue: Math.round(reviewParticipation * 100),
            targetValue: 80,
            improvementPotential: 'Improved team knowledge and bus factor'
          },
          timeFrame: '4-6 weeks'
        });
      }
    }

    // Sort recommendations by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    // Generate summary
    const highPriorityCount = recommendations.filter(r => r.priority === 'high').length;
    const focusAreas = [...new Set(recommendations.map(r => r.type))];
    
    const response: RecommendationsResponse = {
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        highPriorityCount,
        estimatedImpact: highPriorityCount > 2 ? 'High - significant improvements possible' : 
                         highPriorityCount > 0 ? 'Medium - good optimization opportunities' :
                         'Low - your workflows are already well optimized',
        focusAreas
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
} 