import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext } from '@/lib/core';

export const runtime = 'nodejs';

// Pure business logic handler
const timeSeriesHandler = async (
  context: ApplicationContext,
  request: NextRequest
): Promise<NextResponse> => {
  try {
    // Parse query parameters including team filtering
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '14');
    const repositoryId = searchParams.get('repositoryId') || undefined;
    const teamId = searchParams.get('teamId');
    const timeRange = searchParams.get('timeRange') || '14d';
    
    // Convert timeRange to days if not explicitly provided
    const finalDays = searchParams.has('days') ? days : 
      timeRange === '7d' ? 7 :
      timeRange === '14d' ? 14 :
      timeRange === '30d' ? 30 :
      timeRange === '90d' ? 90 : 14;

    // Get the metrics service via dependency injection
    const metricsService = await ServiceLocator.getMetricsService();
    
    // Use organization ID from authenticated context with team filtering
    const data = await metricsService.getTimeSeries(
      context.organizationId, 
      finalDays, 
      repositoryId,
      teamId ? parseInt(teamId) : undefined
    );
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting time series data:', error);
    return NextResponse.json(
      { error: 'Failed to get time series data' }, 
      { status: 500 }
    );
  }
};

// Authentication handled by middleware
export const GET = withAuth(timeSeriesHandler);