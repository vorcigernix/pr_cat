import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { 
  getTeamMembers,
  updateTeamMember,
  removeTeamMember,
} from '@/lib/repositories/team-repository';
import { TeamService } from '@/lib/services';
import { unauthorized, badRequest, errorResponse } from '@/lib/api-errors';
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
    if (!session?.user?.id) throw unauthorized();

    const orgIdInt = parseInt(orgId, 10);
    const teamIdInt = parseInt(teamId, 10);
    if (isNaN(orgIdInt) || isNaN(teamIdInt)) throw badRequest('Invalid organization or team ID');

    // Authorization + existence via service call
    await TeamService.getTeamWithMembers(session.user.id, teamIdInt, orgIdInt);

    const members = await getTeamMembers(teamIdInt);
    return NextResponse.json(members);

  } catch (error) {
    console.error('Error fetching team members:', error);
    return errorResponse(error, 'Failed to fetch team members');
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
    if (!session?.user?.id) throw unauthorized();

    const orgIdInt = parseInt(orgId, 10);
    const teamIdInt = parseInt(teamId, 10);
    if (isNaN(orgIdInt) || isNaN(teamIdInt)) throw badRequest('Invalid organization or team ID');

    // Authorization + existence via service call
    await TeamService.getTeamWithMembers(session.user.id, teamIdInt, orgIdInt);

    const body = await request.json();
    
    // Validate request body with zod
    const validationResult = addMemberSchema.safeParse(body);
    if (!validationResult.success) throw badRequest('Validation failed', validationResult.error.flatten());
    
    const { user_id, role } = validationResult.data;

    const newMember = await TeamService.addTeamMember(session.user.id, teamIdInt, orgIdInt, {
      userId: user_id,
      role,
    });
    return NextResponse.json(newMember, { status: 201 });

  } catch (error) {
    console.error('Error adding team member:', error);
    return errorResponse(error, 'Failed to add team member');
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
    if (!session?.user?.id) throw unauthorized();

    const orgIdInt = parseInt(orgId, 10);
    const teamIdInt = parseInt(teamId, 10);
    if (isNaN(orgIdInt) || isNaN(teamIdInt)) throw badRequest('Invalid organization or team ID');

    // Authorization + existence via service call
    await TeamService.getTeamWithMembers(session.user.id, teamIdInt, orgIdInt);

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
    return errorResponse(error, 'Failed to update team member');
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
    if (!session?.user?.id) throw unauthorized();

    const orgIdInt = parseInt(orgId, 10);
    const teamIdInt = parseInt(teamId, 10);
    if (isNaN(orgIdInt) || isNaN(teamIdInt)) throw badRequest('Invalid organization or team ID');

    // Authorization + existence via service call
    await TeamService.getTeamWithMembers(session.user.id, teamIdInt, orgIdInt);

    // Get user_id from query params
    const url = new URL(request.url);
    const user_id = url.searchParams.get('user_id');
    
    if (!user_id) throw badRequest('User ID is required');

    const success = await removeTeamMember(teamIdInt, user_id);
    if (!success) return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    return NextResponse.json({ message: 'Team member removed successfully' });

  } catch (error) {
    console.error('Error removing team member:', error);
    return errorResponse(error, 'Failed to remove team member');
  }
}