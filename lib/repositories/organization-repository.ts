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

/**
 * Finds an organization by its name and verifies user access.
 * Also fetches the installation_id for the GitHub App.
 * @param name The name of the organization (case-insensitive).
 * @param userId The ID of the user to check for access.
 * @returns The organization if found and accessible by the user, otherwise null.
 */
export async function findOrganizationByNameAndUser(
  name: string,
  userId: string
): Promise<(Organization & { installation_id?: number | null }) | null> {
  // Query joins organizations with user_organizations to ensure the user is part of the org.
  // It also directly fetches installation_id from the organizations table.
  const organizations = await query<
    Organization & { installation_id?: number | null }
  >(
    `SELECT o.*, o.installation_id 
     FROM organizations o
     JOIN user_organizations uo ON o.id = uo.organization_id
     WHERE LOWER(o.name) = LOWER(?) AND uo.user_id = ?
     LIMIT 1`,
    [name, userId]
  );
  return organizations.length > 0 ? organizations[0] : null;
}

export async function findOrganizationByLogin(
  login: string
): Promise<(Organization & { installation_id?: number | null }) | null> {
  console.log(`findOrganizationByLogin: Searching for organization with login (name): ${login}`);
  const organizations = await query<
    Organization & { installation_id?: number | null }
  >(
    'SELECT *, installation_id FROM organizations WHERE LOWER(name) = LOWER(?) LIMIT 1',
    [login] // SQL's LOWER() function will handle case-insensitivity for the parameter as well
  );
  if (organizations.length > 0) {
    console.log(`findOrganizationByLogin: Found organization: ${organizations[0].name}, installation_id: ${(organizations[0] as any).installation_id}`);
    return organizations[0];
  } else {
    console.log(`findOrganizationByLogin: Organization with login ${login} not found.`);
    return null;
  }
} 