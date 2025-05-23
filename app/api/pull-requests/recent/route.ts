import { NextRequest, NextResponse } from 'next/server';
import * as PRRepository from '@/lib/repositories/pr-repository';
import * as UserRepository from '@/lib/repositories/user-repository';
import { getUserWithOrganizations } from '@/lib/auth-context';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Use cached user context to avoid repeated queries
    const { user, primaryOrganization } = await getUserWithOrganizations(request);
    const orgId = primaryOrganization.id;

    // Get recent pull requests for the organization
    const recentPRs = await query<{
      id: number;
      number: number;
      title: string;
      author_id: string | null;
      state: string;
      created_at: string;
      merged_at: string | null;
      repository_id: number;
      repository_name: string;
      repository_full_name: string;
      category_name: string | null;
      category_color: string | null;
      additions: number | null;
      deletions: number | null;
      changed_files: number | null;
    }>(`
      SELECT 
        pr.id,
        pr.number,
        pr.title,
        pr.author_id,
        pr.state,
        pr.created_at,
        pr.merged_at,
        pr.repository_id,
        r.name as repository_name,
        r.full_name as repository_full_name,
        c.name as category_name,
        c.color as category_color,
        pr.additions,
        pr.deletions,
        pr.changed_files
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      LEFT JOIN categories c ON pr.category_id = c.id
      WHERE r.organization_id = ?
      ORDER BY pr.created_at DESC
      LIMIT 20
    `, [orgId]);

    // Get unique author IDs to fetch author details in batch
    const authorIds = [...new Set(recentPRs.map(pr => pr.author_id).filter(id => id !== null))];
    
    // Fetch all authors in a single query (only if there are author IDs)
    let authors: { id: string; name: string | null; email: string; }[] = [];
    if (authorIds.length > 0) {
      authors = await query<{
        id: string;
        name: string | null;
        email: string;
      }>(`
        SELECT id, name, email
        FROM users 
        WHERE id IN (${authorIds.map(() => '?').join(',')})
      `, authorIds);
    }

    // Create author lookup map
    const authorMap = new Map(authors.map(author => [author.id, author]));

    // Helper function to calculate cycle time in hours
    const calculateCycleTime = (createdAt: string, mergedAt: string | null): number => {
      if (!mergedAt) return 0;
      const created = new Date(createdAt);
      const merged = new Date(mergedAt);
      return Math.round((merged.getTime() - created.getTime()) / (1000 * 60 * 60) * 10) / 10; // Round to 1 decimal
    };

    // Format the pull requests to match the expected format for backward compatibility
    const formattedPRs = recentPRs.map(pr => ({
      id: pr.id,
      title: pr.title,
      number: pr.number,
      // Map author to developer for backward compatibility
      developer: pr.author_id ? (authorMap.get(pr.author_id) ? {
        id: pr.author_id,
        name: authorMap.get(pr.author_id)!.name || 'Unknown'
      } : {
        id: pr.author_id,
        name: 'Unknown'
      }) : {
        id: 0,
        name: 'Unknown'
      },
      repository: {
        id: pr.repository_id,
        name: pr.repository_name
      },
      // Map state to status for backward compatibility
      status: pr.state,
      createdAt: pr.created_at,
      mergedAt: pr.merged_at || '',
      // Calculate cycle time
      cycleTime: calculateCycleTime(pr.created_at, pr.merged_at),
      // Map category to investmentArea for backward compatibility
      investmentArea: pr.category_name,
      // Map additions/deletions to linesAdded/linesRemoved for backward compatibility
      linesAdded: pr.additions || 0,
      linesRemoved: pr.deletions || 0,
      files: pr.changed_files || 0,
      // Keep new format for components that might use it
      author: pr.author_id ? authorMap.get(pr.author_id) || { name: 'Unknown', email: 'unknown@example.com' } : null,
      state: pr.state,
      created_at: pr.created_at,
      merged_at: pr.merged_at,
      category: pr.category_name ? {
        name: pr.category_name,
        color: pr.category_color
      } : null,
      additions: pr.additions,
      deletions: pr.deletions,
      changed_files: pr.changed_files
    }));

    return NextResponse.json(formattedPRs);
  } catch (error) {
    console.error('Error fetching recent pull requests:', error);
    return NextResponse.json({ error: 'Failed to fetch pull requests' }, { status: 500 });
  }
} 