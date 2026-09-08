import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { AiSettingsService } from '@/lib/services/ai-settings-service';
import { z } from 'zod';
import { ApiError, unauthorized, badRequest, errorResponse } from '@/lib/api-errors';


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
    const numericOrgId = Number(orgId);
    if (!/^\d+$/.test(orgId) || !Number.isSafeInteger(numericOrgId)) throw badRequest('Invalid organization ID');

    const aiSettings = await AiSettingsService.get(session.user.id, numericOrgId);
    return NextResponse.json(aiSettings);
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    console.error('Error fetching AI settings');
    return errorResponse(undefined, 'Failed to fetch AI settings');
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

    const numericOrgId = Number(orgId);
    if (!/^\d+$/.test(orgId) || !Number.isSafeInteger(numericOrgId)) throw badRequest('Invalid organization ID');

    const body = await request.json().catch(() => { throw badRequest('Invalid JSON body'); });
    const validationResult = updateAiSettingsSchema.safeParse(body);
    if (!validationResult.success) throw badRequest('Validation failed', z.treeifyError(validationResult.error));

    await AiSettingsService.update(session.user.id, numericOrgId, validationResult.data);
    return NextResponse.json({ message: 'AI settings updated successfully' });
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error);
    console.error('Error updating AI settings');
    return errorResponse(undefined, 'Failed to update AI settings');
  }
}
