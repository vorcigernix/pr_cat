import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator } from '@/lib/core';
import { TimeRange } from '@/lib/core';

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
    const timeRange = searchParams.get('timeRange') || '30d';
    const format = searchParams.get('format') || 'total';

    // Get pull request repository via dependency injection
    const prRepository = await ServiceLocator.getPullRequestRepository();
    
    // Use the primary organization ID from the session
    const organizationId = session.organizations?.[0]?.id || 'demo-org-1';
    
    if (format === 'timeseries') {
      // Get time series data for category distribution
      const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
      const days = daysMap[timeRange] || 30;
      
      const data = await prRepository.getCategoryTimeSeries(organizationId, days);
      return NextResponse.json(data);
    } else {
      // Get total category distribution
      const timeRangeObj = TimeRange.fromPreset(timeRange as '7d' | '30d' | '90d');
      const data = await prRepository.getCategoryDistribution(organizationId, timeRangeObj);
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error getting category distribution:', error);
    return NextResponse.json(
      { error: 'Failed to get category distribution' }, 
      { status: 500 }
    );
  }
}