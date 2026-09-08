import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext, Pagination } from '@/lib/core';
import { dashboardFiltersSchema } from '@/lib/core/domain/value-objects/dashboard-filters';
import { z } from 'zod';

export const runtime = 'nodejs';
const filtersSchema = dashboardFiltersSchema.extend({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const handler = async (context: ApplicationContext, request: NextRequest): Promise<NextResponse> => {
  const filters = filtersSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!filters.success) return NextResponse.json({ error: 'Invalid dashboard filters' }, { status: 400 });
  const { page, limit, teamId, timeRange, repositoryId } = filters.data;
  try {
    const repository = await ServiceLocator.getPullRequestRepository();
    const data = await repository.getRecent(context.organizationId, Pagination.create(page, limit), teamId, timeRange, repositoryId);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error getting recent pull requests:', error);
    return NextResponse.json({ error: 'Failed to get recent pull requests' }, { status: 500 });
  }
};

export const GET = withAuth(handler);
