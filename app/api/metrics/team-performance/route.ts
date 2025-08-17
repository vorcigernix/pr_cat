import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext } from '@/lib/core';

export const runtime = 'nodejs';

// Pure business logic handler - no authentication concerns
const teamPerformanceHandler = async (
  context: ApplicationContext,
  request: NextRequest
): Promise<NextResponse> => {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const repositoryIdsParam = searchParams.get('repositoryIds');
    const repositoryIds = repositoryIdsParam ? repositoryIdsParam.split(',') : undefined;

    // Get the metrics service via dependency injection
    const metricsService = await ServiceLocator.getMetricsService();
    
    // Use organization ID from authenticated context
    const data = await metricsService.getTeamPerformance(context.organizationId, repositoryIds);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting team performance data:', error);
    return NextResponse.json(
      { error: 'Failed to get team performance data' }, 
      { status: 500 }
    );
  }
};

// Authentication handled by middleware at application boundary
export const GET = withAuth(teamPerformanceHandler);