import { query, execute } from '@/lib/db';
import { Category } from '@/lib/types';

export async function findCategoryById(id: number): Promise<Category | null> {
  const categories = await query<Category>('SELECT * FROM categories WHERE id = ?', [id]);
  return categories.length > 0 ? categories[0] : null;
}

export async function getDefaultCategories(): Promise<Category[]> {
  return query<Category>('SELECT * FROM categories WHERE is_default = 1 ORDER BY name');
}

export async function getOrganizationCategories(orgId: number): Promise<Category[]> {
  return query<Category>(
    `SELECT * FROM categories 
     WHERE organization_id = ? OR is_default = 1 
     ORDER BY name`,
    [orgId]
  );
}

export async function createCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
  const result = await execute(
    `INSERT INTO categories 
     (organization_id, name, description, color, is_default) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      category.organization_id,
      category.name,
      category.description,
      category.color,
      category.is_default ? 1 : 0
    ]
  );
  
  const id = result.lastInsertId;
  if (!id) {
    throw new Error('Failed to create category');
  }
  
  const newCategory = await findCategoryById(id);
  if (!newCategory) {
    throw new Error('Failed to retrieve created category');
  }
  
  return newCategory;
}

export async function updateCategory(
  id: number, 
  data: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>
): Promise<Category | null> {
  const updates: string[] = [];
  const values: any[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'is_default') {
        updates.push(`${key} = ?`);
        values.push(value ? 1 : 0);
      } else {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
  });
  
  if (updates.length === 0) {
    return findCategoryById(id);
  }
  
  updates.push('updated_at = datetime("now")');
  
  await execute(
    `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
    [...values, id]
  );
  
  return findCategoryById(id);
}

export async function deleteCategory(id: number): Promise<void> {
  await execute('DELETE FROM categories WHERE id = ? AND is_default = 0', [id]);
}

export async function getUsedCategories(orgId: number): Promise<(Category & { count: number })[]> {
  return query<Category & { count: number }>(
    `SELECT c.*, COUNT(pr.id) as count
     FROM categories c
     LEFT JOIN pull_requests pr ON c.id = pr.category_id
     WHERE c.organization_id = ? OR c.is_default = 1
     GROUP BY c.id
     ORDER BY count DESC, c.name ASC`,
    [orgId]
  );
} 