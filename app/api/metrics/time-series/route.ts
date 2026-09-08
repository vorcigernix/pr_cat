import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext } from '@/lib/core';
import { dashboardFiltersSchema } from '@/lib/core/domain/value-objects/dashboard-filters';
import { z } from 'zod';

const filtersSchema = dashboardFiltersSchema.extend({ days: z.coerce.number().int().min(1).max(366).optional() });

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = async (context: ApplicationContext, request: NextRequest): Promise<NextResponse> => {
  const filters = filtersSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!filters.success) {
    return NextResponse.json({ error: 'Invalid dashboard filters' }, { status: 400 });
  }
  const { teamId, timeRange, repositoryId } = filters.data;
  try {
    const service = await ServiceLocator.getMetricsService();
    const data = await service.getTimeSeries(context.organizationId, filters.data.days ?? Number.parseInt(timeRange, 10), repositoryId, teamId);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error getting time-series:', error);
    return NextResponse.json({ error: 'Failed to get time-series' }, { status: 500 });
  }
};

export const GET = withAuth(handler);
