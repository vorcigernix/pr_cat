import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator } from '@/lib/core';

export const runtime = 'nodejs';
// Cache for 24 hours, revalidate in background
export const revalidate = 86400; // 24 hours in seconds
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
    const metricsService = await ServiceLocator.getMetricsService();
    
    // Use the primary organization ID from the session
    const organizationId = session.organizations?.[0]?.id || 'demo-org-1';
    
    // Get metrics summary - no conditional logic needed!
    const data = await metricsService.getSummary(organizationId);
    
    // Set appropriate headers
    const headers = new Headers();
    const etag = `"${JSON.stringify(data).length}-${data.lastUpdated}"`;
    headers.set('ETag', etag);
    headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    
    // Check if client has cached version
    const clientETag = request.headers.get('if-none-match');
    if (clientETag === etag) {
      return new NextResponse(null, { status: 304, headers });
    }
    
    headers.set('Content-Type', 'application/json');
    headers.set('X-Cache-Strategy', 'daily-complete-data');
    headers.set('X-Data-Date', data.dataUpToDate);
    
    return NextResponse.json(data, { headers });
  } catch (error) {
    console.error('Error getting metrics summary:', error);
    return NextResponse.json(
      { error: 'Failed to get metrics summary' }, 
      { status: 500 }
    );
  }
}