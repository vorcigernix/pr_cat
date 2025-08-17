import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator } from '@/lib/core';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get session via dependency injection
    const authService = await ServiceLocator.getAuthService();
    const session = await authService.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '14');
    const repositoryId = searchParams.get('repositoryId') || undefined;

    // Get the metrics service via dependency injection
    const metricsService = await ServiceLocator.getMetricsService();
    
    // Use the primary organization ID from the session
    const organizationId = session.organizations?.[0]?.id || 'demo-org-1';
    
    // Get time series data - no conditional logic needed!
    const data = await metricsService.getTimeSeries(organizationId, days, repositoryId);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting time series data:', error);
    return NextResponse.json(
      { error: 'Failed to get time series data' }, 
      { status: 500 }
    );
  }
}