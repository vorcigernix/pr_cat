import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTeamWithMembers, updateTeam, deleteTeam } from '@/lib/repositories/team-repository';
import { getOrganizationRole } from '@/lib/repositories/user-repository';
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

    const team = await getTeamWithMembers(teamIdInt);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Ensure the team belongs to the organization
    if (team.organization_id !== orgIdInt) {
      return NextResponse.json({ error: 'Team not found in this organization' }, { status: 404 });
    }

    return NextResponse.json(team);

  } catch (error) {
    console.error('Error fetching team:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch team', details: errorMessage }, { status: 500 });
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
    const existingTeam = await getTeamWithMembers(teamIdInt);
    if (!existingTeam || existingTeam.organization_id !== orgIdInt) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

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

    const updatedTeam = await updateTeam(teamIdInt, updateData);
    if (!updatedTeam) {
      return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
    }

    return NextResponse.json(updatedTeam);

  } catch (error) {
    console.error('Error updating team:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    if (errorMessage.includes('UNIQUE constraint failed: teams.organization_id, teams.name')) {
      return NextResponse.json({ error: 'A team with this name already exists for this organization.', details: errorMessage }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update team', details: errorMessage }, { status: 500 });
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
    const existingTeam = await getTeamWithMembers(teamIdInt);
    if (!existingTeam || existingTeam.organization_id !== orgIdInt) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const success = await deleteTeam(teamIdInt);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Team deleted successfully' });

  } catch (error) {
    console.error('Error deleting team:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to delete team', details: errorMessage }, { status: 500 });
  }
}