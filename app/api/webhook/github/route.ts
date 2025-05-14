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
  findCategoryByNameAndOrg as findCategoryByNameAndOrgFromRepo,
  findOrCreateUserByGitHubId
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

// Helper to log operations that might involve foreign keys
function logOperation(operation: string, params: any) {
  console.log(`WEBHOOK DB OPERATION: ${operation}`, JSON.stringify(params, null, 2));
}

// Helper to safely log errors with full stack trace and context
function logError(context: string, error: any, extraData?: any) {
  console.error(`WEBHOOK ERROR in ${context}:`, error);
  if (error instanceof Error) {
    console.error(`  Message: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
  }
  if (extraData) {
    console.error(`  Context data:`, JSON.stringify(extraData, null, 2));
  }
}

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
  
  console.log(`WEBHOOK PROCESSING: PR #${pr.number} action=${action} repo=${repository.full_name}`);
  
  try {
    // Find or create the repository in our database
    const repoInDb = await findRepositoryByFullName(repository.full_name);
    
    console.log(`WEBHOOK REPOSITORY CHECK: ${repository.full_name} found in DB? ${!!repoInDb}`, 
                repoInDb ? `id=${repoInDb.id}, org_id=${repoInDb.organization_id}` : "NOT FOUND");
    
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
    
    console.log(`WEBHOOK PR CHECK: PR #${pr.number} in repo ${repository.full_name} exists in DB? ${!!existingPR}`,
                existingPR ? `id=${existingPR.id}, author_id=${existingPR.author_id}` : "NOT FOUND");
    
    if (existingPR) {
      // Update existing PR
      const updateParams = {
        id: existingPR.id,
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
      };
      
      logOperation("updatePullRequest", updateParams);
      
      try {
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
        
        console.log(`WEBHOOK PR UPDATED: PR #${pr.number} in ${repository.full_name}`);
        
      } catch (updateError) {
        logError("updatePullRequest", updateError, { 
          pr_id: existingPR.id, 
          repo_id: repoInDb.id, 
          author_id: existingPR.author_id 
        });
        throw updateError; // Re-throw to halt further processing
      }
      
      // Conditionally call fetchAdditionalPRData ONLY if action is 'opened' 
      if (action === 'opened') {
        console.log(`WEBHOOK ADDITIONAL DATA: PR #${pr.number} action is 'opened'. Preparing to fetch additional data.`);
        if (repoInDb.organization_id !== null) {
          try {
            await fetchAdditionalPRData(repository, pr, existingPR.id, repoInDb.organization_id);
          } catch (additionalDataError) {
            logError("fetchAdditionalPRData for existing PR", additionalDataError, { 
              pr_id: existingPR.id, 
              repo_id: repoInDb.id, 
              org_id: repoInDb.organization_id 
            });
            // Don't re-throw, allow webhook to complete even if additional data fails
          }
        } else {
          console.warn(`WEBHOOK WARNING: Organization ID is null for repository ${repoInDb.full_name}. Skipping AI categorization.`);
        }
      }
    } else {
      // Create new PR
      console.log(`WEBHOOK PR CREATE: Creating new PR #${pr.number} in ${repository.full_name}`);

      // Ensure the author exists in our database
      const authorGitHubData = pr.user;
      console.log(`WEBHOOK AUTHOR CHECK: PR author GitHub data: id=${authorGitHubData.id}, login=${authorGitHubData.login}`);
 
      try {
        const dbUser = await findOrCreateUserByGitHubId({
          id: authorGitHubData.id.toString(),
          login: authorGitHubData.login,
          avatar_url: null,
          name: null,
        });
 
        console.log(`WEBHOOK AUTHOR RESULT: findOrCreateUserByGitHubId result for GH ID ${authorGitHubData.id}:`, 
                    dbUser ? `User DB ID ${dbUser.id}` : 'null');
 
        if (!dbUser) {
          console.error(`WEBHOOK ERROR: Could not find or create user for GitHub ID: ${authorGitHubData.id}. Skipping PR creation.`);
          return;
        }
 
        // Properly type the state to match the enum expected by createPullRequest
        const typedState = prState as "open" | "closed" | "merged";
        
        const newPrParams = {
          github_id: pr.id,
          repository_id: repoInDb.id,
          number: pr.number,
          title: pr.title,
          description: pr.body,
          author_id: dbUser.id,
          state: typedState, // Use the properly typed state
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
        };
 
        logOperation("createPullRequest", newPrParams);
 
        const newPR = await createPullRequest(newPrParams);
        
        console.log(`WEBHOOK PR CREATED: New PR #${pr.number} in ${repository.full_name} with DB ID ${newPR.id}`);
        
        // Fetch additional data for new PRs IFF the action was 'opened'
        if (action === 'opened') {
          console.log(`WEBHOOK ADDITIONAL DATA: New PR #${pr.number} action is 'opened'. Preparing to fetch additional data.`);
          if (repoInDb.organization_id !== null) {
            try {
              await fetchAdditionalPRData(repository, pr, newPR.id, repoInDb.organization_id);
            } catch (additionalDataError) {
              logError("fetchAdditionalPRData for new PR", additionalDataError, { 
                pr_id: newPR.id, 
                repo_id: repoInDb.id, 
                org_id: repoInDb.organization_id 
              });
              // Don't re-throw, allow webhook to complete even if additional data fails
            }
          } else {
            console.warn(`WEBHOOK WARNING: Organization ID is null for new PR in repository ${repoInDb.full_name}. Skipping AI categorization.`);
          }
        } else {
          console.log(`WEBHOOK INFO: New PR #${pr.number} created, but action was '${action}', not 'opened'. Skipping fetchAdditionalPRData.`);
        }
      } catch (prCreateError) {
        logError("PR Creation", prCreateError, { 
          repo_full_name: repository.full_name, 
          repo_id: repoInDb?.id, 
          pr_number: pr.number,
          author_github_id: authorGitHubData.id
        });
        throw prCreateError;
      }
    }
  } catch (error) {
    logError("handlePullRequestEvent", error, { 
      repo_full_name: repository.full_name, 
      pr_number: pr.number
    });
    throw error; // Re-throw to be handled by the main handler
  }
}

async function handlePullRequestReviewEvent(payload: PullRequestReviewPayload) {
  const { repository, pull_request, review } = payload;
  
  console.log(`WEBHOOK REVIEW PROCESSING: Review for PR #${pull_request.number} repo=${repository.full_name} by user=${review.user.login}`);
  
  try {
    // Find repository in our database
    const repoInDb = await findRepositoryByFullName(repository.full_name);
    
    console.log(`WEBHOOK REPOSITORY CHECK FOR REVIEW: ${repository.full_name} found in DB? ${!!repoInDb}`, 
                repoInDb ? `id=${repoInDb.id}` : "NOT FOUND");
    
    if (!repoInDb) {
      console.log(`Repository ${repository.full_name} not found in database, skipping review webhook processing`);
      return;
    }
    
    // Find the PR in our database
    const existingPR = await findPullRequestByNumber(repoInDb.id, pull_request.number);
    
    console.log(`WEBHOOK PR CHECK FOR REVIEW: PR #${pull_request.number} found in DB? ${!!existingPR}`,
                existingPR ? `id=${existingPR.id}` : "NOT FOUND");
    
    if (!existingPR) {
      console.log(`PR #${pull_request.number} not found in database for ${repository.full_name}, skipping review processing`);
      return;
    }
    
    // Map GitHub review state to our enum
    const reviewState = mapReviewState(review.state);
    
    // Check if the review already exists
    const existingReview = await findReviewByGitHubId(review.id);
    
    console.log(`WEBHOOK REVIEW CHECK: Review ${review.id} exists in DB? ${!!existingReview}`,
                existingReview ? `id=${existingReview.id}, state=${existingReview.state}` : "NOT FOUND");
    
    if (existingReview) {
      // Update existing review
      const updateParams = {
        id: existingReview.id,
        state: reviewState
      };
      
      logOperation("updatePullRequestReview", updateParams);
      
      try {
        await updatePullRequestReview(existingReview.id, {
          state: reviewState
        });
        
        console.log(`WEBHOOK REVIEW UPDATED: Review for PR #${pull_request.number} in ${repository.full_name}`);
      } catch (updateError) {
        logError("updatePullRequestReview", updateError, { 
          review_id: existingReview.id, 
          pr_id: existingPR.id
        });
        throw updateError;
      }
    } else {
      // Create new review
      const newReviewParams = {
        github_id: review.id,
        pull_request_id: existingPR.id,
        reviewer_id: review.user.id.toString(),
        state: reviewState,
        submitted_at: review.submitted_at
      };
      
      logOperation("createPullRequestReview", newReviewParams);
      
      try {
        await createPullRequestReview(newReviewParams);
        
        console.log(`WEBHOOK REVIEW CREATED: New review for PR #${pull_request.number} in ${repository.full_name}`);
      } catch (createError) {
        logError("createPullRequestReview", createError, { 
          review_github_id: review.id,
          pr_id: existingPR.id,
          reviewer_id: review.user.id.toString()
        });
        throw createError;
      }
    }
  } catch (reviewError) {
    logError("handlePullRequestReviewEvent", reviewError, { 
      repo_full_name: repository.full_name, 
      pr_number: pull_request.number,
      review_id: review.id
    });
    throw reviewError;
  }
}

async function fetchAdditionalPRData(
  repository: PullRequestPayload['repository'], 
  pr: PullRequestPayload['pull_request'], 
  prDbId: number,
  organizationId: number
) {
  console.log(`WEBHOOK ADDITIONAL DATA: Fetching additional data for PR #${pr.number} in org ${organizationId}, PR DB ID=${prDbId}`);
  
  // Log the installation object from the repository payload
  console.log(`WEBHOOK INSTALLATION DATA: Repository installation data: ${JSON.stringify(repository.installation, null, 2)}`);

  if (!organizationId) {
    console.error('WEBHOOK ERROR: Organization ID not provided to fetchAdditionalPRData. Cannot fetch AI settings.');
    return;
  }

  try {
    // 1. Fetch Organization's AI Settings
    const aiSettings = await getOrganizationAiSettings(organizationId);
    console.log(`WEBHOOK AI SETTINGS: Organization ${organizationId} AI settings:`, 
                aiSettings ? `model=${aiSettings.selectedModelId}` : "No settings found");
                
    if (!aiSettings || !aiSettings.selectedModelId) {
      console.log(`WEBHOOK INFO: AI categorization disabled for organization ${organizationId} (no model selected).`);
      return;
    }

    const selectedModelId = aiSettings.selectedModelId;
    console.log(`WEBHOOK AI MODEL: Organization ${organizationId} selected AI model: ${selectedModelId}`);

    // 2. Determine Provider and API Key
    const modelInfo = allModels.find(m => m.id === selectedModelId);
    if (!modelInfo) {
      console.error(`WEBHOOK ERROR: Selected model ID ${selectedModelId} not found in allModels for organization ${organizationId}.`);
      return;
    }
    const provider = modelInfo.provider;
    console.log(`WEBHOOK AI PROVIDER: Determined provider: ${provider} for model ${selectedModelId}`);

    const apiKey = await getOrganizationApiKey(organizationId, provider);
    if (!apiKey) {
      console.warn(`WEBHOOK WARNING: API key for provider ${provider} not set for organization ${organizationId}. Skipping AI categorization.`);
      return;
    }
    console.log(`WEBHOOK API KEY: API key found for provider ${provider}.`);

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
          console.error(`WEBHOOK ERROR: Unsupported AI provider: ${provider} for organization ${organizationId}`);
          return;
      }
    } catch (error) {
      console.error(`WEBHOOK ERROR: Error instantiating AI client provider for ${provider}:`, error);
      return;
    }
    console.log(`WEBHOOK AI CLIENT: AI client provider instantiated for: ${provider}`);
    
    // Get the specific model instance from the provider
    const modelInstance = aiClientProvider(selectedModelId);
    if (!modelInstance) {
      console.error(`WEBHOOK ERROR: Could not get model instance for ${selectedModelId} from provider ${provider}`);
      return;
    }

    let githubClient;
    
    try {
      // Get the installation ID from the webhook payload or DB
      // For simplicity, assuming it's in the webhook payload (repository.installation.id)
      // In a real implementation, you would store this in your DB when the webhook is configured
      const installationId = repository.installation?.id;
      
      if (installationId) {
        console.log(`WEBHOOK INSTALLATION ID: Using GitHub App installation ID: ${installationId} to fetch PR diff`);
        // Create a GitHub client authenticated with the installation token
        githubClient = await createInstallationClient(installationId);
      } else {
        // Fallback to token-based authentication (if configured)
        console.log('WEBHOOK WARNING: Installation ID not found, trying fallback to token authentication');
        const githubToken = process.env.GITHUB_APP_INSTALLATION_TOKEN || process.env.GITHUB_SYSTEM_TOKEN;
        if (!githubToken) {
          console.warn('WEBHOOK WARNING: GitHub token not available and no installation ID found. Cannot fetch PR diff.');
          return;
        }
        githubClient = new GitHubClient(githubToken);
      }

      console.log(`WEBHOOK FETCHING PR DIFF: Fetching PR diff for ${repository.full_name}#${pr.number}`);
      const diff = await githubClient.getPullRequestDiff(repository.owner.login, repository.name, pr.number);
      
      if (!diff) {
          console.warn(`WEBHOOK WARNING: Could not fetch PR diff for ${repository.full_name}#${pr.number}. Skipping categorization.`);
          return;
      }

      const orgCategories = await getOrganizationCategories(organizationId);
      const categoryNames = orgCategories.map(c => c.name);
      console.log(`WEBHOOK CATEGORIES: Organization ${organizationId} has ${categoryNames.length} categories:`, categoryNames);

      if (categoryNames.length === 0) {
          console.warn(`WEBHOOK WARNING: No categories found for organization ${organizationId}. Skipping categorization.`);
          return;
      }

      const systemPrompt = `You are an expert at categorizing GitHub pull requests. Analyze the pull request title, body, and diff. Respond with the most relevant category from the provided list and a confidence score (0-1). Available categories: ${categoryNames.join(', ')}. Respond in the format: Category: [Selected Category], Confidence: [Score]. Example: Category: Bug Fix, Confidence: 0.9`;
      const userPrompt = `Title: ${pr.title}\nBody: ${pr.body || ''}\nDiff:\n${diff}`;

      console.log(`WEBHOOK GENERATING TEXT: Generating text with model ${selectedModelId} for PR #${pr.number}`);

      const { text } = await generateText({
        model: modelInstance,
        system: systemPrompt,
        prompt: userPrompt,
      });

      console.log(`WEBHOOK AI RESPONSE: AI Response for PR #${pr.number}: ${text}`);

      const categoryMatch = text.match(/Category: (.*?), Confidence: (\d\.?\d*)/i);
      if (categoryMatch && categoryMatch[1] && categoryMatch[2]) {
        const categoryName = categoryMatch[1].trim();
        const confidence = parseFloat(categoryMatch[2]);

        const category = await findCategoryByNameAndOrgFromRepo(organizationId, categoryName);
        console.log(`WEBHOOK CATEGORY LOOKUP: Category '${categoryName}' found in DB? ${!!category}`,
                    category ? `id=${category.id}, org_id=${category.organization_id}` : "NOT FOUND");
        
        if (category) {
          try {
            const updateCategoryParams = {
              pr_id: prDbId,
              category_id: category.id,
              confidence: confidence
            };
            
            logOperation("updatePullRequestCategory", updateCategoryParams);
            
            await updatePullRequestCategory(prDbId, category.id, confidence);
            console.log(`WEBHOOK CATEGORY ASSIGNED: PR #${pr.number} categorized as '${categoryName}' (ID: ${category.id}) with confidence ${confidence}`);
          } catch (categoryError) {
            logError("updatePullRequestCategory", categoryError, {
              pr_id: prDbId,
              category_id: category.id,
              category_name: categoryName,
              confidence: confidence
            });
            throw categoryError;
          }
        } else {
          console.warn(`WEBHOOK CATEGORY ERROR: AI suggested category '${categoryName}' not found for organization ${organizationId}.`);
        }
      } else {
        console.warn(`WEBHOOK PARSE ERROR: Could not parse category and confidence from AI response for PR #${pr.number}: ${text}`);
      }

    } catch (error) {
      logError("fetchAdditionalPRData", error, {
        repo_name: repository.full_name, 
        pr_number: pr.number,
        pr_id: prDbId,
        org_id: organizationId
      });
      throw error;
    }
  } catch (error) {
    logError("fetchAdditionalPRData", error, {
      repo_name: repository.full_name, 
      pr_number: pr.number,
      pr_id: prDbId,
      org_id: organizationId
    });
    throw error;
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