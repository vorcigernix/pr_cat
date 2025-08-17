import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext } from '@/lib/core';

export const runtime = 'nodejs';

// Pure business logic handler
const repositoriesHandler = async (
  context: ApplicationContext,
  request: NextRequest
): Promise<NextResponse> => {
  try {
    // Get organization repository via dependency injection
    const organizationRepository = await ServiceLocator.getOrganizationRepository();
    
    // Get repositories from the authenticated context's organization
    const repositories = await organizationRepository.getRepositories(context.organizationId);
    
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
        id: context.organizationId,
        name: context.primaryOrganization?.name || 'Demo Organization'
      },
      is_tracked: repo.isTracked,
      private: repo.isPrivate,
      description: repo.description
    }));

    return NextResponse.json({ 
      repositories: formattedRepositories,
      organizationCount: context.organizations.length
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch repositories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

// Authentication handled by middleware
export const GET = withAuth(repositoriesHandler); 