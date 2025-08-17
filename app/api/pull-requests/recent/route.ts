import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext, Pagination } from '@/lib/core';

export const runtime = 'nodejs';

// Pure business logic handler
const recentPullRequestsHandler = async (
  context: ApplicationContext,
  request: NextRequest
): Promise<NextResponse> => {
  try {
    // Parse query parameters for pagination
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Create pagination object
    const pagination = Pagination.create(page, limit);

    // Get pull request repository via dependency injection
    const prRepository = await ServiceLocator.getPullRequestRepository();
    
    // Use organization ID from authenticated context
    const result = await prRepository.getRecent(context.organizationId, pagination);
    
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