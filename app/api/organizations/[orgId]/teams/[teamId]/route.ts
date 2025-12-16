import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext } from '@/lib/core';
import { TeamService } from '@/lib/services';
import { unauthorized, badRequest, notFound, errorResponse } from '@/lib/api-errors';
import { z } from 'zod';

export const runtime = 'nodejs';

// Team details handler
const teamDetailsHandler = async (
  context: ApplicationContext,
  request: NextRequest,
  params: { orgId: string; teamId: string }
): Promise<NextResponse> => {
  try {
    const { orgId, teamId } = params;

    // Handle demo mode
    if (orgId.startsWith('demo-')) {
      const demoTeamDetails = {
        id: parseInt(teamId, 10),
        name: teamId === '1' ? 'Frontend Team' : 'Backend Team',
        description: teamId === '1' ? 'Responsible for UI/UX and frontend development' : 'API development and infrastructure',
        color: teamId === '1' ? '#3B82F6' : '#10B981',
        organization_id: orgId,
        member_count: teamId === '1' ? 4 : 3,
        created_at: new Date(teamId === '1' ? '2023-01-15' : '2023-02-01'),
        updated_at: new Date('2024-01-15'),
        members: teamId === '1' ? [
          {
            id: 1,
            user_id: 'demo-user-1',
            team_id: 1,
            role: 'lead',
            joined_at: new Date('2023-01-15'),
            user: {
              id: 'demo-user-1',
              login: 'alice-smith',
              name: 'Alice Smith',
              email: 'alice@example-corp.com',
              avatarUrl: 'https://github.com/alice.png'
            }
          },
          {
            id: 2,
            user_id: 'demo-user-2', 
            team_id: 1,
            role: 'member',
            joined_at: new Date('2023-02-01'),
            user: {
              id: 'demo-user-2',
              login: 'bob-johnson',
              name: 'Bob Johnson',
              email: 'bob@example-corp.com',
              avatarUrl: 'https://github.com/bob.png'
            }
          }
        ] : [
          {
            id: 3,
            user_id: 'demo-user-3',
            team_id: 2,
            role: 'lead',
            joined_at: new Date('2023-02-01'),
            user: {
              id: 'demo-user-3',
              login: 'charlie-brown',
              name: 'Charlie Brown',
              email: 'charlie@example-corp.com',
              avatarUrl: 'https://github.com/charlie.png'
            }
          }
        ]
      };
      return NextResponse.json(demoTeamDetails);
    }

    const orgIdInt = parseInt(orgId, 10);
    const teamIdInt = parseInt(teamId, 10);
    if (isNaN(orgIdInt) || isNaN(teamIdInt)) throw badRequest('Invalid organization or team ID');

    const team = await TeamService.getTeamWithMembers(context.user.id, teamIdInt, orgIdInt);
    return NextResponse.json(team);

  } catch (error) {
    console.error('Error fetching team:', error);
    return errorResponse(error, 'Failed to fetch team');
  }
};

// GET - Get a specific team with members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; teamId: string }> }
) {
  const resolvedParams = await params;
  const authHandler = withAuth(async (context, req) => 
    teamDetailsHandler(context, req, resolvedParams)
  );
  return authHandler(request);
}

// PUT - Update a team
const updateTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100, "Team name must be 100 characters or less").optional(),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g., #FF5733)").optional()
});

// Team update handler
const updateTeamHandler = async (
  context: ApplicationContext,
  request: NextRequest,
  params: { orgId: string; teamId: string }
): Promise<NextResponse> => {
  try {
    const { orgId, teamId } = params;
    
    // Demo mode doesn't support team updates
    if (orgId.startsWith('demo-')) {
      throw badRequest('Team updates not supported in demo mode');
    }

    const orgIdInt = parseInt(orgId, 10);
    const teamIdInt = parseInt(teamId, 10);
    if (isNaN(orgIdInt) || isNaN(teamIdInt)) throw badRequest('Invalid organization or team ID');

    const body = await request.json();
    
    // Validate request body with zod
    const validationResult = updateTeamSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => `${err.path.join('.')}: ${err.message}`);
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
      context.user.id,
      teamIdInt,
      orgIdInt,
      updateData
    );
    return NextResponse.json(updatedTeam);

  } catch (error) {
    console.error('Error updating team:', error);
    return errorResponse(error, 'Failed to update team');
  }
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; teamId: string }> }
) {
  const resolvedParams = await params;
  const authHandler = withAuth(async (context, req) => 
    updateTeamHandler(context, req, resolvedParams)
  );
  return authHandler(request);
}

// DELETE - Delete a team
// Team deletion handler
const deleteTeamHandler = async (
  context: ApplicationContext,
  request: NextRequest,
  params: { orgId: string; teamId: string }
): Promise<NextResponse> => {
  try {
    const { orgId, teamId } = params;
    
    // Demo mode doesn't support team deletion
    if (orgId.startsWith('demo-')) {
      throw badRequest('Team deletion not supported in demo mode');
    }

    const orgIdInt = parseInt(orgId, 10);
    const teamIdInt = parseInt(teamId, 10);
    if (isNaN(orgIdInt) || isNaN(teamIdInt)) throw badRequest('Invalid organization or team ID');

    // Reuse update permission checks inside service by attempting a noop update or extend service with delete
    const success = await (async () => {
      // Implement delete via repository for now, reusing service authorization by fetching with service
      await TeamService.getTeamWithMembers(context.user.id, teamIdInt, orgIdInt);
      const { deleteTeam } = await import('@/lib/repositories/team-repository');
      return deleteTeam(teamIdInt);
    })();

    if (!success) throw notFound('Failed to delete team');
    return NextResponse.json({ message: 'Team deleted successfully' });

  } catch (error) {
    console.error('Error deleting team:', error);
    return errorResponse(error, 'Failed to delete team');
  }
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; teamId: string }> }
) {
  const resolvedParams = await params;
  const authHandler = withAuth(async (context, req) => 
    deleteTeamHandler(context, req, resolvedParams)
  );
  return authHandler(request);
}