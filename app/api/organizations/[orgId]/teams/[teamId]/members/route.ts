import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { 
  getTeamMembers, 
  addTeamMember, 
  updateTeamMember, 
  removeTeamMember,
  getTeamWithMembers,
  getOrganizationMembers 
} from '@/lib/repositories/team-repository';
import { getOrganizationRole } from '@/lib/repositories/user-repository';
import { z } from 'zod';

export const runtime = 'nodejs';

// GET - List team members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; teamId: string }> }
) {
  try {
    const { orgId, teamId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgIdInt = parseInt(orgId, 10);
    const teamIdInt = parseInt(teamId, 10);
    if (isNaN(orgIdInt) || isNaN(teamIdInt)) {
      return NextResponse.json({ error: 'Invalid organization or team ID' }, { status: 400 });
    }

    // Authorization: Check if the user is part of the organization
    const userRole = await getOrganizationRole(session.user.id, orgIdInt);
    if (!userRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify team exists and belongs to organization
    const team = await getTeamWithMembers(teamIdInt);
    if (!team || team.organization_id !== orgIdInt) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const members = await getTeamMembers(teamIdInt);
    return NextResponse.json(members);

  } catch (error) {
    console.error('Error fetching team members:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch team members', details: errorMessage }, { status: 500 });
  }
}

// POST - Add a team member
const addMemberSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  role: z.enum(['member', 'lead', 'admin']).optional().default('member')
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; teamId: string }> }
) {
  try {
    const { orgId, teamId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgIdInt = parseInt(orgId, 10);
    const teamIdInt = parseInt(teamId, 10);
    if (isNaN(orgIdInt) || isNaN(teamIdInt)) {
      return NextResponse.json({ error: 'Invalid organization or team ID' }, { status: 400 });
    }

    // Authorization: Check if the user is part of the organization
    const userRole = await getOrganizationRole(session.user.id, orgIdInt);
    if (!userRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify team exists and belongs to organization
    const team = await getTeamWithMembers(teamIdInt);
    if (!team || team.organization_id !== orgIdInt) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const body = await request.json();
    
    // Validate request body with zod
    const validationResult = addMemberSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: errors 
      }, { status: 400 });
    }
    
    const { user_id, role } = validationResult.data;

    // Verify the user is part of the organization
    const targetUserRole = await getOrganizationRole(user_id, orgIdInt);
    if (!targetUserRole) {
      return NextResponse.json({ error: 'User is not a member of this organization' }, { status: 400 });
    }

    const memberData = {
      team_id: teamIdInt,
      user_id,
      role,
      joined_at: new Date().toISOString()
    };

    const newMember = await addTeamMember(memberData);
    return NextResponse.json(newMember, { status: 201 });

  } catch (error) {
    console.error('Error adding team member:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    if (errorMessage.includes('User is already a member of this team')) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to add team member', details: errorMessage }, { status: 500 });
  }
}

// PUT - Update team member role
const updateMemberSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  role: z.enum(['member', 'lead', 'admin'])
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; teamId: string }> }
) {
  try {
    const { orgId, teamId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgIdInt = parseInt(orgId, 10);
    const teamIdInt = parseInt(teamId, 10);
    if (isNaN(orgIdInt) || isNaN(teamIdInt)) {
      return NextResponse.json({ error: 'Invalid organization or team ID' }, { status: 400 });
    }

    // Authorization: Check if the user is part of the organization
    const userRole = await getOrganizationRole(session.user.id, orgIdInt);
    if (!userRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify team exists and belongs to organization
    const team = await getTeamWithMembers(teamIdInt);
    if (!team || team.organization_id !== orgIdInt) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const body = await request.json();
    
    // Validate request body with zod
    const validationResult = updateMemberSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: errors 
      }, { status: 400 });
    }
    
    const { user_id, role } = validationResult.data;

    const updatedMember = await updateTeamMember(teamIdInt, user_id, { role });
    if (!updatedMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    return NextResponse.json(updatedMember);

  } catch (error) {
    console.error('Error updating team member:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to update team member', details: errorMessage }, { status: 500 });
  }
}

// DELETE - Remove team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; teamId: string }> }
) {
  try {
    const { orgId, teamId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgIdInt = parseInt(orgId, 10);
    const teamIdInt = parseInt(teamId, 10);
    if (isNaN(orgIdInt) || isNaN(teamIdInt)) {
      return NextResponse.json({ error: 'Invalid organization or team ID' }, { status: 400 });
    }

    // Authorization: Check if the user is part of the organization
    const userRole = await getOrganizationRole(session.user.id, orgIdInt);
    if (!userRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify team exists and belongs to organization
    const team = await getTeamWithMembers(teamIdInt);
    if (!team || team.organization_id !== orgIdInt) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get user_id from query params
    const url = new URL(request.url);
    const user_id = url.searchParams.get('user_id');
    
    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const success = await removeTeamMember(teamIdInt, user_id);
    if (!success) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Team member removed successfully' });

  } catch (error) {
    console.error('Error removing team member:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to remove team member', details: errorMessage }, { status: 500 });
  }
}