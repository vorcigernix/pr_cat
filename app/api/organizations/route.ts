import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { findUserWithOrganizations } from '@/lib/repositories/user-repository';

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated session
    const session = await auth();
    
    if (!session || !session.user) {
      console.log('API /organizations: No authenticated session');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const userId = session.user.id;
    console.log('API /organizations: Fetching organizations for user:', userId);
    
    // Directly fetch user with organizations from database
    const result = await findUserWithOrganizations(userId);
    
    if (!result) {
      console.log('API /organizations: User not found in database');
      return NextResponse.json({ 
        error: 'User not found in database',
        userId 
      }, { status: 404 });
    }
    
    if (!result.organizations || result.organizations.length === 0) {
      console.log('API /organizations: No organizations found for user');
      return NextResponse.json([]);
    }
    
    console.log('API /organizations: Found', result.organizations.length, 'organizations');
    return NextResponse.json(result.organizations);
  } catch (error) {
    console.error('API /organizations: Error fetching user organizations:', error);
    
    return NextResponse.json({ 
      error: 'Failed to fetch organizations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}