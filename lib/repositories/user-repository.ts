import { query, execute, transaction } from '@/lib/db';
import { User, Organization, UserOrganization } from '@/lib/types';

export async function findUserById(id: string): Promise<User | null> {
  console.log('Finding user by ID:', id);
  
  try {
    const users = await query<User>('SELECT * FROM users WHERE id = ?', [id]);
    console.log('User query results:', users.length > 0 ? 'User found' : 'No user found');
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Error in findUserById:', error);
    throw error;
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  console.log('Finding user by email:', email);
  
  try {
    const users = await query<User>('SELECT * FROM users WHERE email = ?', [email]);
    console.log('User by email results:', users.length > 0 ? 'User found' : 'No user found');
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Error in findUserByEmail:', error);
    throw error;
  }
}

export async function createUser(user: { 
  id: string; 
  name: string | null; 
  email: string | null; 
  image: string | null; 
}): Promise<User> {
  console.log('Creating new user:', user.id, user.email);
  
  try {
    const result = await execute(
      'INSERT INTO users (id, name, email, image) VALUES (?, ?, ?, ?)',
      [user.id, user.name, user.email, user.image]
    );
    
    console.log('User creation result:', result);
    
    const createdUser = await findUserById(user.id);
    if (!createdUser) {
      throw new Error('Failed to retrieve created user');
    }
    
    console.log('User created successfully:', createdUser.id);
    return createdUser;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

export async function updateUser(id: string, data: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>): Promise<User | null> {
  const updates: string[] = [];
  const values: any[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  });
  
  if (updates.length === 0) {
    return findUserById(id);
  }
  
  updates.push('updated_at = datetime("now")');
  
  await execute(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    [...values, id]
  );
  
  return findUserById(id);
}

export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  return query<Organization>(`
    SELECT o.* 
    FROM organizations o
    JOIN user_organizations uo ON o.id = uo.organization_id
    WHERE uo.user_id = ?
    ORDER BY o.name
  `, [userId]);
}

export async function addUserToOrganization(
  userId: string, 
  organizationId: number, 
  role: UserOrganization['role'] = 'member'
): Promise<void> {
  await execute(
    'INSERT OR IGNORE INTO user_organizations (user_id, organization_id, role) VALUES (?, ?, ?)',
    [userId, organizationId, role]
  );
}

export async function removeUserFromOrganization(userId: string, organizationId: number): Promise<void> {
  await execute(
    'DELETE FROM user_organizations WHERE user_id = ? AND organization_id = ?',
    [userId, organizationId]
  );
}

export async function getOrganizationRole(userId: string, organizationId: number): Promise<UserOrganization['role'] | null> {
  const results = await query<{ role: UserOrganization['role'] }>(
    'SELECT role FROM user_organizations WHERE user_id = ? AND organization_id = ?',
    [userId, organizationId]
  );
  
  return results.length > 0 ? results[0].role : null;
}

export async function updateOrganizationRole(
  userId: string, 
  organizationId: number, 
  role: UserOrganization['role']
): Promise<void> {
  await execute(
    'UPDATE user_organizations SET role = ? WHERE user_id = ? AND organization_id = ?',
    [role, userId, organizationId]
  );
} 