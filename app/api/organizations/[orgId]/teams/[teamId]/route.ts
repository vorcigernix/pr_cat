import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { TeamService } from '@/lib/services';
import { unauthorized, badRequest, notFound, errorResponse } from '@/lib/api-errors';
import { z } from 'zod';

export const runtime = 'nodejs';

// GET - Get a specific team with members
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

    const team = await TeamService.getTeamWithMembers(session.user.id, teamIdInt, orgIdInt);
    return NextResponse.json(team);

  } catch (error) {
    console.error('Error fetching team:', error);
    return errorResponse(error, 'Failed to fetch team');
  }
}

// PUT - Update a team
const updateTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100, "Team name must be 100 characters or less").optional(),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g., #FF5733)").optional()
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

    const body = await request.json();
    
    // Validate request body with zod
    const validationResult = updateTeamSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: errors 
      }, { status: 400 });
    }
    
    const updateData = validationResult.data;
    
    // Clean up strings
    if (updateData.name) {
      updateData.name = updateData.name.trim();
    }
    if (updateData.description) {
      updateData.description = updateData.description.trim();
    }
    if (updateData.color) {
      updateData.color = updateData.color.trim();
    }

    const updatedTeam = await TeamService.updateTeam(
      session.user.id,
      teamIdInt,
      orgIdInt,
      updateData
    );
    return NextResponse.json(updatedTeam);

  } catch (error) {
    console.error('Error updating team:', error);
    return errorResponse(error, 'Failed to update team');
  }
}

// DELETE - Delete a team
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

    // Reuse update permission checks inside service by attempting a noop update or extend service with delete
    const success = await (async () => {
      // Implement delete via repository for now, reusing service authorization by fetching with service
      await TeamService.getTeamWithMembers(session.user.id, teamIdInt, orgIdInt);
      const { deleteTeam } = await import('@/lib/repositories/team-repository');
      return deleteTeam(teamIdInt);
    })();

    if (!success) throw notFound('Failed to delete team');
    return NextResponse.json({ message: 'Team deleted successfully' });

  } catch (error) {
    console.error('Error deleting team:', error);
    return errorResponse(error, 'Failed to delete team');
  }
}