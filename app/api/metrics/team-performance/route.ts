import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext } from '@/lib/core';
import { dashboardFiltersSchema } from '@/lib/core/domain/value-objects/dashboard-filters';
import { z } from 'zod';

const filtersSchema = dashboardFiltersSchema.extend({ repositoryIds: z.string().regex(/^[1-9]\d*(,[1-9]\d*)*$/).refine(value => value.split(',').length <= 100 && value.split(',').every(id => Number.isSafeInteger(Number(id)))).optional() });

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
    const data = await service.getTeamPerformance(context.organizationId, repositoryId ? [repositoryId] : filters.data.repositoryIds?.split(','), teamId, timeRange);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error getting team-performance:', error);
    return NextResponse.json({ error: 'Failed to get team-performance' }, { status: 500 });
  }
};

export const GET = withAuth(handler);
