import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Demo Pull Requests API
 * Returns static demo data for pull requests when in demo mode
 * This endpoint works without any external dependencies
 */
export async function GET() {
  try {
    // Read demo data from static files
    const pullRequestsPath = join(process.cwd(), 'app/dashboard/pull-requests.json');
    const repositoriesPath = join(process.cwd(), 'app/dashboard/repositories.json');
    
    const [pullRequestsData, repositoriesData] = await Promise.all([
      readFile(pullRequestsPath, 'utf8'),
      readFile(repositoriesPath, 'utf8')
    ]);
    
    const pullRequests = JSON.parse(pullRequestsData);
    const repositories = JSON.parse(repositoriesData);
    
    // Transform demo data to match expected API format
    const formattedPRs = pullRequests.slice(0, 20).map((pr: any, index: number) => ({
      id: index + 1,
      number: 100 + index,
      title: pr.header || `Demo Pull Request #${index + 1}`,
      author_id: `demo-user-${index % 5}`,
      author_login: `developer-${index % 5}`,
      author_name: `Demo Developer ${index % 5}`,
      state: pr.status === 'Done' ? 'merged' : pr.status === 'In Process' ? 'open' : 'closed',
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      merged_at: pr.status === 'Done' ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
      repository_id: (index % repositories.length) + 1,
      repository_name: repositories[index % repositories.length]?.name || `demo-repo-${index % 5}`,
      repository_full_name: `demo-org/${repositories[index % repositories.length]?.name || `demo-repo-${index % 5}`}`,
      category_name: ['Feature', 'Bug Fix', 'Refactor', 'Documentation', 'Testing'][index % 5],
      category_color: ['#4F46E5', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6'][index % 5],
      additions: Math.floor(Math.random() * 500) + 10,
      deletions: Math.floor(Math.random() * 200) + 1,
      changed_files: Math.floor(Math.random() * 15) + 1,
      pr_size: Math.random() > 0.7 ? 'large' : Math.random() > 0.4 ? 'medium' : 'small',
      complexity_score: Math.random() * 10,
      review_turnaround_hours: Math.random() * 72,
    }));

    return NextResponse.json({
      success: true,
      data: {
        pullRequests: formattedPRs,
        totalCount: formattedPRs.length,
        isDemoData: true,
        message: 'This is demo data. Connect your GitHub account to see real pull requests.'
      }
    });
    
  } catch (error) {
    console.error('Error loading demo PR data:', error);
    
    // Fallback to minimal demo data if file reading fails
    const fallbackPRs = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      number: 100 + index,
      title: `Sample Pull Request #${index + 1}`,
      author_id: `demo-user-${index % 3}`,
      author_login: `developer-${index % 3}`,
      author_name: `Demo Developer ${index % 3}`,
      state: ['open', 'merged', 'closed'][index % 3],
      created_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
      merged_at: index % 3 === 1 ? new Date(Date.now() - index * 12 * 60 * 60 * 1000).toISOString() : null,
      repository_id: (index % 3) + 1,
      repository_name: ['web-app', 'api-service', 'mobile-app'][index % 3],
      repository_full_name: `demo-org/${['web-app', 'api-service', 'mobile-app'][index % 3]}`,
      category_name: ['Feature', 'Bug Fix', 'Refactor'][index % 3],
      category_color: ['#4F46E5', '#EF4444', '#F59E0B'][index % 3],
      additions: Math.floor(Math.random() * 300) + 10,
      deletions: Math.floor(Math.random() * 100) + 1,
      changed_files: Math.floor(Math.random() * 10) + 1,
    }));

    return NextResponse.json({
      success: true,
      data: {
        pullRequests: fallbackPRs,
        totalCount: fallbackPRs.length,
        isDemoData: true,
        message: 'This is demo data. Connect your GitHub account to see real pull requests.'
      }
    });
  }
}

// This endpoint is safe for demo mode and doesn't require authentication
export const dynamic = 'force-dynamic';
