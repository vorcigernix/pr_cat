import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext, Pagination } from '@/lib/core';

export const runtime = 'nodejs';

// Pure business logic handler
const recentPullRequestsHandler = async (
  context: ApplicationContext,
  request: NextRequest
): Promise<NextResponse> => {
  try {
    // Parse query parameters for pagination and team filtering
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const teamId = searchParams.get('teamId');
    const timeRange = searchParams.get('timeRange') || '14d';
    
    // Create pagination object
    const pagination = Pagination.create(page, limit);

    // Get pull request repository via dependency injection
    const prRepository = await ServiceLocator.getPullRequestRepository();
    
    // Use organization ID from authenticated context with team filtering
    const result = await prRepository.getRecent(
      context.organizationId, 
      pagination,
      teamId ? parseInt(teamId) : undefined,
      timeRange
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting recent pull requests:', error);
    return NextResponse.json(
      { error: 'Failed to get recent pull requests' }, 
      { status: 500 }
    );
  }
};

// Authentication handled by middleware
export const GET = withAuth(recentPullRequestsHandler);