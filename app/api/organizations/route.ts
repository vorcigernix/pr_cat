import { NextRequest, NextResponse } from 'next/server';
import { getUserWithOrganizations } from '@/lib/auth-context';

export async function GET(request: NextRequest) {
  try {
    // Get user context with organizations from database
    const { organizations } = await getUserWithOrganizations(request);
    
    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    
    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch organizations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}