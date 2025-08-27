import { NextRequest, NextResponse } from 'next/server';
import { getUserWithOrganizations } from '@/lib/auth-context';


export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include')?.split(',') || [];
    
    // Use cached user context
    const { user, organizations, primaryOrganization } = await getUserWithOrganizations(request);
    
    const response: any = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        role: org.role
      })),
      primaryOrganization: {
        id: primaryOrganization.id,
        name: primaryOrganization.name
      }
    };

    // Conditionally include additional data based on query params
    if (include.includes('repositories')) {
      // Fetch repositories data
      const repositoriesResponse = await fetch(`${request.nextUrl.origin}/api/repositories`, {
        headers: request.headers
      });
      if (repositoriesResponse.ok) {
        const repositoriesData = await repositoriesResponse.json();
        response.repositories = repositoriesData.repositories;
      }
    }

    if (include.includes('metrics-summary')) {
      // Fetch metrics summary
      const metricsResponse = await fetch(`${request.nextUrl.origin}/api/metrics/summary`, {
        headers: request.headers
      });
      if (metricsResponse.ok) {
        response.metricsSummary = await metricsResponse.json();
      }
    }

    if (include.includes('recent-prs')) {
      // Fetch recent PRs
      const prsResponse = await fetch(`${request.nextUrl.origin}/api/pull-requests/recent`, {
        headers: request.headers
      });
      if (prsResponse.ok) {
        response.recentPRs = await prsResponse.json();
      }
    }

    return NextResponse.json(response);
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