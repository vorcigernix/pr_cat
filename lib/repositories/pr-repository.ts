import { query, execute, transaction } from '@/lib/db';
import { PullRequest, PRReview } from '@/lib/types';

export async function findPullRequestById(id: number): Promise<PullRequest | null> {
  const prs = await query<PullRequest>('SELECT * FROM pull_requests WHERE id = ?', [id]);
  return prs.length > 0 ? prs[0] : null;
}

export async function findPullRequestByGitHubId(githubId: number): Promise<PullRequest | null> {
  const prs = await query<PullRequest>('SELECT * FROM pull_requests WHERE github_id = ?', [githubId]);
  return prs.length > 0 ? prs[0] : null;
}

export async function findPullRequestByNumber(repositoryId: number, number: number): Promise<PullRequest | null> {
  const prs = await query<PullRequest>(
    'SELECT * FROM pull_requests WHERE repository_id = ? AND number = ?', 
    [repositoryId, number]
  );
  return prs.length > 0 ? prs[0] : null;
}

export async function createPullRequest(
  pr: Omit<PullRequest, 'id' | 'embedding_id'>
): Promise<PullRequest> {
  const result = await execute(`
    INSERT INTO pull_requests (
      github_id, repository_id, number, title, description, author_id,
      state, created_at, updated_at, closed_at, merged_at, draft,
      additions, deletions, changed_files, category_id, category_confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    pr.github_id,
    pr.repository_id,
    pr.number,
    pr.title,
    pr.description,
    pr.author_id,
    pr.state,
    pr.created_at,
    pr.updated_at,
    pr.closed_at,
    pr.merged_at,
    pr.draft ? 1 : 0,
    pr.additions,
    pr.deletions,
    pr.changed_files,
    pr.category_id,
    pr.category_confidence
  ]);
  
  const id = result.lastInsertId;
  if (!id) {
    throw new Error('Failed to create pull request');
  }
  
  const newPr = await findPullRequestById(id);
  if (!newPr) {
    throw new Error('Failed to retrieve created pull request');
  }
  
  return newPr;
}

export async function updatePullRequest(
  id: number, 
  data: Partial<Omit<PullRequest, 'id' | 'github_id' | 'repository_id' | 'number' | 'embedding_id'>>
): Promise<PullRequest | null> {
  const updates: string[] = [];
  const values: any[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'draft') {
        updates.push(`${key} = ?`);
        values.push(value ? 1 : 0);
      } else {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
  });
  
  if (updates.length === 0) {
    return findPullRequestById(id);
  }
  
  await execute(
    `UPDATE pull_requests SET ${updates.join(', ')} WHERE id = ?`,
    [...values, id]
  );
  
  return findPullRequestById(id);
}

export async function updatePullRequestCategory(
  id: number, 
  categoryId: number | null, 
  confidence: number | null = null
): Promise<PullRequest | null> {
  await execute(
    'UPDATE pull_requests SET category_id = ?, category_confidence = ? WHERE id = ?',
    [categoryId, confidence, id]
  );
  
  return findPullRequestById(id);
}

export async function getRepositoryPullRequests(
  repositoryId: number, 
  options: {
    state?: 'open' | 'closed' | 'merged' | 'all';
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC';
  } = {}
): Promise<PullRequest[]> {
  const { 
    state = 'all', 
    limit = 100, 
    offset = 0,
    orderBy = 'updated_at',
    orderDir = 'DESC'
  } = options;
  
  let queryString = 'SELECT * FROM pull_requests WHERE repository_id = ?';
  const params: any[] = [repositoryId];
  
  if (state !== 'all') {
    queryString += ' AND state = ?';
    params.push(state);
  }
  
  queryString += ` ORDER BY ${orderBy} ${orderDir} LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  return query<PullRequest>(queryString, params);
}

export async function getOrganizationPullRequests(
  organizationId: number,
  options: {
    state?: 'open' | 'closed' | 'merged' | 'all';
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC';
    categoryId?: number | null;
  } = {}
): Promise<PullRequest[]> {
  const { 
    state = 'all', 
    limit = 100, 
    offset = 0,
    orderBy = 'updated_at',
    orderDir = 'DESC',
    categoryId
  } = options;
  
  let sql = `
    SELECT pr.* 
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    WHERE r.organization_id = ?
  `;
  
  const params: any[] = [organizationId];
  
  if (state !== 'all') {
    sql += ' AND pr.state = ?';
    params.push(state);
  }
  
  if (categoryId !== undefined) {
    if (categoryId === null) {
      sql += ' AND pr.category_id IS NULL';
    } else {
      sql += ' AND pr.category_id = ?';
      params.push(categoryId);
    }
  }
  
  sql += ` ORDER BY pr.${orderBy} ${orderDir} LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  return query<PullRequest>(sql, params);
}

export async function getPullRequestReviews(pullRequestId: number): Promise<PRReview[]> {
  return query<PRReview>(
    'SELECT * FROM pr_reviews WHERE pull_request_id = ? ORDER BY submitted_at',
    [pullRequestId]
  );
}

export async function createPullRequestReview(review: Omit<PRReview, 'id'>): Promise<PRReview> {
  const result = await execute(
    'INSERT INTO pr_reviews (github_id, pull_request_id, reviewer_id, state, submitted_at) VALUES (?, ?, ?, ?, ?)',
    [review.github_id, review.pull_request_id, review.reviewer_id, review.state, review.submitted_at]
  );
  
  const id = result.lastInsertId;
  if (!id) {
    throw new Error('Failed to create pull request review');
  }
  
  const reviews = await query<PRReview>('SELECT * FROM pr_reviews WHERE id = ?', [id]);
  if (reviews.length === 0) {
    throw new Error('Failed to retrieve created review');
  }
  
  return reviews[0];
}

export async function findReviewByGitHubId(githubId: number): Promise<PRReview | null> {
  const reviews = await query<PRReview>('SELECT * FROM pr_reviews WHERE github_id = ?', [githubId]);
  return reviews.length > 0 ? reviews[0] : null;
}

// Metrics queries

export async function getPullRequestCountByCategory(organizationId: number, timeRange?: { from: string; to: string }): Promise<{ category_id: number | null; category_name: string | null; count: number }[]> {
  let sql = `
    SELECT c.id as category_id, c.name as category_name, COUNT(pr.id) as count
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    LEFT JOIN categories c ON pr.category_id = c.id
    WHERE r.organization_id = ?
  `;
  
  const params: any[] = [organizationId];
  
  if (timeRange) {
    sql += ' AND pr.created_at >= ? AND pr.created_at <= ?';
    params.push(timeRange.from, timeRange.to);
  }
  
  sql += `
    GROUP BY c.id, c.name
    ORDER BY count DESC
  `;
  
  return query<{ category_id: number | null; category_name: string | null; count: number }>(sql, params);
}

export async function getAveragePullRequestSize(organizationId: number, timeRange?: { from: string; to: string }): Promise<{ avg_additions: number; avg_deletions: number; avg_files_changed: number }> {
  let sql = `
    SELECT 
      AVG(pr.additions) as avg_additions,
      AVG(pr.deletions) as avg_deletions,
      AVG(pr.changed_files) as avg_files_changed
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    WHERE r.organization_id = ?
    AND pr.additions IS NOT NULL 
    AND pr.deletions IS NOT NULL 
    AND pr.changed_files IS NOT NULL
  `;
  
  const params: any[] = [organizationId];
  
  if (timeRange) {
    sql += ' AND pr.created_at >= ? AND pr.created_at <= ?';
    params.push(timeRange.from, timeRange.to);
  }
  
  const results = await query<{ avg_additions: number; avg_deletions: number; avg_files_changed: number }>(sql, params);
  return results[0];
} 