import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator } from '@/lib/core';

export async function GET(request: NextRequest) {
  try {
    // Get session via dependency injection
    const authService = await ServiceLocator.getAuthService();
    const session = await authService.getSession();
    
    if (!session || !session.user) {
      console.log('API /organizations: No authenticated session');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get organizations for the user
    const organizationRepository = await ServiceLocator.getOrganizationRepository();
    const organizations = session.organizations || [];
    
    console.log('API /organizations: Found', organizations.length, 'organizations');
    return NextResponse.json(organizations);
  } catch (error) {
    console.error('API /organizations: Error fetching user organizations:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch organizations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}