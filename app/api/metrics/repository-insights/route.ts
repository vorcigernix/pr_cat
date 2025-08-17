import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext } from '@/lib/core';

export const runtime = 'nodejs';

// Pure business logic handler
const repositoryInsightsHandler = async (
  context: ApplicationContext,
  request: NextRequest
): Promise<NextResponse> => {
  try {
    // Get the metrics service via dependency injection
    const metricsService = await ServiceLocator.getMetricsService();
    
    // Use organization ID from authenticated context
    const data = await metricsService.getRepositoryInsights(context.organizationId);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting repository insights:', error);
    return NextResponse.json(
      { error: 'Failed to get repository insights' }, 
      { status: 500 }
    );
  }
};

// Authentication handled by middleware
export const GET = withAuth(repositoryInsightsHandler);