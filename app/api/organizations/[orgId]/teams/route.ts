import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTeamsByOrganizationWithMembers, createTeam } from '@/lib/repositories/team-repository';
import { getOrganizationRole } from '@/lib/repositories/user-repository';
import { z } from 'zod';

export const runtime = 'nodejs';

// GET - List all teams for an organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
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

    const teams = await getTeamsByOrganizationWithMembers(orgIdInt);
    return NextResponse.json(teams);

  } catch (error) {
    console.error('Error fetching organization teams:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch teams', details: errorMessage }, { status: 500 });
  }
}

// POST - Create a new team
const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100, "Team name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g., #FF5733)").optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
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
      return NextResponse.json({ error: 'Forbidden. User not part of the organization.' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate request body with zod
    const validationResult = createTeamSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: errors 
      }, { status: 400 });
    }
    
    const { name, description, color } = validationResult.data;
    
    const newTeamData = {
      organization_id: orgIdInt,
      name: name.trim(),
      description: description?.trim() || null,
      color: color?.trim() || null,
    };

    const createdTeam = await createTeam(newTeamData);
    return NextResponse.json(createdTeam, { status: 201 });

  } catch (error) {
    console.error('Error creating team:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    if (errorMessage.includes('UNIQUE constraint failed: teams.organization_id, teams.name')) {
      return NextResponse.json({ error: 'A team with this name already exists for this organization.', details: errorMessage }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create team', details: errorMessage }, { status: 500 });
  }
}