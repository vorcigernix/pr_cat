import { NextRequest, NextResponse } from 'next/server';
import { ServiceLocator, withAuth, ApplicationContext } from '@/lib/core';
import { TeamService } from '@/lib/services';
import { unauthorized, badRequest, forbidden, errorResponse } from '@/lib/api-errors';
import { z } from 'zod';

export const runtime = 'nodejs';

// Pure business logic handler
const organizationTeamsHandler = async (
  context: ApplicationContext,
  request: NextRequest,
  params: { orgId: string }
): Promise<NextResponse> => {
  try {
    const { orgId } = params;

    // Handle both string and numeric organization IDs for demo compatibility
    let orgIdInt: number;
    if (orgId.startsWith('demo-')) {
      // For demo mode, return demo teams data
      const demoTeams = [
        {
          id: 1,
          name: 'Frontend Team',
          description: 'Responsible for UI/UX and frontend development',
          color: '#3B82F6',
          organization_id: orgId,
          member_count: 4,
          created_at: new Date('2023-01-15'),
          updated_at: new Date('2024-01-15')
        },
        {
          id: 2,
          name: 'Backend Team', 
          description: 'API development and infrastructure',
          color: '#10B981',
          organization_id: orgId,
          member_count: 3,
          created_at: new Date('2023-02-01'),
          updated_at: new Date('2024-01-15')
        }
      ];
      return NextResponse.json(demoTeams);
    } else {
      orgIdInt = parseInt(orgId, 10);
      if (isNaN(orgIdInt)) throw badRequest('Invalid organization ID');
    }

    const teams = await TeamService.getOrganizationTeams(context.user.id, orgIdInt);
    return NextResponse.json(teams);

  } catch (error) {
    console.error('Error fetching organization teams:', error);
    return errorResponse(error, 'Failed to fetch teams');
  }
};

// GET - List all teams for an organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const resolvedParams = await params;
  const authHandler = withAuth(async (context, req) => 
    organizationTeamsHandler(context, req, resolvedParams)
  );
  return authHandler(request);
}

// POST - Create a new team
const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100, "Team name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g., #FF5733)").optional()
});

// Team creation handler
const createTeamHandler = async (
  context: ApplicationContext,
  request: NextRequest,
  params: { orgId: string }
): Promise<NextResponse> => {
  try {
    const { orgId } = params;

    // Handle both string and numeric organization IDs for demo compatibility  
    let orgIdInt: number;
    if (orgId.startsWith('demo-')) {
      // Demo mode doesn't support team creation yet
      throw badRequest('Team creation not supported in demo mode');
    } else {
      orgIdInt = parseInt(orgId, 10);
      if (isNaN(orgIdInt)) throw badRequest('Invalid organization ID');
    }

    const body = await request.json();
    
    // Validate request body with zod
    const validationResult = createTeamSchema.safeParse(body);
    if (!validationResult.success) throw badRequest('Validation failed', z.treeifyError(validationResult.error));
    
    const { name, description, color } = validationResult.data;
    
    const newTeamData = {
      organization_id: orgIdInt,
      name: name.trim(),
      description: description?.trim() || null,
      color: color?.trim() || null,
    };

    const createdTeam = await TeamService.createTeam(context.user.id, {
      organizationId: orgIdInt,
      name: name.trim(),
      description: description?.trim(),
      color: color?.trim(),
    });
    return NextResponse.json(createdTeam, { status: 201 });

  } catch (error) {
    console.error('Error creating team:', error);
    return errorResponse(error, 'Failed to create team');
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const resolvedParams = await params;
  const authHandler = withAuth(async (context, req) => 
    createTeamHandler(context, req, resolvedParams)
  );
  return authHandler(request);
}