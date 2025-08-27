import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext } from '@/lib/core';

export const runtime = 'nodejs';
// Cache for 2 hours - workflow recommendations change less frequently
export const revalidate = 7200;
// Force dynamic rendering since we use headers()
export const dynamic = 'force-dynamic';

// Pure business logic handler - no authentication concerns
const recommendationsHandler = async (
  context: ApplicationContext,
  request: NextRequest
): Promise<NextResponse> => {
  try {
    // Parse team filtering parameters
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId');
    const timeRange = searchParams.get('timeRange');
    
    console.log(`[Recommendations] Request params: orgId=${context.organizationId}, teamId=${teamId}, timeRange=${timeRange}`);
    
    // Get the metrics service via dependency injection
    const metricsService = await ServiceLocator.getMetricsService();
    
    // Use organization ID from authenticated context with team filtering
    const recommendations = await metricsService.getRecommendations(
      context.organizationId,
      teamId ? parseInt(teamId) : undefined,
      timeRange || undefined
    );
    
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations' }, 
      { status: 500 }
    );
  }
};

// Authentication handled by middleware at application boundary
export const GET = withAuth(recommendationsHandler);