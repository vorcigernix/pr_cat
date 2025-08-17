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

    // Get the metrics service via dependency injection
    const metricsService = await ServiceLocator.getMetricsService();
    
    // Use the primary organization ID from the session
    const organizationId = session.organizations?.[0]?.id || 'demo-org-1';
    const orgIdString = typeof organizationId === 'string' ? organizationId : organizationId.toString();
    
    // Get repository insights - no conditional logic needed!
    const data = await metricsService.getRepositoryInsights(orgIdString);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting repository insights:', error);
    return NextResponse.json(
      { error: 'Failed to get repository insights' }, 
      { status: 500 }
    );
  }
}