import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { findRepositoryByFullName } from '@/lib/repositories';
import { findOrCreateRepository } from '@/lib/repositories';
import { createPullRequest, findPullRequestByNumber, updatePullRequest } from '@/lib/repositories';

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

export async function POST(request: NextRequest) {
  // Verify webhook signature if secret is configured
  const signature = request.headers.get('x-hub-signature-256');
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  
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
    return handleWebhookEvent(data);
  } else {
    // If no secret is configured, or GitHub didn't send a signature, process without verification
    const data = await request.json();
    return handleWebhookEvent(data);
  }
}

async function handleWebhookEvent(payload: any) {
  const event = payload.action;
  const eventType = payload.pull_request ? 'pull_request' : 
                   payload.review ? 'pull_request_review' : 'unknown';
  
  console.log(`Received GitHub webhook event: ${eventType}.${event}`);
  
  try {
    if (eventType === 'pull_request') {
      await handlePullRequestEvent(payload as PullRequestPayload);
    } else if (eventType === 'pull_request_review') {
      // Handle PR review events (to be implemented)
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
  } else {
    // Create new PR
    await createPullRequest({
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
  }
} 