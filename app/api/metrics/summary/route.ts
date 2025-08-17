import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext } from '@/lib/core';

export const runtime = 'nodejs';
// Cache for 24 hours, revalidate in background
export const revalidate = 86400; // 24 hours in seconds
// Force dynamic rendering since we use headers()
export const dynamic = 'force-dynamic';

// Pure business logic handler with caching
const metricsSummaryHandler = async (
  context: ApplicationContext,
  request: NextRequest
): Promise<NextResponse> => {
  try {
    // Get the metrics service via dependency injection
    const metricsService = await ServiceLocator.getMetricsService();
    
    // Use organization ID from authenticated context
    const data = await metricsService.getSummary(context.organizationId);
    
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
};

// Authentication handled by middleware
export const GET = withAuth(metricsSummaryHandler);