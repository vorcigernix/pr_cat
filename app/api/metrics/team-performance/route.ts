import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext } from '@/lib/core';

export const runtime = 'nodejs';

// Pure business logic handler - no authentication concerns
const teamPerformanceHandler = async (
  context: ApplicationContext,
  request: NextRequest
): Promise<NextResponse> => {
  try {
    // Parse query parameters including team filtering
    const searchParams = request.nextUrl.searchParams;
    const repositoryIdsParam = searchParams.get('repositoryIds');
    const repositoryIds = repositoryIdsParam ? repositoryIdsParam.split(',') : undefined;
    const teamId = searchParams.get('teamId');
    const timeRange = searchParams.get('timeRange') || '14d';

    // Get the metrics service via dependency injection
    const metricsService = await ServiceLocator.getMetricsService();
    
    // Use organization ID from authenticated context with team filtering
    const data = await metricsService.getTeamPerformance(
      context.organizationId, 
      repositoryIds,
      teamId ? parseInt(teamId) : undefined,
      timeRange
    );
    
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