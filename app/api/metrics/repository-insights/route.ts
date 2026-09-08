import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext } from '@/lib/core';
import { dashboardFiltersSchema } from '@/lib/core/domain/value-objects/dashboard-filters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = async (context: ApplicationContext, request: NextRequest): Promise<NextResponse> => {
  const filters = dashboardFiltersSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!filters.success) {
    return NextResponse.json({ error: 'Invalid dashboard filters' }, { status: 400 });
  }
  const { teamId, timeRange, repositoryId } = filters.data;
  try {
    const service = await ServiceLocator.getMetricsService();
    const data = await service.getRepositoryInsights(context.organizationId, teamId, timeRange, repositoryId);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error getting repository-insights:', error);
    return NextResponse.json({ error: 'Failed to get repository-insights' }, { status: 500 });
  }
};

export const GET = withAuth(handler);
