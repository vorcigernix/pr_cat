import { NextRequest, NextResponse } from 'next/server';
import { Pagination, ServiceLocator, withAuth, type ApplicationContext } from '@/lib/core';
import type { MetricsSummary, PaginatedResult, PullRequestSummary } from '@/lib/core';
import { dashboardFiltersSchema } from '@/lib/core/domain/value-objects/dashboard-filters';
import { z } from 'zod';

export const runtime = 'nodejs';

type DashboardInclude = 'repositories' | 'metrics-summary' | 'recent-prs';

type DashboardRepository = {
  id: string;
  name: string;
  full_name: string;
  organization: {
    id: string;
    name: string;
  };
  is_tracked: boolean;
  private: boolean;
  description: string | null;
};

type DashboardDataResponse = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  organizations: Array<{
    id: string;
    name: string | null;
    role?: string;
  }>;
  primaryOrganization: {
    id: string;
    name: string | null;
  };
  repositories?: DashboardRepository[];
  metricsSummary?: MetricsSummary;
  recentPRs?: PaginatedResult<PullRequestSummary>;
};

function parseInclude(searchParams: URLSearchParams): Set<DashboardInclude> {
  const includeValues = searchParams.get('include')?.split(',') ?? [];
  return new Set(
    includeValues
      .map((value) => value.trim())
      .filter((value): value is DashboardInclude =>
        value === 'repositories' ||
        value === 'metrics-summary' ||
        value === 'recent-prs'
      )
  );
}

const filtersSchema = dashboardFiltersSchema.extend({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

async function handler(context: ApplicationContext, request: NextRequest) {
  const filters = filtersSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!filters.success) return NextResponse.json({ error: 'Invalid dashboard filters' }, { status: 400 });
  const { teamId, timeRange, repositoryId, page, limit } = filters.data;
  const { user, organizations, primaryOrganization, organizationId } = context;
  try {
    const include = parseInclude(request.nextUrl.searchParams);
    const repositoriesPromise: Promise<DashboardRepository[] | undefined> = include.has('repositories')
      ? (async () => {
          const organizationRepository = await ServiceLocator.getOrganizationRepository();
          const repositories = await organizationRepository.getRepositories(organizationId);
          return repositories.map((repository) => ({
            id: repository.id,
            name: repository.name,
            full_name: repository.fullName,
            organization: {
              id: organizationId,
              name: primaryOrganization.name ?? 'Demo Organization',
            },
            is_tracked: repository.isTracked,
            private: repository.isPrivate,
            description: repository.description,
          }));
        })()
      : Promise.resolve(undefined);

    const metricsSummaryPromise: Promise<MetricsSummary | undefined> = include.has('metrics-summary')
      ? (async () => {
          const metricsService = await ServiceLocator.getMetricsService();
          return metricsService.getSummary(organizationId, teamId, timeRange, repositoryId);
        })()
      : Promise.resolve(undefined);

    const recentPullRequestsPromise: Promise<PaginatedResult<PullRequestSummary> | undefined> = include.has('recent-prs')
      ? (async () => {
          const prRepository = await ServiceLocator.getPullRequestRepository();
          return prRepository.getRecent(
            organizationId,
            Pagination.create(page, limit),
            teamId,
            timeRange,
            repositoryId
          );
        })()
      : Promise.resolve(undefined);

    const [repositories, metricsSummary, recentPRs] = await Promise.all([
      repositoriesPromise,
      metricsSummaryPromise,
      recentPullRequestsPromise,
    ]);

    const response: DashboardDataResponse = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      organizations: organizations.map(org => ({
        id: String(org.id),
        name: org.name,
      })),
      primaryOrganization: {
        id: organizationId,
        name: primaryOrganization.name
      }
    };

    if (repositories) {
      response.repositories = repositories;
    }

    if (metricsSummary) {
      response.metricsSummary = metricsSummary;
    }

    if (recentPRs) {
      response.recentPRs = recentPRs;
    }

    return NextResponse.json(response, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    
    if (error instanceof Error && error.message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 

export const GET = withAuth(handler);
