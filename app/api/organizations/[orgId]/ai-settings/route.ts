import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { 
  getOrganizationAiSettings, 
  updateOrganizationAiSettings, 
  AiSettings,
  UpdateAiSettingsPayload
} from '@/lib/repositories';
import { getOrganizationRole } from '@/lib/repositories/user-repository';
import { z } from 'zod';

const updateAiSettingsSchema = z.object({
  provider: z.enum(['openai', 'google', 'anthropic']).nullable().optional(),
  selectedModelId: z.string().nullable().optional(),
  openaiApiKey: z.string().nullable().optional(),
  googleApiKey: z.string().nullable().optional(),
  anthropicApiKey: z.string().nullable().optional(),
  categoryThreshold: z.number().min(0).max(100).optional()
});

// GET current AI settings for an organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const numericOrgId = parseInt(orgId);
  if (isNaN(numericOrgId)) {
    return NextResponse.json({ error: 'Invalid organization ID' }, { status: 400 });
  }

  const role = await getOrganizationRole(session.user.id, numericOrgId);
  if (!role || (role !== 'admin' && role !== 'owner')) { 
    return NextResponse.json({ error: 'Forbidden: User does not have permission to view settings for this organization' }, { status: 403 });
  }

  try {
    const aiSettings: AiSettings = await getOrganizationAiSettings(numericOrgId);
    return NextResponse.json(aiSettings);
  } catch (error) {
    console.error(`Error fetching AI settings for org ${orgId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch AI settings' }, { status: 500 });
  }
}

// PUT (update) AI settings for an organization
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const numericOrgId = parseInt(orgId);
  if (isNaN(numericOrgId)) {
    return NextResponse.json({ error: 'Invalid organization ID' }, { status: 400 });
  }

  const role = await getOrganizationRole(session.user.id, numericOrgId);
  if (!role || (role !== 'admin' && role !== 'owner')) { 
    return NextResponse.json({ error: 'Forbidden: User does not have permission to update settings for this organization' }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Validate request body with zod
    const validationResult = updateAiSettingsSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: errors 
      }, { status: 400 });
    }
    
    const validatedPayload = validationResult.data as UpdateAiSettingsPayload;
    
    console.log(`Server: Received AI settings update for org ${orgId}:`, JSON.stringify(validatedPayload, null, 2));
            
    await updateOrganizationAiSettings(numericOrgId, validatedPayload);
    console.log(`Server: Successfully updated AI settings for org ${orgId}`);
    return NextResponse.json({ message: 'AI settings updated successfully' });
  } catch (error) {
    console.error(`Error updating AI settings for org ${orgId}:`, error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update AI settings' }, { status: 500 });
  }
} 