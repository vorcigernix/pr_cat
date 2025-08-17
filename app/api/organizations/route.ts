import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext } from '@/lib/core';

// Pure business logic handler
const organizationsHandler = async (
  context: ApplicationContext,
  request: NextRequest
): Promise<NextResponse> => {
  try {
    // Organizations are already available in the authenticated context
    const organizations = context.organizations;
    
    console.log('API /organizations: Found', organizations.length, 'organizations');
    return NextResponse.json(organizations);
  } catch (error) {
    console.error('API /organizations: Error fetching user organizations:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch organizations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

// Authentication handled by middleware
export const GET = withAuth(organizationsHandler);