import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext } from '@/lib/core';

export const runtime = 'nodejs';

// Pure business logic handler
const timeSeriesHandler = async (
  context: ApplicationContext,
  request: NextRequest
): Promise<NextResponse> => {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '14');
    const repositoryId = searchParams.get('repositoryId') || undefined;

    // Get the metrics service via dependency injection
    const metricsService = await ServiceLocator.getMetricsService();
    
    // Use organization ID from authenticated context
    const data = await metricsService.getTimeSeries(context.organizationId, days, repositoryId);
    
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