import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GitHubService } from '@/lib/services';
import { findRepositoryById } from '@/lib/repositories';
import { getOrganizationRole } from '@/lib/repositories/user-repository';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ repositoryId: string }> }
) {
  const { repositoryId } = await params;

  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.accessToken) {
    return NextResponse.json({ error: 'No GitHub access token' }, { status: 400 });
  }

  try {
    // Find repository in database
    const id = Number(repositoryId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid repository ID' }, { status: 400 });
    }
    const repository = await findRepositoryById(id);

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    if (repository.organization_id === null || !await getOrganizationRole(session.user.id, repository.organization_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract owner and repo from full_name (format: owner/repo)
    const [owner, repo] = repository.full_name.split('/');

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Invalid repository full_name format' },
        { status: 400 }
      );
    }

    const githubService = new GitHubService(session.accessToken);
    const result = await githubService.syncRepositoryPullRequests(
      owner,
      repo,
      repository.id
    );

    return NextResponse.json({
      success: result.errors.length === 0,
      message: result.errors.length === 0 ? `Checked ${result.processed} pull requests` : 'Synchronization incomplete; retry to finish',
      count: result.processed,
      ...result
    }, { status: result.errors.length === 0 ? 200 : 502 });
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: `Failed to sync pull requests for repository: ${repositoryId}` },
      { status: 500 }
    );
  }
}
