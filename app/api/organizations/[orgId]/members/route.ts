import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrganizationMembers, searchUsers } from '@/lib/repositories/team-repository';
import { getOrganizationRole } from '@/lib/repositories/user-repository';
import { verifyBotId } from '@/lib/botid-verification';

export const runtime = 'nodejs';

// GET - List organization members or search users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    // Check for bot before proceeding
    const botVerification = await verifyBotId();
    if (botVerification) {
      return botVerification;
    }

    const { orgId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgIdInt = parseInt(orgId, 10);
    if (isNaN(orgIdInt)) {
      return NextResponse.json({ error: 'Invalid organization ID' }, { status: 400 });
    }

    // Authorization: Check if the user is part of the organization
    const userRole = await getOrganizationRole(session.user.id, orgIdInt);
    if (!userRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('search');

    let members;
    if (searchTerm) {
      members = await searchUsers(orgIdInt, searchTerm);
    } else {
      members = await getOrganizationMembers(orgIdInt);
    }

    return NextResponse.json(members);

  } catch (error) {
    console.error('Error fetching organization members:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch organization members', details: errorMessage }, { status: 500 });
  }
}