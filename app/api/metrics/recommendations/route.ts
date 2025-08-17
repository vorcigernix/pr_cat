import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator } from '@/lib/core';

export const runtime = 'nodejs';
// Cache for 2 hours - workflow recommendations change less frequently
export const revalidate = 7200;
// Force dynamic rendering since we use headers()
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get auth service via dependency injection for demo mode compatibility
    const authService = await ServiceLocator.getAuthService();
    const session = await authService.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the metrics service via dependency injection
    // The container will automatically provide the right implementation (demo or production)
    const metricsService = await ServiceLocator.getMetricsService();
    
    // Use the primary organization ID from the session
    const organizationId = session.organizations?.[0]?.id || 'demo-org-1';
    
    // Get recommendations - no conditional logic needed!
    const recommendations = await metricsService.getRecommendations(organizationId);
    
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations' }, 
      { status: 500 }
    );
  }
}