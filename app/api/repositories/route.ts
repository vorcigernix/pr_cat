import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator } from '@/lib/core';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get session via dependency injection
    const authService = await ServiceLocator.getAuthService();
    const session = await authService.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization repository via dependency injection
    const organizationRepository = await ServiceLocator.getOrganizationRepository();
    
    // Get repositories from the user's primary organization
    const organizationId = session.organizations?.[0]?.id || 'demo-org-1';
    const repositories = await organizationRepository.getRepositories(organizationId);
    
    if (!repositories || repositories.length === 0) {
      return NextResponse.json({ 
        repositories: [], 
        organizationCount: 0,
        message: 'No repositories found. Please install the GitHub App to an organization first.' 
      }, { status: 200 });
    }

    // Format repositories for the component
    const formattedRepositories = repositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.fullName,
      organization: {
        id: organizationId,
        name: session.organizations[0]?.name || 'Demo Organization'
      },
      is_tracked: repo.isTracked,
      private: repo.isPrivate,
      description: repo.description
    }));

    return NextResponse.json({ 
      repositories: formattedRepositories,
      organizationCount: session.organizations.length
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch repositories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 