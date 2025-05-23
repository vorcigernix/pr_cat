import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { RepositoryService } from '@/lib/services/repository-service';
import { findUserById } from '@/lib/repositories';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user from database
    const user = await findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all organizations with their repositories for this user
    const organizationsWithRepositories = await RepositoryService.getRepositoriesForUserOrganizations(user.id);
    
    if (!organizationsWithRepositories || organizationsWithRepositories.length === 0) {
      return NextResponse.json({ 
        repositories: [], 
        organizationCount: 0,
        message: 'No organizations found. Please install the GitHub App to an organization first.' 
      }, { status: 200 });
    }

    // Flatten all repositories from all organizations into a single array
    let allRepositories: any[] = [];
    
    organizationsWithRepositories.forEach((orgWithRepos) => {
      // Add organization info to each repository for display purposes
      const enrichedRepos = orgWithRepos.repositories.map(repo => ({
        ...repo,
        organization: {
          id: orgWithRepos.organization.id,
          name: orgWithRepos.organization.name
        }
      }));
      allRepositories = [...allRepositories, ...enrichedRepos];
    });

    // Sort by organization name, then repository name
    allRepositories.sort((a, b) => {
      const orgCompare = a.organization.name.localeCompare(b.organization.name);
      if (orgCompare !== 0) return orgCompare;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ 
      repositories: allRepositories,
      organizationCount: organizationsWithRepositories.length
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch repositories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 