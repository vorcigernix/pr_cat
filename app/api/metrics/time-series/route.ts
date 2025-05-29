import { NextRequest, NextResponse } from 'next/server';
import * as PRRepository from '@/lib/repositories/pr-repository';
import { query } from '@/lib/db';
import { getUserWithOrganizations } from '@/lib/auth-context';

export const runtime = 'nodejs';
// Cache for 30 minutes - time series data changes gradually
export const revalidate = 1800;

type TimeSeriesDataPoint = {
  date: string;
  prThroughput: number;
  cycleTime: number;
  reviewTime: number;
  codingHours: number;
};

export async function GET(request: NextRequest) {
  try {
    // Use cached user context to avoid repeated queries
    const { user, primaryOrganization } = await getUserWithOrganizations(request);
    const orgId = primaryOrganization.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Set date range - default to last 14 days if not provided
    let startDate: Date, endDate: Date;
    
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      endDate = new Date();
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 13); // 14 days total (including today)
    }

    // Ensure we don't exceed a reasonable range (max 90 days)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      return NextResponse.json({ error: 'Date range cannot exceed 90 days' }, { status: 400 });
    }

    const timeSeriesData: TimeSeriesDataPoint[] = [];

    // Build repository filter condition
    let repositoryFilter = '';
    let queryParams: any[] = [orgId];
    
    if (repositoryId && repositoryId !== 'all') {
      repositoryFilter = 'AND r.id = ?';
      queryParams.push(parseInt(repositoryId));
    }

    // For each day in the range
    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      
      const dateStr = currentDate.toISOString().split('T')[0];
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Use optimized SQL queries for each day with optional repository filter
      
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
        ${repositoryFilter}
        AND pr.state = 'merged'
        AND pr.merged_at >= ?
        AND pr.merged_at < ?
        AND pr.created_at IS NOT NULL
        AND pr.merged_at IS NOT NULL
      `, [...queryParams, currentDate.toISOString(), nextDate.toISOString()]);
      
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
        ${repositoryFilter}
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
      `, [...queryParams, currentDate.toISOString(), nextDate.toISOString()]);
      
      // Calculate metrics
      const prThroughput = prsForDay.length;
      
      // Calculate average cycle time
      const avgCycleTime = prsForDay.length > 0 
        ? prsForDay.reduce((sum, pr) => sum + (pr.cycle_time_hours || 0), 0) / prsForDay.length
        : (i > 0 ? timeSeriesData[i-1]?.cycleTime || 0 : 0);
      
      // Calculate average review time  
      const avgReviewTime = reviewTimes.length > 0
        ? reviewTimes.reduce((sum, review) => sum + (review.review_time_hours || 0), 0) / reviewTimes.length
        : (i > 0 ? timeSeriesData[i-1]?.reviewTime || 0 : 0);
      
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