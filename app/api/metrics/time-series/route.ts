import { NextRequest, NextResponse } from 'next/server';
import * as PRRepository from '@/lib/repositories/pr-repository';
import * as OrganizationRepository from '@/lib/repositories/organization-repository';
import { query } from '@/lib/db';
import { auth } from '@/auth';

export const runtime = 'nodejs';

type TimeSeriesDataPoint = {
  date: string;
  prThroughput: number;
  cycleTime: number;
  reviewTime: number;
  codingHours: number;
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

    // For simplicity, use the first organization
    const orgId = organizations[0].id;

    // Calculate time series data for the last 14 days
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 13); // 14 days total (including today)

    const timeSeriesData: TimeSeriesDataPoint[] = [];

    // For each day in the range
    for (let i = 0; i <= 13; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      
      const dateStr = currentDate.toISOString().split('T')[0];
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Use optimized SQL queries for each day
      
      // 1. Get PRs merged on this specific day with cycle time calculation
      const prsForDay = await query<{
        id: number;
        cycle_time_hours: number;
        additions: number;
        deletions: number;
      }>(`
        SELECT 
          pr.id,
          CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL) as cycle_time_hours,
          pr.additions,
          pr.deletions
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        WHERE r.organization_id = ?
        AND pr.state = 'merged'
        AND pr.merged_at >= ?
        AND pr.merged_at < ?
        AND pr.created_at IS NOT NULL
        AND pr.merged_at IS NOT NULL
      `, [orgId, currentDate.toISOString(), nextDate.toISOString()]);
      
      // 2. Calculate review time for PRs merged this day
      const reviewTimes = await query<{
        review_time_hours: number;
      }>(`
        SELECT 
          CAST((julianday(rev.submitted_at) - julianday(pr.created_at)) * 24 AS REAL) as review_time_hours
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        JOIN pr_reviews rev ON pr.id = rev.pull_request_id
        WHERE r.organization_id = ?
        AND pr.state = 'merged'
        AND pr.merged_at >= ?
        AND pr.merged_at < ?
        AND pr.created_at IS NOT NULL
        AND rev.submitted_at IS NOT NULL
        AND rev.submitted_at = (
          SELECT MIN(rev2.submitted_at) 
          FROM pr_reviews rev2 
          WHERE rev2.pull_request_id = pr.id
        )
      `, [orgId, currentDate.toISOString(), nextDate.toISOString()]);
      
      // Calculate metrics
      const prThroughput = prsForDay.length;
      
      // Calculate average cycle time
      const avgCycleTime = prsForDay.length > 0 
        ? prsForDay.reduce((sum, pr) => sum + (pr.cycle_time_hours || 0), 0) / prsForDay.length
        : (i > 0 ? timeSeriesData[i-1].cycleTime : 0);
      
      // Calculate average review time  
      const avgReviewTime = reviewTimes.length > 0
        ? reviewTimes.reduce((sum, review) => sum + (review.review_time_hours || 0), 0) / reviewTimes.length
        : (i > 0 ? timeSeriesData[i-1].reviewTime : 0);
      
      // Calculate coding hours based on lines changed
      const totalLinesChanged = prsForDay.reduce((sum, pr) => 
        sum + (pr.additions || 0) + (pr.deletions || 0), 0
      );
      
      // Estimate: 1 hour of coding for every 50 lines changed (more realistic than 100)
      const codingHours = totalLinesChanged / 50;
      
      timeSeriesData.push({
        date: dateStr,
        prThroughput,
        cycleTime: Math.round(avgCycleTime * 10) / 10, // Round to 1 decimal
        reviewTime: Math.round(avgReviewTime * 10) / 10, // Round to 1 decimal  
        codingHours: Math.round(codingHours * 10) / 10 // Round to 1 decimal
      });
    }

    return NextResponse.json(timeSeriesData);
  } catch (error) {
    console.error('Error calculating engineering metrics:', error);
    return NextResponse.json({ error: 'Failed to calculate metrics' }, { status: 500 });
  }
} 