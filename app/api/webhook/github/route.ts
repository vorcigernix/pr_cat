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
  updatePullRequestReview,
  updatePullRequestCategory,
  getOrganizationCategories,
  getOrganizationAiSettings,
  getOrganizationApiKey,
  findCategoryByNameAndOrg as findCategoryByNameAndOrgFromRepo
} from '@/lib/repositories';
import { GitHubClient } from '@/lib/github';
import { createInstallationClient } from '@/lib/github-app';
import { PRReview, Category } from '@/lib/types';
import { openai } from '@ai-sdk/openai';
import { generateText, CoreTool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { allModels } from '@/lib/ai-models'; // Import shared models

export const runtime = 'nodejs';

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
    installation?: {
      id: number;
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
    
    // Conditionally call fetchAdditionalPRData ONLY if action is 'opened' 
    // (even for existing PRs, though 'opened' usually implies a new PR).
    // This handles cases like a PR being created, then a webhook failing, then succeeding on a retry 
    // where the PR might now exist but the action is still 'opened' from GitHub's perspective.
    if (action === 'opened') {
      console.log(`PR #${pr.number} action is 'opened'. Preparing to fetch additional data.`);
      if (repoInDb.organization_id !== null) {
        await fetchAdditionalPRData(repository, pr, existingPR.id, repoInDb.organization_id);
      } else {
        console.warn(`Organization ID is null for repository ${repoInDb.full_name}. Skipping AI categorization.`);
      }
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
    
    // Fetch additional data for new PRs IFF the action was 'opened'
    if (action === 'opened') {
      console.log(`New PR #${pr.number} action is 'opened'. Preparing to fetch additional data.`);
      if (repoInDb.organization_id !== null) {
        await fetchAdditionalPRData(repository, pr, newPR.id, repoInDb.organization_id);
      } else {
        console.warn(`Organization ID is null for new PR in repository ${repoInDb.full_name}. Skipping AI categorization.`);
      }
    } else {
      // This case (new PR but action is not 'opened') should be rare for webhooks 
      // unless it's a manual trigger or a very delayed/retried event.
      console.log(`New PR #${pr.number} created, but action was '${action}', not 'opened'. Skipping fetchAdditionalPRData.`);
    }
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

async function fetchAdditionalPRData(
  repository: PullRequestPayload['repository'], 
  pr: PullRequestPayload['pull_request'], 
  prDbId: number,
  organizationId: number
) {
  console.log(`Fetching additional data for PR #${pr.number} in org ${organizationId}`);

  if (!organizationId) {
    console.error('Organization ID not provided to fetchAdditionalPRData. Cannot fetch AI settings.');
    return;
  }

  // 1. Fetch Organization's AI Settings
  const aiSettings = await getOrganizationAiSettings(organizationId);
  if (!aiSettings || !aiSettings.selectedModelId) {
    console.log(`AI categorization disabled for organization ${organizationId} (no model selected).`);
    return;
  }

  const selectedModelId = aiSettings.selectedModelId;
  console.log(`Organization ${organizationId} selected AI model: ${selectedModelId}`);

  // 2. Determine Provider and API Key
  const modelInfo = allModels.find(m => m.id === selectedModelId); // Use imported allModels
  if (!modelInfo) {
    console.error(`Selected model ID ${selectedModelId} not found in shared allModels for organization ${organizationId}.`);
    return;
  }
  const provider = modelInfo.provider;
  console.log(`Determined provider: ${provider} for model ${selectedModelId}`);

  const apiKey = await getOrganizationApiKey(organizationId, provider);
  if (!apiKey) {
    console.warn(`API key for provider ${provider} not set for organization ${organizationId}. Skipping AI categorization.`);
    return;
  }
  console.log(`API key found for provider ${provider}.`);

  // 3. Instantiate AI Client
  let aiClientProvider;
  try {
    switch (provider) {
      case 'openai':
        aiClientProvider = createOpenAI({ apiKey: apiKey });
        break;
      case 'google':
        aiClientProvider = createGoogleGenerativeAI({ apiKey: apiKey });
        break;
      case 'anthropic':
        aiClientProvider = createAnthropic({ apiKey: apiKey });
        break;
      default:
        console.error(`Unsupported AI provider: ${provider} for organization ${organizationId}`);
        return;
    }
  } catch (error) {
    console.error(`Error instantiating AI client provider for ${provider}:`, error);
    return;
  }
  console.log(`AI client provider instantiated for: ${provider}`);
  
  // Get the specific model instance from the provider
  const modelInstance = aiClientProvider(selectedModelId);
  if (!modelInstance) {
    console.error(`Could not get model instance for ${selectedModelId} from provider ${provider}`);
    return;
  }

  let githubClient;
  
  try {
    // Get the installation ID from the webhook payload or DB
    // For simplicity, assuming it's in the webhook payload (repository.installation.id)
    // In a real implementation, you would store this in your DB when the webhook is configured
    const installationId = repository.installation?.id;
    
    if (installationId) {
      console.log(`Using GitHub App installation ID: ${installationId} to fetch PR diff`);
      // Create a GitHub client authenticated with the installation token
      githubClient = await createInstallationClient(installationId);
    } else {
      // Fallback to token-based authentication (if configured)
      console.log('Installation ID not found, trying fallback to token authentication');
      const githubToken = process.env.GITHUB_APP_INSTALLATION_TOKEN || process.env.GITHUB_SYSTEM_TOKEN;
      if (!githubToken) {
        console.warn('GitHub token not available and no installation ID found. Cannot fetch PR diff.');
        return;
      }
      githubClient = new GitHubClient(githubToken);
    }

    console.log(`Fetching PR diff for ${repository.full_name}#${pr.number}`);
    const diff = await githubClient.getPullRequestDiff(repository.owner.login, repository.name, pr.number);
    
    if (!diff) {
        console.warn(`Could not fetch PR diff for ${repository.full_name}#${pr.number}. Skipping categorization.`);
        return;
    }

    const orgCategories = await getOrganizationCategories(organizationId);
    const categoryNames = orgCategories.map(c => c.name);

    if (categoryNames.length === 0) {
        console.warn(`No categories found for organization ${organizationId}. Skipping categorization.`);
        return;
    }

    const systemPrompt = `You are an expert at categorizing GitHub pull requests. Analyze the pull request title, body, and diff. Respond with the most relevant category from the provided list and a confidence score (0-1). Available categories: ${categoryNames.join(', ')}. Respond in the format: Category: [Selected Category], Confidence: [Score]. Example: Category: Bug Fix, Confidence: 0.9`;
    const userPrompt = `Title: ${pr.title}\nBody: ${pr.body || ''}\nDiff:\n${diff}`;

    console.log(`Generating text with model ${selectedModelId} for PR #${pr.number}`);

    const { text } = await generateText({
      model: modelInstance,
      system: systemPrompt,
      prompt: userPrompt,
    });

    console.log(`AI Response for PR #${pr.number}: ${text}`);

    const categoryMatch = text.match(/Category: (.*?), Confidence: (\d\.?\d*)/i);
    if (categoryMatch && categoryMatch[1] && categoryMatch[2]) {
      const categoryName = categoryMatch[1].trim();
      const confidence = parseFloat(categoryMatch[2]);

      const category = await findCategoryByNameAndOrgFromRepo(organizationId, categoryName);
      if (category) {
        await updatePullRequestCategory(prDbId, category.id, confidence);
        console.log(`Categorized PR #${pr.number} as '${categoryName}' with confidence ${confidence}`);
      } else {
        console.warn(`AI suggested category '${categoryName}' not found for organization ${organizationId}.`);
      }
    } else {
      console.warn(`Could not parse category and confidence from AI response for PR #${pr.number}: ${text}`);
    }

  } catch (error) {
    console.error(`Error during AI categorization for PR #${pr.number}:`, error);
    // Decide if this error should halt further processing or just be logged
  }
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