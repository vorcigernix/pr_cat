import { query, execute, transaction } from '@/lib/db';
import { Organization, User } from '@/lib/types';

export async function findOrganizationById(id: number): Promise<Organization | null> {
  const orgs = await query<Organization>('SELECT * FROM organizations WHERE id = ?', [id]);
  return orgs.length > 0 ? orgs[0] : null;
}

export async function findOrganizationByGitHubId(githubId: number): Promise<Organization | null> {
  const orgs = await query<Organization>('SELECT * FROM organizations WHERE github_id = ?', [githubId]);
  return orgs.length > 0 ? orgs[0] : null;
}

export async function createOrganization(organization: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> {
  const result = await execute(
    'INSERT INTO organizations (github_id, name, avatar_url) VALUES (?, ?, ?)',
    [organization.github_id, organization.name, organization.avatar_url]
  );
  
  const id = result.lastInsertId;
  if (!id) {
    throw new Error('Failed to create organization');
  }
  
  const org = await findOrganizationById(id);
  if (!org) {
    throw new Error('Failed to retrieve created organization');
  }
  
  return org;
}

export async function updateOrganization(
  id: number, 
  data: Partial<Omit<Organization, 'id' | 'github_id' | 'created_at' | 'updated_at'>>
): Promise<Organization | null> {
  const updates: string[] = [];
  const values: any[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  });
  
  if (updates.length === 0) {
    return findOrganizationById(id);
  }
  
  updates.push('updated_at = datetime("now")');
  
  await execute(
    `UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`,
    [...values, id]
  );
  
  return findOrganizationById(id);
}

export async function getOrganizationMembers(organizationId: number): Promise<User[]> {
  return query<User>(`
    SELECT u.* 
    FROM users u
    JOIN user_organizations uo ON u.id = uo.user_id
    WHERE uo.organization_id = ?
    ORDER BY u.name
  `, [organizationId]);
}

export async function findOrCreateOrganization(organization: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> {
  const existingOrg = await findOrganizationByGitHubId(organization.github_id);
  
  if (existingOrg) {
    // Update organization if it already exists
    const updatedOrg = await updateOrganization(existingOrg.id, {
      name: organization.name,
      avatar_url: organization.avatar_url
    });
    
    if (!updatedOrg) {
      throw new Error('Failed to update existing organization');
    }
    
    return updatedOrg;
  }
  
  // Create new organization
  return createOrganization(organization);
}

export async function getUserOrganizationsWithRole(userId: string): Promise<(Organization & { role: string })[]> {
  return query<Organization & { role: string }>(`
    SELECT o.*, uo.role 
    FROM organizations o
    JOIN user_organizations uo ON o.id = uo.organization_id
    WHERE uo.user_id = ?
    ORDER BY o.name
  `, [userId]);
} 