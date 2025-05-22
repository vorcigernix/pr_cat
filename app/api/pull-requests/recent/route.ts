import { NextRequest, NextResponse } from 'next/server';
import { findCategoryById } from '@/lib/repositories';
import * as PRRepository from '@/lib/repositories/pr-repository';
import { RepositoryService } from '@/lib/services/repository-service';
import * as UserRepository from '@/lib/repositories/user-repository';
import * as OrganizationRepository from '@/lib/repositories/organization-repository';
import { PullRequest } from '@/lib/types';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the user's active organization
    const organizations = await OrganizationRepository.getUserOrganizationsWithRole(session.user.id);
    if (!organizations || organizations.length === 0) {
      return NextResponse.json({ error: 'No organizations found' }, { status: 404 });
    }

    // For simplicity, use the first organization
    const orgId = organizations[0].id;

    // Get recent PRs from this organization
    const pullRequests = await PRRepository.getOrganizationPullRequests(orgId, {
      limit: 10,
      orderBy: 'created_at',
      orderDir: 'DESC'
    });

    // Transform the data to match the component's expected format
    const formattedPRs = await Promise.all(pullRequests.map(async (pr: PullRequest) => {
      // Get repository details
      const repo = await RepositoryService.getRepositoryById(pr.repository_id);
      
      // Get author details
      let authorName = 'Unknown';
      if (pr.author_id) {
        const author = await UserRepository.findUserById(pr.author_id);
        if (author) {
          authorName = author.name || author.email || 'Unknown';
        }
      }
      
      // Get category name
      let investmentArea = undefined;
      if (pr.category_id) {
        const category = await findCategoryById(pr.category_id);
        investmentArea = category?.name;
      }
      
      // Calculate cycle time
      let cycleTime = 0;
      if (pr.created_at && pr.merged_at) {
        const created = new Date(pr.created_at);
        const merged = new Date(pr.merged_at);
        cycleTime = (merged.getTime() - created.getTime()) / (1000 * 60 * 60);
      }
      
      return {
        id: pr.id,
        title: pr.title,
        number: pr.number,
        developer: {
          id: pr.author_id || 0,
          name: authorName
        },
        repository: {
          id: repo?.id || 0,
          name: repo?.name || 'Unknown'
        },
        status: pr.state,
        createdAt: pr.created_at,
        mergedAt: pr.merged_at || '',
        cycleTime: cycleTime,
        investmentArea: investmentArea,
        linesAdded: pr.additions || 0,
        linesRemoved: pr.deletions || 0,
        files: pr.changed_files || 0
      };
    }));

    return NextResponse.json(formattedPRs);
  } catch (error) {
    console.error('Error fetching recent pull requests:', error);
    return NextResponse.json({ error: 'Failed to fetch pull requests' }, { status: 500 });
  }
} 