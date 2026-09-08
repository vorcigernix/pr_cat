import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext, TimeRange } from '@/lib/core';
import { z } from 'zod';
import { dashboardFiltersSchema } from '@/lib/core/domain/value-objects/dashboard-filters';

export const runtime = 'nodejs';

const categoryFiltersSchema = dashboardFiltersSchema.extend({
  format: z.enum(['total', 'timeseries']).default('total'),
});

// Pure business logic handler
const categoryDistributionHandler = async (
  context: ApplicationContext,
  request: NextRequest
): Promise<NextResponse> => {
  try {
    // Parse query parameters
    const filters = categoryFiltersSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!filters.success) {
      return NextResponse.json({ error: 'Invalid category filters' }, { status: 400 });
    }
    const { timeRange, format, teamId, repositoryId } = filters.data;

    // Get pull request repository via dependency injection
    const prRepository = await ServiceLocator.getPullRequestRepository();
    
    // Use organization ID from authenticated context
    const organizationId = context.organizationId;
    
    if (format === 'timeseries') {
      // Get time series data for category distribution
      const days = Number.parseInt(timeRange, 10);
      
      const data = await prRepository.getCategoryTimeSeries(
        organizationId, 
        days, 
        teamId,
        repositoryId
      );
      return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
    } else {
      // Get total category distribution
      const timeRangeObj = TimeRange.fromPreset(timeRange);
      const data = await prRepository.getCategoryDistribution(
        organizationId, 
        timeRangeObj, 
        teamId,
        repositoryId
      );
      return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
    }
  } catch (error) {
    console.error('Error getting category distribution:', error);
    return NextResponse.json(
      { error: 'Failed to get category distribution' }, 
      { status: 500 }
    );
  }
};

// Authentication handled by middleware
export const GET = withAuth(categoryDistributionHandler);
