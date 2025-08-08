import { getOrganizationRole } from '@/lib/repositories/user-repository';
import { getOrganizationCategories, createCategory } from '@/lib/repositories/category-repository';
import { badRequest, forbidden, conflict } from '@/lib/api-errors';

export class CategoryService {
  static async list(userId: string, organizationId: number) {
    const role = await getOrganizationRole(userId, organizationId);
    if (!role) {
      throw forbidden('Access denied. User is not part of this organization');
    }
    return getOrganizationCategories(organizationId);
  }

  static async create(userId: string, organizationId: number, data: { name: string; description?: string; color?: string }) {
    const role = await getOrganizationRole(userId, organizationId);
    if (!role) {
      throw forbidden('Access denied. User is not part of this organization');
    }

    if (!data.name || data.name.trim().length === 0) {
      throw badRequest('Category name is required');
    }
    if (data.name.length > 100) {
      throw badRequest('Category name must be 100 characters or less');
    }
    if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
      throw badRequest('Color must be a valid hex color (e.g., #FF5733)');
    }

    const existing = await getOrganizationCategories(organizationId);
    const duplicate = existing.find(
      cat => !cat.is_default && cat.organization_id === organizationId && cat.name.toLowerCase() === data.name.trim().toLowerCase()
    );
    if (duplicate) {
      throw conflict(`A category with the name '${data.name.trim()}' already exists for this organization.`);
    }

    return createCategory({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      organization_id: organizationId,
      color: data.color?.trim() || null,
    });
  }
}

