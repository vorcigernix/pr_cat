import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext, TimeRange } from '@/lib/core';

export const runtime = 'nodejs';

// Pure business logic handler
const categoryDistributionHandler = async (
  context: ApplicationContext,
  request: NextRequest
): Promise<NextResponse> => {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '30d';
    const format = searchParams.get('format') || 'total';
    const teamId = searchParams.get('teamId');

    // Get pull request repository via dependency injection
    const prRepository = await ServiceLocator.getPullRequestRepository();
    
    // Use organization ID from authenticated context
    const organizationId = context.organizationId;
    
    if (format === 'timeseries') {
      // Get time series data for category distribution
      const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
      const days = daysMap[timeRange] || 30;
      
      const data = await prRepository.getCategoryTimeSeries(
        organizationId, 
        days, 
        teamId ? parseInt(teamId) : undefined
      );
      return NextResponse.json(data);
    } else {
      // Get total category distribution
      const timeRangeObj = TimeRange.fromPreset(timeRange as '7d' | '30d' | '90d');
      const data = await prRepository.getCategoryDistribution(
        organizationId, 
        timeRangeObj, 
        teamId ? parseInt(teamId) : undefined
      );
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error getting category distribution:', error);
    return NextResponse.json(
      { error: 'Failed to get category distribution' }, 
      { status: 500 }
    );
  }
};

// Authentication handled by middleware
export const GET = withAuth(categoryDistributionHandler);