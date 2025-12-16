import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { CategoryService } from '@/lib/services/category-service';
import { unauthorized, badRequest, errorResponse } from '@/lib/api-errors';
import { z } from 'zod';

export const runtime = 'nodejs'; // Or 'edge' if preferred and dependencies allow

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await auth();
    if (!session?.user?.id) throw unauthorized();

    const orgIdInt = parseInt(orgId, 10);
    if (isNaN(orgIdInt)) throw badRequest('Invalid organization ID');

    const categories = await CategoryService.list(session.user.id, orgIdInt);
    return NextResponse.json(categories);

  } catch (error) {
    console.error('Error fetching organization categories:', error);
    return errorResponse(error, 'Failed to fetch categories');
  }
}

// --- POST Handler to create a new custom category for an organization ---

const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100, "Category name must be 100 characters or less"),
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
    if (!session?.user?.id) throw unauthorized();

    const orgIdInt = parseInt(orgId, 10);
    if (isNaN(orgIdInt)) throw badRequest('Invalid organization ID');

    const body = await request.json();
    
    // Validate request body with zod
    const validationResult = createCategorySchema.safeParse(body);
    if (!validationResult.success) throw badRequest('Validation failed', z.treeifyError(validationResult.error));
    
    const { name, description, color } = validationResult.data;
    
    const createdCategory = await CategoryService.create(session.user.id, orgIdInt, { name, description, color });
    return NextResponse.json(createdCategory, { status: 201 });

  } catch (error) {
    console.error('Error creating organization category:', error);
    return errorResponse(error, 'Failed to create category');
  }
} 