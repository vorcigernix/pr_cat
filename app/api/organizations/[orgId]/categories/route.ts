import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrganizationCategories, createCategory } from '@/lib/repositories/category-repository';
import { getOrganizationRole } from '@/lib/repositories/user-repository'; // Corrected function name

export const runtime = 'nodejs'; // Or 'edge' if preferred and dependencies allow

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
    const userRole = await getOrganizationRole(session.user.id, orgIdInt); // Corrected function call
    if (!userRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const categories = await getOrganizationCategories(orgIdInt);
    return NextResponse.json(categories);

  } catch (error) {
    console.error('Error fetching organization categories:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch categories', details: errorMessage }, { status: 500 });
  }
}

// --- POST Handler to create a new custom category for an organization ---

interface CreateCategoryRequestBody {
  name: string;
  description?: string;
  color?: string; // Optional color
}

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

    // Authorization: Check if the user is part of the organization and perhaps has a role that allows creating categories (e.g., admin/owner)
    const userRole = await getOrganizationRole(session.user.id, orgIdInt);
    // For now, we'll allow any member of the org to create categories.
    // TODO: Refine role-based access control if needed (e.g., only admins can create categories)
    if (!userRole) {
      return NextResponse.json({ error: 'Forbidden. User not part of the organization.' }, { status: 403 });
    }

    const body = await request.json() as CreateCategoryRequestBody;

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json({ error: 'Category name is required and must be a non-empty string.' }, { status: 400 });
    }
    if (body.description && typeof body.description !== 'string') {
      return NextResponse.json({ error: 'Category description must be a string if provided.' }, { status: 400 });
    }
    if (body.color && typeof body.color !== 'string') {
      return NextResponse.json({ error: 'Category color must be a string if provided.' }, { status: 400 });
    }
    
    // Ensure this category is not a duplicate by name for this organization (excluding default categories)
    const existingOrgCategories = await getOrganizationCategories(orgIdInt);
    const duplicate = existingOrgCategories.find(
      cat => !cat.is_default && cat.organization_id === orgIdInt && cat.name.toLowerCase() === body.name.trim().toLowerCase()
    );

    if (duplicate) {
      return NextResponse.json({ error: `A category with the name '${body.name.trim()}' already exists for this organization.` }, { status: 409 }); // 409 Conflict
    }

    const newCategoryData = {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      organization_id: orgIdInt,
      is_default: false,
      color: body.color?.trim() || null, // Assign a default color later if needed, or let UI pick
    };

    const createdCategory = await createCategory(newCategoryData);
    return NextResponse.json(createdCategory, { status: 201 });

  } catch (error) {
    console.error('Error creating organization category:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    if (errorMessage.includes('UNIQUE constraint failed: categories.organization_id, categories.name')) {
        return NextResponse.json({ error: 'A category with this name already exists for this organization.', details: errorMessage }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create category', details: errorMessage }, { status: 500 });
  }
} 