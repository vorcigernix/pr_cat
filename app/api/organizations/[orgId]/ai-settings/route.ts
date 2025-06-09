import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { 
  getOrganizationAiSettings, 
  updateOrganizationAiSettings, 
  AiSettings,
  UpdateAiSettingsPayload
} from '@/lib/repositories';
import { getOrganizationRole } from '@/lib/repositories/user-repository';

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
    const body = await request.json() as UpdateAiSettingsPayload;
    
    console.log(`Server: Received AI settings update for org ${orgId}:`, JSON.stringify(body, null, 2));
    
    // Basic validation for the new payload
    if (body.selectedModelId !== undefined && (typeof body.selectedModelId !== 'string' && body.selectedModelId !== null)) {
      return NextResponse.json({ error: 'Invalid selectedModelId value' }, { status: 400 });
    }

    // Validate API keys: must be string or null if provided
    if (body.openaiApiKey !== undefined && typeof body.openaiApiKey !== 'string' && body.openaiApiKey !== null) {
      return NextResponse.json({ error: 'Invalid openaiApiKey value. Must be a string or null.' }, { status: 400 });
    }
    if (body.googleApiKey !== undefined && typeof body.googleApiKey !== 'string' && body.googleApiKey !== null) {
      return NextResponse.json({ error: 'Invalid googleApiKey value. Must be a string or null.' }, { status: 400 });
    }
    if (body.anthropicApiKey !== undefined && typeof body.anthropicApiKey !== 'string' && body.anthropicApiKey !== null) {
      return NextResponse.json({ error: 'Invalid anthropicApiKey value. Must be a string or null.' }, { status: 400 });
    }
    if (body.categoryThreshold !== undefined && (typeof body.categoryThreshold !== 'number' || body.categoryThreshold < 0 || body.categoryThreshold > 100)) {
      return NextResponse.json({ error: 'Invalid categoryThreshold value. Must be a number between 0 and 100.' }, { status: 400 });
    }
            
    await updateOrganizationAiSettings(numericOrgId, body);
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