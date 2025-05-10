import { query, execute } from '@/lib/db';
import { Repository } from '@/lib/types';

export async function findRepositoryById(id: number): Promise<Repository | null> {
  const repos = await query<Repository>('SELECT * FROM repositories WHERE id = ?', [id]);
  return repos.length > 0 ? repos[0] : null;
}

export async function findRepositoryByGitHubId(githubId: number): Promise<Repository | null> {
  const repos = await query<Repository>('SELECT * FROM repositories WHERE github_id = ?', [githubId]);
  return repos.length > 0 ? repos[0] : null;
}

export async function findRepositoryByFullName(fullName: string): Promise<Repository | null> {
  const repos = await query<Repository>(
    `SELECT * FROM repositories WHERE full_name = ?`,
    [fullName]
  );
  
  return repos.length > 0 ? repos[0] : null;
}

export async function createRepository(repository: Omit<Repository, 'id' | 'created_at' | 'updated_at'>): Promise<Repository> {
  const result = await execute(
    `INSERT INTO repositories 
     (github_id, organization_id, name, full_name, description, private, is_tracked) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      repository.github_id,
      repository.organization_id,
      repository.name,
      repository.full_name,
      repository.description,
      repository.private ? 1 : 0,
      repository.is_tracked ? 1 : 0
    ]
  );
  
  const id = result.lastInsertId;
  if (!id) {
    throw new Error('Failed to create repository');
  }
  
  const repo = await findRepositoryById(id);
  if (!repo) {
    throw new Error('Failed to retrieve created repository');
  }
  
  return repo;
}

export async function updateRepository(
  id: number, 
  data: Partial<Omit<Repository, 'id' | 'github_id' | 'created_at' | 'updated_at'>>
): Promise<Repository | null> {
  const updates: string[] = [];
  const values: any[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'private' || key === 'is_tracked') {
        updates.push(`${key} = ?`);
        values.push(value ? 1 : 0);
      } else {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
  });
  
  if (updates.length === 0) {
    return findRepositoryById(id);
  }
  
  updates.push('updated_at = datetime("now")');
  
  await execute(
    `UPDATE repositories SET ${updates.join(', ')} WHERE id = ?`,
    [...values, id]
  );
  
  return findRepositoryById(id);
}

export async function setRepositoryTracking(id: number, isTracked: boolean): Promise<Repository | null> {
  await execute(
    'UPDATE repositories SET is_tracked = ?, updated_at = datetime("now") WHERE id = ?',
    [isTracked ? 1 : 0, id]
  );
  
  return findRepositoryById(id);
}

export async function getOrganizationRepositories(organizationId: number): Promise<Repository[]> {
  return query<Repository>(
    'SELECT * FROM repositories WHERE organization_id = ? ORDER BY name',
    [organizationId]
  );
}

export async function getTrackedRepositories(): Promise<Repository[]> {
  return query<Repository>('SELECT * FROM repositories WHERE is_tracked = 1');
}

export async function getTrackedRepositoriesByOrganization(organizationId: number): Promise<Repository[]> {
  return query<Repository>(
    'SELECT * FROM repositories WHERE organization_id = ? AND is_tracked = 1 ORDER BY name',
    [organizationId]
  );
}

export async function findOrCreateRepository(
  repository: Omit<Repository, 'id' | 'created_at' | 'updated_at'>
): Promise<Repository> {
  const existingRepo = await findRepositoryByGitHubId(repository.github_id);
  
  if (existingRepo) {
    // Update repository if it exists
    const updatedRepo = await updateRepository(existingRepo.id, {
      name: repository.name,
      full_name: repository.full_name,
      description: repository.description,
      private: repository.private,
      organization_id: repository.organization_id
    });
    
    if (!updatedRepo) {
      throw new Error('Failed to update existing repository');
    }
    
    return updatedRepo;
  }
  
  // Create new repository
  return createRepository(repository);
}

export async function getRepositoryStatistics(
  repositoryId: number
): Promise<{
  total_prs: number;
  open_prs: number;
  merged_prs: number;
  closed_prs: number;
  categorized_prs: number;
  uncategorized_prs: number;
}> {
  const stats = await query<{
    total_prs: number;
    open_prs: number;
    merged_prs: number;
    closed_prs: number;
    categorized_prs: number;
    uncategorized_prs: number;
  }>(`
    SELECT 
      COUNT(*) as total_prs,
      SUM(CASE WHEN state = 'open' THEN 1 ELSE 0 END) as open_prs,
      SUM(CASE WHEN state = 'merged' THEN 1 ELSE 0 END) as merged_prs,
      SUM(CASE WHEN state = 'closed' THEN 1 ELSE 0 END) as closed_prs,
      SUM(CASE WHEN category_id IS NOT NULL THEN 1 ELSE 0 END) as categorized_prs,
      SUM(CASE WHEN category_id IS NULL THEN 1 ELSE 0 END) as uncategorized_prs
    FROM pull_requests
    WHERE repository_id = ?
  `, [repositoryId]);
  
  return stats[0];
}

export async function getRepositoriesByUser(
  userId: string, 
  organizationId?: number
): Promise<Repository[]> {
  let sql = `
    SELECT r.* 
    FROM repositories r
    JOIN user_organizations uo ON r.organization_id = uo.organization_id
    WHERE uo.user_id = ?
  `;
  
  const params: any[] = [userId];
  
  if (organizationId) {
    sql += ` AND r.organization_id = ?`;
    params.push(organizationId);
  }
  
  sql += ` ORDER BY r.name ASC`;
  
  return await query<Repository>(sql, params);
}

export async function getRepositories(limit: number = 100): Promise<Repository[]> {
  return query<Repository>(
    `SELECT * FROM repositories ORDER BY name ASC LIMIT ?`,
    [limit]
  );
} 