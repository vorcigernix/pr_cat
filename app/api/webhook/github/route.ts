import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { findRepositoryByFullName } from '@/lib/repositories';
import { findOrCreateRepository } from '@/lib/repositories';
import { 
  createPullRequest, 
  findPullRequestByNumber, 
  updatePullRequest,
  createPullRequestReview,
  findReviewByGitHubId,
  updatePullRequestReview
} from '@/lib/repositories';
import { GitHubClient } from '@/lib/github';
import { PRReview } from '@/lib/types';

// GitHub webhook payload types
interface GitHubWebhookPayload {
  action: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      id: number;
      login: string;
    };
  };
  sender: {
    id: number;
    login: string;
  };
}

interface PullRequestPayload extends GitHubWebhookPayload {
  pull_request: {
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: string;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    merged_at: string | null;
    draft: boolean;
    user: {
      id: number;
      login: string;
    };
    additions?: number;
    deletions?: number;
    changed_files?: number;
  };
}

interface PullRequestReviewPayload extends GitHubWebhookPayload {
  pull_request: {
    id: number;
    number: number;
    title: string;
  };
  review: {
    id: number;
    user: {
      id: number;
      login: string;
    };
    body: string | null;
    state: string;
    submitted_at: string;
    commit_id: string;
  };
}

export async function POST(request: NextRequest) {
  // Verify webhook signature if secret is configured
  const signature = request.headers.get('x-hub-signature-256');
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  const eventType = request.headers.get('x-github-event');
  
  console.log(`Received GitHub webhook event type: ${eventType}`);
  
  if (webhookSecret && signature) {
    const payload = await request.text();
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    
    if (signature !== digest) {
      console.warn('GitHub webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }
    
    // Parse the payload back to JSON
    const data = JSON.parse(payload);
    return handleWebhookEvent(data, eventType || 'unknown');
  } else {
    // If no secret is configured, or GitHub didn't send a signature, process without verification
    const data = await request.json();
    return handleWebhookEvent(data, eventType || 'unknown');
  }
}

async function handleWebhookEvent(payload: any, eventType: string) {
  const action = payload.action;
  
  console.log(`Processing GitHub webhook event: ${eventType}.${action}`);
  
  try {
    switch (eventType) {
      case 'pull_request':
        await handlePullRequestEvent(payload as PullRequestPayload);
        break;
      case 'pull_request_review':
        await handlePullRequestReviewEvent(payload as PullRequestReviewPayload);
        break;
      case 'ping':
        // This is a test ping from GitHub when setting up the webhook
        console.log('Received ping from GitHub webhook configuration');
        break;
      default:
        console.log(`Unhandled event type: ${eventType}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { error: `Failed to process webhook: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    );
  }
}

async function handlePullRequestEvent(payload: PullRequestPayload) {
  const { action, repository, pull_request: pr } = payload;
  
  // Find or create the repository in our database
  const repoInDb = await findRepositoryByFullName(repository.full_name);
  
  if (!repoInDb) {
    console.log(`Repository ${repository.full_name} not found in database, skipping webhook processing`);
    return;
  }
  
  // Map GitHub PR state to our state format
  const prState = pr.merged_at 
    ? 'merged' 
    : pr.state === 'closed' ? 'closed' : 'open';
  
  // Check if PR already exists in our database
  const existingPR = await findPullRequestByNumber(repoInDb.id, pr.number);
  
  // For synchronization actions, we need to fetch detailed PR data
  let needsFurtherData = ['opened', 'reopened', 'edited', 'ready_for_review', 'converted_to_draft'].includes(action);
  
  if (existingPR) {
    // Update existing PR
    await updatePullRequest(existingPR.id, {
      title: pr.title,
      description: pr.body,
      state: prState,
      updated_at: pr.updated_at,
      closed_at: pr.closed_at,
      merged_at: pr.merged_at,
      draft: pr.draft,
      additions: pr.additions,
      deletions: pr.deletions,
      changed_files: pr.changed_files
    });
    
    console.log(`Updated PR #${pr.number} in ${repository.full_name}`);
    
    // If significant action, fetch additional data
    if (needsFurtherData) {
      await fetchAdditionalPRData(repository, pr, existingPR.id);
    }
  } else {
    // Create new PR
    const newPR = await createPullRequest({
      github_id: pr.id,
      repository_id: repoInDb.id,
      number: pr.number,
      title: pr.title,
      description: pr.body,
      author_id: pr.user.id.toString(),
      state: prState,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      closed_at: pr.closed_at,
      merged_at: pr.merged_at,
      draft: pr.draft,
      additions: pr.additions || null,
      deletions: pr.deletions || null,
      changed_files: pr.changed_files || null,
      category_id: null,
      category_confidence: null
    });
    
    console.log(`Created new PR #${pr.number} in ${repository.full_name}`);
    
    // Fetch additional data for new PRs
    await fetchAdditionalPRData(repository, pr, newPR.id);
  }
}

async function handlePullRequestReviewEvent(payload: PullRequestReviewPayload) {
  const { repository, pull_request, review } = payload;
  
  // Find repository in our database
  const repoInDb = await findRepositoryByFullName(repository.full_name);
  
  if (!repoInDb) {
    console.log(`Repository ${repository.full_name} not found in database, skipping webhook processing`);
    return;
  }
  
  // Find the PR in our database
  const existingPR = await findPullRequestByNumber(repoInDb.id, pull_request.number);
  
  if (!existingPR) {
    console.log(`PR #${pull_request.number} not found in database for ${repository.full_name}, skipping review processing`);
    return;
  }
  
  // Map GitHub review state to our enum
  const reviewState = mapReviewState(review.state);
  
  // Check if the review already exists
  const existingReview = await findReviewByGitHubId(review.id);
  
  if (existingReview) {
    // Update existing review
    await updatePullRequestReview(existingReview.id, {
      state: reviewState
    });
    
    console.log(`Updated review for PR #${pull_request.number} in ${repository.full_name}`);
  } else {
    // Create new review
    await createPullRequestReview({
      github_id: review.id,
      pull_request_id: existingPR.id,
      reviewer_id: review.user.id.toString(),
      state: reviewState,
      submitted_at: review.submitted_at
    });
    
    console.log(`Created new review for PR #${pull_request.number} in ${repository.full_name}`);
  }
}

async function fetchAdditionalPRData(repository: PullRequestPayload['repository'], pr: PullRequestPayload['pull_request'], prDbId: number) {
  // We need a GitHub token to fetch additional data
  // This is a challenge since the webhook doesn't provide a token
  // For now, we'll log this and handle it in a background job
  
  console.log(`Additional data should be fetched for PR #${pr.number} in ${repository.full_name} (DB ID: ${prDbId})`);
  
  // In the future, we can implement a background job that uses a service account token to fetch:
  // 1. PR files
  // 2. PR commits
  // 3. PR reviews
  // 4. Any other detailed data needed for AI processing
}

// Helper to map GitHub review state to our enum
function mapReviewState(state: string): PRReview['state'] {
  switch (state.toLowerCase()) {
    case 'approved':
      return 'approved';
    case 'changes_requested':
      return 'changes_requested';
    case 'commented':
      return 'commented';
    case 'dismissed':
      return 'dismissed';
    default:
      return 'commented'; // Default fallback
  }
} 