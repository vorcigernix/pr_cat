import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator } from '@/lib/core';
import { Pagination } from '@/lib/core';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get auth service via dependency injection for demo mode compatibility
    const authService = await ServiceLocator.getAuthService();
    const session = await authService.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters for pagination
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Create pagination object
    const pagination = Pagination.create(page, limit);

    // Get pull request repository via dependency injection
    const prRepository = await ServiceLocator.getPullRequestRepository();
    
    // Use the primary organization ID from the session
    const organizationId = session.organizations?.[0]?.id || 'demo-org-1';
    
    // Get recent pull requests - no conditional logic needed!
    const result = await prRepository.getRecent(organizationId, pagination);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting recent pull requests:', error);
    return NextResponse.json(
      { error: 'Failed to get recent pull requests' }, 
      { status: 500 }
    );
  }
}