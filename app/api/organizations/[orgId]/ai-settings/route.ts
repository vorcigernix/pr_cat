import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { AiSettingsService } from '@/lib/services/ai-settings-service';
import { z } from 'zod';
import { unauthorized, badRequest, errorResponse } from '@/lib/api-errors';


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
  try {

    const { orgId } = await params;
    const session = await auth();
    if (!session?.user?.id) throw unauthorized();
    const numericOrgId = parseInt(orgId);
    if (isNaN(numericOrgId)) throw badRequest('Invalid organization ID');

    const aiSettings = await AiSettingsService.get(session.user.id, numericOrgId);
    return NextResponse.json(aiSettings);
  } catch (error) {
    console.error(`Error fetching AI settings:`, error);
    return errorResponse(error, 'Failed to fetch AI settings');
  }
}

// PUT (update) AI settings for an organization
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {

    const { orgId } = await params;
    const session = await auth();
    if (!session?.user?.id) throw unauthorized();

    const numericOrgId = parseInt(orgId);
    if (isNaN(numericOrgId)) throw badRequest('Invalid organization ID');

    const body = await request.json();
    const validationResult = updateAiSettingsSchema.safeParse(body);
    if (!validationResult.success) throw badRequest('Validation failed', z.treeifyError(validationResult.error));

    await AiSettingsService.update(session.user.id, numericOrgId, validationResult.data);
    return NextResponse.json({ message: 'AI settings updated successfully' });
  } catch (error) {
    console.error(`Error updating AI settings:`, error);
    return errorResponse(error, 'Failed to update AI settings');
  }
} 