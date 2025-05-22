import { NextRequest, NextResponse } from 'next/server';
import * as PRRepository from '@/lib/repositories/pr-repository';
import * as OrganizationRepository from '@/lib/repositories/organization-repository';
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
      
      // Time range for this day
      const fromDate = currentDate.toISOString();
      const toDate = nextDate.toISOString();

      // Get PRs merged on this day
      const mergedPRs = await PRRepository.getOrganizationPullRequests(orgId, {
        state: 'merged',
        orderBy: 'merged_at',
        orderDir: 'DESC'
      });
      
      // Filter PRs merged on this specific day
      const prsForThisDay = mergedPRs.filter(pr => {
        if (!pr.merged_at) return false;
        const mergedDate = new Date(pr.merged_at);
        return mergedDate >= currentDate && mergedDate < nextDate;
      });
      
      // Calculate metrics
      const prThroughput = prsForThisDay.length;
      
      // Calculate average cycle time (time from creation to merge)
      let totalCycleTime = 0;
      let totalReviewTime = 0;
      
      for (const pr of prsForThisDay) {
        if (pr.created_at && pr.merged_at) {
          const created = new Date(pr.created_at);
          const merged = new Date(pr.merged_at);
          totalCycleTime += (merged.getTime() - created.getTime()) / (1000 * 60 * 60);
          
          // For review time, let's estimate as 1/3 of cycle time as a simplified approach
          // In a real implementation, you would calculate based on the time of the first review
          totalReviewTime += (merged.getTime() - created.getTime()) / (1000 * 60 * 60) / 3;
        }
      }
      
      const cycleTime = prThroughput > 0 ? totalCycleTime / prThroughput : 
                       (i > 0 ? timeSeriesData[i-1].cycleTime : 0); // Use previous day if no PRs today
                       
      const reviewTime = prThroughput > 0 ? totalReviewTime / prThroughput : 
                        (i > 0 ? timeSeriesData[i-1].reviewTime : 0); // Use previous day if no PRs today
      
      // Estimate coding hours based on additions/deletions
      // In a real implementation, this would be more sophisticated
      let totalAdditions = 0;
      let totalDeletions = 0;
      
      for (const pr of prsForThisDay) {
        totalAdditions += pr.additions || 0;
        totalDeletions += pr.deletions || 0;
      }
      
      // Simple formula: estimate 1 hour of coding for every 100 lines changed
      const codingHours = (totalAdditions + totalDeletions) / 100;
      
      timeSeriesData.push({
        date: dateStr,
        prThroughput,
        cycleTime,
        reviewTime,
        codingHours
      });
    }

    return NextResponse.json(timeSeriesData);
  } catch (error) {
    console.error('Error calculating engineering metrics:', error);
    return NextResponse.json({ error: 'Failed to calculate metrics' }, { status: 500 });
  }
} 