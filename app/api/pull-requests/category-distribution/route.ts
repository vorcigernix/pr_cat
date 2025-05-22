import { NextRequest, NextResponse } from 'next/server';
import * as PRRepository from '@/lib/repositories/pr-repository';
import * as OrganizationRepository from '@/lib/repositories/organization-repository';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the user's active organization
    const organizations = await OrganizationRepository.getUserOrganizationsWithRole(session.user.id);
    if (!organizations || organizations.length === 0) {
      return NextResponse.json({ error: 'No organizations found' }, { status: 404 });
    }

    // For simplicity, use the first organization
    const orgId = organizations[0].id;

    // Get PR count by category
    const categoryDistribution = await PRRepository.getPullRequestCountByCategory(orgId);
    
    // Ensure we don't have null category names in the response
    const formattedDistribution = categoryDistribution.map(item => ({
      ...item,
      category_name: item.category_name || 'Uncategorized'
    }));

    return NextResponse.json(formattedDistribution);
  } catch (error) {
    console.error('Error fetching category distribution:', error);
    return NextResponse.json({ error: 'Failed to fetch category distribution' }, { status: 500 });
  }
} 