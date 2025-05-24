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
  findOrCreateUserByGitHubId,
  findOrganizationById
} from '@/lib/repositories';
import { findOrganizationByNameAndUser } from '@/lib/repositories/organization-repository';
import { GitHubClient } from '@/lib/github';
import { createInstallationClient } from '@/lib/github-app';
import { PRReview, Category, Organization } from '@/lib/types';
import { openai } from '@ai-sdk/openai';
import { generateText, CoreTool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { allModels } from '@/lib/ai-models'; // Import shared models
import * as OrganizationRepository from '@/lib/repositories/organization-repository';
import { Octokit } from '@octokit/rest';
import * as PullRequestRepository from '@/lib/repositories/pr-repository';
import * as UserRepository from '@/lib/repositories/user-repository';
import { User } from '@/lib/types';

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
  installation?: {
    id: number;
    // Add account details for installation events
    account?: {
      id: number;
      login: string;
      type: string; // "Organization" or "User"
      avatar_url?: string;
    };
  };
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

// Interface for Installation event payload
interface InstallationPayload extends GitHubWebhookPayload {
  action: 'created' | 'deleted' | 'suspend' | 'unsuspend' | 'new_permissions_accepted';
  installation: {
    id: number;
    account: {
      id: number; // This is the GitHub ID of the organization or user
      login: string;
      type: string; // "Organization" or "User"
      avatar_url?: string;
      // ... other account details if needed
    };
    // ... other installation details if needed
  };
  // repositories field might be present if action is 'created' and it's a selective installation
  repositories?: Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
  }>;
}

export async function POST(request: NextRequest) {
  console.log("WEBHOOK: Received GitHub webhook event");
  
  try {
    // Get headers first
    const signature = request.headers.get('x-hub-signature-256');
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    const eventType = request.headers.get('x-github-event');
    
    console.log(`Received GitHub webhook event type: ${eventType}`);
    
    // Clone the request to read the body in different ways
    const requestClone = request.clone();
    
    // Read the body as text first (for signature verification)
    const bodyText = await request.text();
    let bodyJson;
    
    try {
      bodyJson = JSON.parse(bodyText);
      
      // Log installation data from the webhook payload
      console.log("WEBHOOK: Full installation data in payload:", 
                 JSON.stringify(bodyJson.installation, null, 2));
      console.log("WEBHOOK: Repository installation data:", 
                 JSON.stringify(bodyJson.repository?.installation, null, 2));
      
      // Log event type
      console.log(`WEBHOOK: Event type ${bodyJson.action} on ${bodyJson.repository?.full_name}`);
    } catch (parseError) {
      console.error("WEBHOOK: Error parsing webhook body as JSON:", parseError);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    
    if (webhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = 'sha256=' + hmac.update(bodyText).digest('hex');
      
      if (signature !== digest) {
        console.warn('GitHub webhook signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
      
      return handleWebhookEvent(bodyJson, eventType || 'unknown');
    } else {
      // If no secret is configured, or GitHub didn't send a signature, process without verification
      return handleWebhookEvent(bodyJson, eventType || 'unknown');
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { error: `Failed to process webhook: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    );
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
      case 'installation': // Add new case for installation events
        await handleInstallationEvent(payload as InstallationPayload);
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
            await fetchAdditionalPRData(repository, pr, existingPR.id, repoInDb.organization_id, payload);
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
 
        let newPR;
        try {
          newPR = await createPullRequest(newPrParams);
          console.log(`WEBHOOK PR CREATED: New PR #${pr.number} in ${repository.full_name} with DB ID ${newPR.id}`);
        } catch (prCreateError: any) {
          // If UNIQUE constraint error, fallback to update
          if (prCreateError.message && prCreateError.message.includes('UNIQUE constraint failed: pull_requests.repository_id, pull_requests.number')) {
            console.warn(`WEBHOOK PR CREATE: PR already exists (race condition). Falling back to update for PR #${pr.number} in ${repository.full_name}`);
            const fallbackExistingPR = await findPullRequestByNumber(repoInDb.id, pr.number);
            if (fallbackExistingPR) {
              await updatePullRequest(fallbackExistingPR.id, {
                title: pr.title,
                description: pr.body,
                state: typedState,
                updated_at: pr.updated_at,
                closed_at: pr.closed_at,
                merged_at: pr.merged_at,
                draft: pr.draft,
                additions: pr.additions,
                deletions: pr.deletions,
                changed_files: pr.changed_files
              });
              newPR = fallbackExistingPR;
              console.log(`WEBHOOK PR UPDATED (fallback): PR #${pr.number} in ${repository.full_name}`);
            } else {
              throw prCreateError;
            }
          } else {
            logError("PR Creation", prCreateError, { 
              repo_full_name: repository.full_name, 
              repo_id: repoInDb?.id, 
              pr_number: pr.number,
              author_github_id: authorGitHubData.id
            });
            throw prCreateError;
          }
        }
        
        // Fetch additional data for new PRs IFF the action was 'opened'
        if (action === 'opened') {
          console.log(`WEBHOOK ADDITIONAL DATA: New PR #${pr.number} action is 'opened'. Preparing to fetch additional data.`);
          if (repoInDb.organization_id !== null) {
            try {
              await fetchAdditionalPRData(repository, pr, newPR.id, repoInDb.organization_id, payload);
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

// New handler for installation events
async function handleInstallationEvent(payload: InstallationPayload) {
  const { action, installation } = payload;
  const installationId = installation.id;
  const account = installation.account;

  // We are primarily interested in installations on Organizations
  if (account.type !== 'Organization') {
    console.log(`WEBHOOK INSTALLATION: Skipping installation event for non-organization account type: ${account.type}, login: ${account.login}`);
    return;
  }

  const orgGitHubId = account.id;
  const orgLogin = account.login;
  const orgAvatarUrl = account.avatar_url || null;

  console.log(`WEBHOOK INSTALLATION: Action: ${action} for organization ${orgLogin} (GitHub ID: ${orgGitHubId}), Installation ID: ${installationId}`);

  try {
    // Find the organization by its GitHub ID.
    // It's possible the organization isn't in our DB yet if the app is installed on a new org.
    // findOrCreateOrganization will handle this.
    // It expects: github_id, name, avatar_url
    
    // First, ensure the org exists or create it
    let org = await OrganizationRepository.findOrganizationByGitHubId(orgGitHubId);

    if (!org && action === 'created') {
        console.log(`WEBHOOK INSTALLATION: Organization ${orgLogin} (GitHub ID: ${orgGitHubId}) not found. Creating.`);
        try {
            org = await OrganizationRepository.createOrganization({
                github_id: orgGitHubId,
                name: orgLogin,
                avatar_url: orgAvatarUrl
            });
            console.log(`WEBHOOK INSTALLATION: Created organization ${org.name} with DB ID ${org.id}`);
        } catch (createError) {
            logError("handleInstallationEvent - createOrganization", createError, { orgGitHubId, orgLogin });
            return; // Stop if creation fails
        }
    } else if (!org) {
        console.log(`WEBHOOK INSTALLATION: Organization ${orgLogin} (GitHub ID: ${orgGitHubId}) not found for action '${action}'. Skipping update.`);
        return;
    }


    if (action === 'created') {
      // Update the organization with the new installation_id
      const updatedOrg = await OrganizationRepository.updateOrganization(org.id, {
        installation_id: installationId,
        // Optionally update name/avatar if they can change and are in payload
        name: orgLogin, 
        avatar_url: orgAvatarUrl
      });
      if (updatedOrg) {
        console.log(`WEBHOOK INSTALLATION: Stored installation_id ${installationId} for organization ${orgLogin} (DB ID: ${org.id})`);
      } else {
        console.error(`WEBHOOK INSTALLATION: Failed to update organization ${orgLogin} with installation_id ${installationId}`);
      }

      // If repositories are explicitly listed (e.g. selective installation)
      if (payload.repositories && payload.repositories.length > 0) {
        console.log(`WEBHOOK INSTALLATION: Processing ${payload.repositories.length} repositories for new installation on ${orgLogin}`);
        for (const repoData of payload.repositories) {
          try {
            // Use findOrCreateRepository to add these to our system, linking them to the organization
            // Assuming findOrCreateRepository can link to org.id if it's not already doing so.
            // This might require findOrCreateRepository to accept org.id or for you to have a separate step.
            // For now, just logging and ensuring findOrCreateRepository is robust.
            await findOrCreateRepository({ 
              github_id: repoData.id, 
              name: repoData.name, 
              full_name: repoData.full_name,
              private: repoData.private,
              organization_id: org.id, // Crucial link
              description: null, // Default value
              is_tracked: true   // Default value, assume tracked upon installation
            });
            console.log(`WEBHOOK INSTALLATION: Ensured repository ${repoData.full_name} is in DB and linked to org ${org.id}.`);
          } catch (repoError) {
            logError("handleInstallationEvent - findOrCreateRepository", repoError, { repo_full_name: repoData.full_name, org_id: org.id });
          }
        }
      }


    } else if (action === 'deleted') {
      // Clear the installation_id
      const updatedOrg = await OrganizationRepository.updateOrganization(org.id, {
        installation_id: null,
      });
      if (updatedOrg) {
        console.log(`WEBHOOK INSTALLATION: Cleared installation_id for organization ${orgLogin} (DB ID: ${org.id}) due to app uninstallation.`);
      } else {
        console.error(`WEBHOOK INSTALLATION: Failed to clear installation_id for organization ${orgLogin}`);
      }
    } else if (action === 'suspend') {
        // Optionally handle suspension, e.g., by setting installation_id to null or a special status
        console.log(`WEBHOOK INSTALLATION: App suspended for organization ${orgLogin}. Installation ID ${installationId} might be invalid.`);
        await OrganizationRepository.updateOrganization(org.id, { installation_id: null }); // Example: clear it
    } else if (action === 'unsuspend') {
        // App unsuspended, restore installation_id
        console.log(`WEBHOOK INSTALLATION: App unsuspended for organization ${orgLogin}. Restoring Installation ID ${installationId}.`);
        await OrganizationRepository.updateOrganization(org.id, { installation_id: installationId });
    } else {
      console.log(`WEBHOOK INSTALLATION: Unhandled action '${action}' for organization ${orgLogin}.`);
    }
  } catch (error) {
    logError("handleInstallationEvent", error, { action, orgGitHubId, orgLogin, installationId });
  }
}

async function fetchAdditionalPRData(
  repository: PullRequestPayload['repository'], 
  pr: PullRequestPayload['pull_request'], 
  prDbId: number,
  organizationId: number,
  fullPayload?: PullRequestPayload
) {
  console.log(`WEBHOOK ADDITIONAL DATA: Fetching additional data for PR #${pr.number} in org ${organizationId}, PR DB ID=${prDbId}`);
  console.log(`WEBHOOK DEBUG: Repository owner: ${repository.owner.login}, Repository name: ${repository.name}`);
  
  if (!organizationId) {
    console.error('WEBHOOK ERROR: Organization ID not provided to fetchAdditionalPRData. Cannot proceed.');
    return;
  }

  try {
    let installationIdToUse: number | undefined;
    const orgDetails = await findOrganizationById(organizationId);

    if (orgDetails) {
      // Use the installation_id from the DB if available (this is the most reliable source)
      installationIdToUse = orgDetails.installation_id ?? undefined; 
      if (installationIdToUse) {
        console.log(`WEBHOOK DEBUG: Found installation_id in DB for organization_id ${organizationId}: ${installationIdToUse}`);
      } else {
        console.warn(`WEBHOOK WARNING: installation_id was not found or was null in database for organization_id: ${organizationId}.`);
      }
    } else {
      console.error(`WEBHOOK ERROR: Organization with ID ${organizationId} NOT FOUND in database.`);
      // Update PR status to indicate an error if org not found
      await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'error', error_message: 'Organization not found in DB for AI processing' });
      return; 
    }

    // If DB didn't have it, try to get it from the current webhook payload as a fallback
    // This might happen if the installation event is processed slightly after a PR event.
    if (!installationIdToUse) {
      const payloadInstallId = fullPayload?.installation?.id || repository?.installation?.id;
      if (payloadInstallId) {
        installationIdToUse = payloadInstallId;
        console.log(`WEBHOOK DEBUG: Using installation_id from current payload as fallback: ${installationIdToUse} (org_id: ${organizationId})`);
        // Optionally, you could consider updating the org record here if a payload ID is found and DB was null,
        // but handleInstallationEvent should be the primary source of truth for storing it.
      } else {
        console.warn(`WEBHOOK WARNING: No installation_id in DB and no installation_id in current payload for org ${organizationId}.`);
      }
    }
    
    // 1. Get API settings (model + API key)
    console.log(`WEBHOOK AI SETTINGS: Getting AI settings for organization ${organizationId}`);
    const aiSettings = await getOrganizationAiSettings(organizationId);
    const selectedModelId = aiSettings.selectedModelId;
                
    if (!selectedModelId || selectedModelId === '__none__') {
      console.log(`WEBHOOK INFO: AI categorization disabled for organization ${organizationId} (no model selected).`);
      await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'skipped', error_message: 'AI categorization disabled for organization' });
      return;
    }

    const provider = aiSettings.provider;
    
    if (!provider) {
      console.log(`WEBHOOK INFO: AI provider not set for organization ${organizationId}.`);
      await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'skipped', error_message: 'AI provider not set for organization' });
      return;
    }
    
    console.log(`WEBHOOK MODEL: Using AI model ${selectedModelId} with provider ${provider}`);

    const apiKey = await getOrganizationApiKey(organizationId, provider);
    if (!apiKey) {
      console.warn(`WEBHOOK WARNING: API key for provider ${provider} not set for organization ${organizationId}. Skipping AI categorization.`);
      await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'skipped', error_message: `API key for ${provider} not set for organization` });
      return;
    }
    console.log(`WEBHOOK API KEY: API key found for provider ${provider}.`);

    // 2. Instantiate AI Client (using apiKey)
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
          await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'error', error_message: `Unsupported AI provider: ${provider}` });
          return;
      }
    } catch (error) {
      console.error(`WEBHOOK ERROR: Error instantiating AI client provider for ${provider}:`, error);
      await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'error', error_message: `Error instantiating AI client for ${provider}` });
      return;
    }
    console.log(`WEBHOOK AI CLIENT: AI client provider instantiated for: ${provider}`);
    
    const modelInstance = aiClientProvider(selectedModelId);
    if (!modelInstance) {
      console.error(`WEBHOOK ERROR: Could not get model instance for ${selectedModelId} from provider ${provider}`);
      await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'error', error_message: `Could not get AI model instance ${selectedModelId}` });
      return;
    }

    // 3. Create GitHub Client
    let githubClient: GitHubClient;

    if (installationIdToUse) {
      try {
        console.log(`WEBHOOK INSTALLATION ID: Attempting to use GitHub App installation ID: ${installationIdToUse}`);
        githubClient = await createInstallationClient(installationIdToUse);
        console.log(`WEBHOOK CLIENT: Successfully created GitHub client with installation ID ${installationIdToUse}`);
      } catch (clientError) {
        console.error(`WEBHOOK ERROR: Failed to create GitHub client with installation ID ${installationIdToUse}:`, clientError);
        await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'error', error_message: 'Failed to create GitHub client with installation ID' });
        return;
      }
    } else {
      console.error('WEBHOOK ERROR: No installation ID available for organization. Cannot fetch PR diff.');
      await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'error', error_message: 'GitHub authentication failed (no installation ID)' });
      return;
    }

    // 4. Fetch PR Diff and Categorize (using githubClient)
    console.log(`WEBHOOK FETCHING PR DIFF: Fetching PR diff for ${repository.full_name}#${pr.number}`);
    
    let diff: string | null = null;
    try {
      // Try to fetch the PR diff
      diff = await githubClient.getPullRequestDiff(repository.owner.login, repository.name, pr.number);
    } catch (diffError: any) {
      // Check if it's a token expiration error
      if (diffError.message && (
          diffError.message.includes('expired') || 
          diffError.message.includes('GitHub token expired') || 
          diffError.message.includes('invalid') ||
          diffError.message.includes('Bad credentials') ||
          diffError.status === 401)
      ) {
        console.warn(`WEBHOOK TOKEN ERROR: Installation token for ${installationIdToUse} appears to be expired or invalid. Attempting to create a new client.`);
        
        // Try once more with a fresh client
        try {
          // Create fresh client - the token cache will return a new token since the old one was cleared
          githubClient = await createInstallationClient(installationIdToUse);
          console.log(`WEBHOOK CLIENT RECREATED: Successfully created new GitHub client with installation ID ${installationIdToUse}`);
          
          // Retry the diff fetch
          diff = await githubClient.getPullRequestDiff(repository.owner.login, repository.name, pr.number);
          console.log(`WEBHOOK DIFF RETRY: Successfully fetched PR diff on second attempt for ${repository.full_name}#${pr.number}`);
        } catch (retryError) {
          console.error(`WEBHOOK ERROR: Failed to fetch PR diff even after token refresh:`, retryError);
          await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'error', error_message: 'Failed to fetch PR diff even after token refresh' });
          return;
        }
      } else {
        console.error(`WEBHOOK ERROR: Failed to fetch PR diff for ${repository.full_name}#${pr.number}:`, diffError);
        await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'error', error_message: 'Failed to fetch PR diff' });
        return;
      }
    }
    
    if (!diff) {
      console.warn(`WEBHOOK WARNING: Could not fetch PR diff for ${repository.full_name}#${pr.number}. Skipping categorization.`);
      await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'skipped', error_message: 'Could not fetch PR diff' });
      return;
    }

    const orgCategories = await getOrganizationCategories(organizationId);
    const categoryNames = orgCategories.map(c => c.name);
    console.log(`WEBHOOK CATEGORIES: Organization ${organizationId} has ${categoryNames.length} categories:`, categoryNames);

    if (categoryNames.length === 0) {
        console.warn(`WEBHOOK WARNING: No categories found for organization ${organizationId}. Skipping categorization.`);
        await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'skipped', error_message: 'No categories configured for organization' });
        return;
    }

    await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'processing' });

    // Create a more restrictive prompt with numbered options
    const categoryOptions = categoryNames.map((name, index) => `${index + 1}. ${name}`).join('\n');
    
    const systemPrompt = `You are an expert at categorizing GitHub pull requests. You MUST select EXACTLY ONE category from the numbered list below. Do not create new categories or modify the category names.

AVAILABLE CATEGORIES:
${categoryOptions}

Analyze the pull request and respond in this EXACT format:
Category: [EXACT CATEGORY NAME FROM LIST]
Confidence: [NUMBER BETWEEN 0.0 AND 1.0]

Example: Category: Bug Fix, Confidence: 0.85

IMPORTANT: The category name must match EXACTLY one of the categories listed above. Do not abbreviate, modify, or create new category names.`;

    const userPrompt = `Title: ${pr.title}
Body: ${pr.body || ''}
Diff:
${diff}`;

    console.log(`WEBHOOK GENERATING TEXT: Generating text with model ${selectedModelId} for PR #${pr.number}`);

    try {
      const { text } = await generateText({
        model: modelInstance,
        system: systemPrompt,
        prompt: userPrompt,
      });

      console.log(`WEBHOOK AI RESPONSE: AI Response for PR #${pr.number}: ${text}`);

      // Parse AI response - handle both comma-separated and newline-separated formats
      const categoryMatch = text.match(/Category:\s*(.*?)(?:,|\n)\s*Confidence:\s*(\d+\.?\d*)/i);
      if (categoryMatch && categoryMatch[1] && categoryMatch[2]) {
        const suggestedCategoryName = categoryMatch[1].trim();
        const confidence = parseFloat(categoryMatch[2]);

        // First, try exact match
        let category = await findCategoryByNameAndOrgFromRepo(organizationId, suggestedCategoryName);
        console.log(`WEBHOOK CATEGORY LOOKUP: Category '${suggestedCategoryName}' found in DB? ${!!category}`,
                    category ? `id=${category.id}, org_id=${category.organization_id}` : "NOT FOUND");
        
        // If no exact match, try fuzzy matching as fallback
        if (!category) {
          console.log(`WEBHOOK FUZZY MATCHING: Attempting fuzzy match for '${suggestedCategoryName}' in categories: ${categoryNames.join(', ')}`);
          
          // Simple fuzzy matching - find closest match
          let bestMatch = null;
          let bestScore = 0;
          
          for (const categoryName of categoryNames) {
            // Calculate similarity score (simple case-insensitive contains check + length similarity)
            const suggested = suggestedCategoryName.toLowerCase().trim();
            const candidate = categoryName.toLowerCase().trim();
            
            let score = 0;
            if (suggested === candidate) {
              score = 1.0; // Perfect match
            } else if (suggested.includes(candidate) || candidate.includes(suggested)) {
              score = 0.8; // Contains match
            } else {
              // Levenshtein-like simple scoring
              const maxLength = Math.max(suggested.length, candidate.length);
              const commonChars = suggested.split('').filter(char => candidate.includes(char)).length;
              score = commonChars / maxLength;
            }
            
            if (score > bestScore && score > 0.6) { // Minimum threshold
              bestScore = score;
              bestMatch = categoryName;
            }
          }
          
          if (bestMatch) {
            console.log(`WEBHOOK FUZZY MATCH: Found fuzzy match '${bestMatch}' for '${suggestedCategoryName}' with score ${bestScore}`);
            category = await findCategoryByNameAndOrgFromRepo(organizationId, bestMatch);
          }
        }
        
        if (category) {
          try {
            const updateCategoryParams = {
              pr_id: prDbId,
              category_id: category.id,
              confidence: confidence
            };
            
            logOperation("updatePullRequestCategory", updateCategoryParams);
            
            await updatePullRequestCategory(prDbId, category.id, confidence);
            await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'completed' });
            console.log(`WEBHOOK CATEGORY ASSIGNED: PR #${pr.number} categorized as '${category.name}' (ID: ${category.id}) with confidence ${confidence}`);
          } catch (categoryError) {
            logError("updatePullRequestCategory", categoryError, {
              pr_id: prDbId,
              category_id: category.id,
              category_name: category.name,
              confidence: confidence
            });
            await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'error', error_message: 'Failed to update PR with category' });
          }
        } else {
          console.warn(`WEBHOOK CATEGORY ERROR: AI suggested category '${suggestedCategoryName}' not found for organization ${organizationId}.`);
          await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'error', error_message: `AI suggested category '${suggestedCategoryName}' not found` });
        }
      } else {
        console.warn(`WEBHOOK PARSE ERROR: Could not parse category and confidence from AI response for PR #${pr.number}: ${text}`);
        await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'error', error_message: 'Could not parse AI category response' });
      }
    } catch (aiError) {
      logError("AI Text Generation", aiError, {
         pr_id: prDbId,
         model: selectedModelId
      });
      await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'error', error_message: 'AI text generation failed' });
    }

  } catch (error) {
    logError("fetchAdditionalPRData main try-catch", error, {
      repo_name: repository.full_name, 
      pr_number: pr.number,
      pr_id: prDbId,
      org_id: organizationId
    });
    // Attempt to update PR status to error if not already handled
    try {
        await PullRequestRepository.updatePullRequest(prDbId, { ai_status: 'error', error_message: 'Critical error in fetchAdditionalPRData' });
    } catch (updateErr) {
        logError("fetchAdditionalPRData - final PR status update error", updateErr, { pr_id: prDbId });
    }
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