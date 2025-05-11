import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  findCategoryById,
  updateCategory,
  getOrganizationCategories,
  deleteCategory
} from '@/lib/repositories/category-repository';
import { getOrganizationRole } from '@/lib/repositories/user-repository';
import { Category } from '@/lib/types';

export const runtime = 'nodejs';

interface UpdateCategoryRequestBody {
  name?: string;
  description?: string;
  color?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categoryIdInt = parseInt(categoryId, 10);
    if (isNaN(categoryIdInt)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    const existingCategory = await findCategoryById(categoryIdInt);
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Authorization
    if (existingCategory.is_default) {
      // For default categories, only allow updating description and color by anyone (or define admin role later)
      // Name and is_default status cannot be changed for default categories via this endpoint.
    } else if (existingCategory.organization_id) {
      const userRole = await getOrganizationRole(session.user.id, existingCategory.organization_id);
      if (!userRole) {
        // User is not part of the organization that owns this custom category
        return NextResponse.json({ error: 'Forbidden. You do not have permission to modify this category.' }, { status: 403 });
      }
      // TODO: Refine role-based access control if needed (e.g., only org admins can modify their custom categories)
    } else {
      // Should not happen: custom category with no organization_id
      return NextResponse.json({ error: 'Invalid category state' }, { status: 500 });
    }

    const body = await request.json() as UpdateCategoryRequestBody;
    const updateData: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at' | 'organization_id' | 'is_default'>> = {};

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }
    if (body.color !== undefined) {
      updateData.color = body.color?.trim() || null;
    }

    // For non-default (custom) categories, allow name update
    if (!existingCategory.is_default) {
      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.trim() === '') {
          return NextResponse.json({ error: 'Category name must be a non-empty string.' }, { status: 400 });
        }
        updateData.name = body.name.trim();
        
        // Check for duplicate name within the same organization if name is being changed
        if (existingCategory.organization_id && updateData.name.toLowerCase() !== existingCategory.name.toLowerCase()) {
          const orgCategories = await getOrganizationCategories(existingCategory.organization_id);
          const duplicate = orgCategories.find(
            (cat: Category) => 
              !cat.is_default && 
              cat.id !== categoryIdInt && // Exclude the current category itself
              cat.organization_id === existingCategory.organization_id && 
              cat.name.toLowerCase() === updateData.name!.toLowerCase()
          );
          if (duplicate) {
            return NextResponse.json({ error: `A category with the name '${updateData.name}' already exists for this organization.` }, { status: 409 });
          }
        }
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No updatable fields provided.', category: existingCategory }, { status: 200 });
    }

    const updatedCategory = await updateCategory(categoryIdInt, updateData);
    return NextResponse.json(updatedCategory);

  } catch (error) {
    console.error('Error updating category:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
     if (errorMessage.includes('UNIQUE constraint failed: categories.organization_id, categories.name')) {
        return NextResponse.json({ error: 'A category with this name already exists for this organization.', details: errorMessage }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update category', details: errorMessage }, { status: 500 });
  }
}

// --- DELETE Handler to remove a custom category ---

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categoryIdInt = parseInt(categoryId, 10);
    if (isNaN(categoryIdInt)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    const existingCategory = await findCategoryById(categoryIdInt);
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Authorization: Only non-default categories can be deleted
    if (existingCategory.is_default) {
      return NextResponse.json({ error: 'Forbidden. Default categories cannot be deleted.' }, { status: 403 });
    }

    // Ensure user has rights to delete (belongs to the organization that owns this custom category)
    if (existingCategory.organization_id) {
      const userRole = await getOrganizationRole(session.user.id, existingCategory.organization_id);
      if (!userRole) {
        return NextResponse.json({ error: 'Forbidden. You do not have permission to delete this category.' }, { status: 403 });
      }
      // TODO: Refine role-based access control if needed (e.g., only org admins can delete their custom categories)
    } else {
      // Should not happen: custom category with no organization_id that isn't default
      return NextResponse.json({ error: 'Invalid category state for deletion' }, { status: 500 });
    }

    await deleteCategory(categoryIdInt); // The repository function already prevents deleting default categories

    return NextResponse.json({ message: 'Category deleted successfully' }, { status: 200 }); // Or 204 No Content

  } catch (error) {
    console.error('Error deleting category:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to delete category', details: errorMessage }, { status: 500 });
  }
} 