import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { 
  findPullRequestById, 
  findRepositoryById,
  updatePullRequest as updatePullRequestRecord,
  updatePullRequestCategory
} from '@/lib/repositories';
import { getOrganizationAiSettings, getOrganizationApiKey } from '@/lib/repositories/settings-repository';
import { getOrganizationCategories, findCategoryByNameAndOrg } from '@/lib/repositories/category-repository';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { GitHubClient } from '@/lib/github';
import { createInstallationClient } from '@/lib/github-app';
import { Octokit } from '@octokit/rest';
import { findOrganizationById } from '@/lib/repositories/organization-repository';

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get PR ID from query params
  const searchParams = request.nextUrl.searchParams;
  const prId = searchParams.get('pr_id');
  if (!prId) {
    return NextResponse.json({ error: 'Missing required parameter: pr_id' }, { status: 400 });
  }
  
  try {
    // Get PR from database
    const pullRequest = await findPullRequestById(parseInt(prId));
    if (!pullRequest) {
      return NextResponse.json({ error: 'PR not found' }, { status: 404 });
    }
    
    // Get repository
    const repository = await findRepositoryById(pullRequest.repository_id);
    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }
    
    // Extract owner and repo name from full_name (format: owner/repo)
    const [owner, repo] = repository.full_name.split('/');
    if (!owner || !repo) {
      return NextResponse.json({ error: 'Invalid repository full_name format' }, { status: 400 });
    }
    
    // Verify organization exists
    const organizationId = repository.organization_id;
    if (!organizationId) {
      return NextResponse.json({ error: 'Repository has no associated organization' }, { status: 400 });
    }
    
    console.log(`DEBUG: Starting categorization for PR #${pullRequest.number} (ID: ${prId}) in ${repository.full_name}`);
    
    // Get API settings for organization
    const aiSettings = await getOrganizationAiSettings(organizationId);
    if (!aiSettings.selectedModelId || aiSettings.selectedModelId === '__none__') {
      return NextResponse.json({ 
        error: 'AI categorization disabled for organization (no model selected)'
      }, { status: 400 });
    }
    
    // Get provider and model info
    const provider = aiSettings.provider;
    const selectedModelId = aiSettings.selectedModelId;
    
    if (!provider) {
      return NextResponse.json({ 
        error: 'AI provider not set for organization'
      }, { status: 400 });
    }
    
    // Get API key for provider
    const apiKey = await getOrganizationApiKey(organizationId, provider);
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: `API key for ${provider} not set for organization`
      }, { status: 400 });
    }
    
    // Initialize AI client
    let aiClientProvider;
    try {
      switch (provider) {
        case 'openai':
          aiClientProvider = createOpenAI({ apiKey });
          break;
        case 'google':
          aiClientProvider = createGoogleGenerativeAI({ apiKey });
          break;
        case 'anthropic':
          aiClientProvider = createAnthropic({ apiKey });
          break;
        default:
          return NextResponse.json({ 
            error: `Unsupported AI provider: ${provider}`
          }, { status: 400 });
      }
    } catch (error) {
      console.error(`DEBUG ERROR: Error instantiating AI client for ${provider}:`, error);
      return NextResponse.json({
        error: `Error instantiating AI client for ${provider}`
      }, { status: 500 });
    }
    
    const modelInstance = aiClientProvider(selectedModelId);
    if (!modelInstance) {
      return NextResponse.json({
        error: `Could not get model instance for ${selectedModelId}`
      }, { status: 500 });
    }

    // Create GitHub client using installation token from the organization
    const organization = await findOrganizationById(organizationId);
    if (!organization || !organization.installation_id) {
      return NextResponse.json({
        error: 'Organization has no GitHub App installation configured'
      }, { status: 500 });
    }
    
    // Create GitHub client using the organization's installation ID
    let githubClient;
    try {
      githubClient = await createInstallationClient(organization.installation_id);
      console.log(`DEBUG: Created GitHub client with installation ID ${organization.installation_id}`);
    } catch (error) {
      console.error(`DEBUG ERROR: Failed to create installation client:`, error);
      return NextResponse.json({
        error: `Failed to authenticate with GitHub App installation: ${error instanceof Error ? error.message : String(error)}`
      }, { status: 500 });
    }
    
    // Fetch PR diff
    console.log(`DEBUG: Fetching PR diff for ${repository.full_name}#${pullRequest.number}`);
    let diff: string;
    try {
      // Try to fetch the PR diff
      diff = await githubClient.getPullRequestDiff(owner, repo, pullRequest.number);
    } catch (diffError: any) {
      // Check if it's a token expiration error
      if (diffError.message && (
          diffError.message.includes('expired') || 
          diffError.message.includes('GitHub token expired') || 
          diffError.message.includes('invalid') ||
          diffError.message.includes('Bad credentials') ||
          diffError.status === 401)
      ) {
        console.warn(`DEBUG TOKEN ERROR: Installation token for ${organization.installation_id} appears to be expired or invalid. Attempting to create a new client.`);
        
        // Try once more with a fresh client
        try {
          // Create fresh client - the token cache will return a new token since the old one was cleared
          githubClient = await createInstallationClient(organization.installation_id);
          console.log(`DEBUG CLIENT RECREATED: Successfully created new GitHub client with installation ID ${organization.installation_id}`);
          
          // Retry the diff fetch
          diff = await githubClient.getPullRequestDiff(owner, repo, pullRequest.number);
          console.log(`DEBUG DIFF RETRY: Successfully fetched PR diff on second attempt for ${repository.full_name}#${pullRequest.number}`);
        } catch (retryError) {
          console.error(`DEBUG ERROR: Failed to fetch PR diff even after token refresh:`, retryError);
          return NextResponse.json({
            error: 'Failed to fetch PR diff even after token refresh'
          }, { status: 500 });
        }
      } else {
        console.error(`DEBUG ERROR: Failed to fetch PR diff:`, diffError);
        return NextResponse.json({
          error: 'Failed to fetch PR diff'
        }, { status: 500 });
      }
    }
    
    // Get organization categories
    const orgCategories = await getOrganizationCategories(organizationId);
    const categoryNames = orgCategories.map(c => c.name);
    
    if (categoryNames.length === 0) {
      return NextResponse.json({
        error: 'No categories found for organization'
      }, { status: 400 });
    }
    
    console.log(`DEBUG: Organization ${organizationId} has ${categoryNames.length} categories:`, categoryNames);
    
    // Mark PR as processing
    await updatePullRequestRecord(pullRequest.id, { ai_status: 'processing' });
    
    // Prepare AI prompt with more restrictive formatting
    const prTitle = pullRequest.title;
    const prBody = pullRequest.description || '';
    
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
    const userPrompt = `Title: ${prTitle}\nBody: ${prBody}\nDiff:\n${diff}`;
    
    console.log(`DEBUG: Generating text with model ${selectedModelId} for PR #${pullRequest.number}`);
    
    try {
      // Call AI model
      const { text } = await generateText({
        model: modelInstance,
        system: systemPrompt,
        prompt: userPrompt,
      });
      
      console.log(`DEBUG: AI response for PR #${pullRequest.number}: ${text}`);
      
      // Parse AI response - handle both comma-separated and newline-separated formats
      const categoryMatch = text.match(/Category:\s*(.*?)(?:,|\n)\s*Confidence:\s*(\d+\.?\d*)/i);
      
      if (categoryMatch && categoryMatch[1] && categoryMatch[2]) {
        const suggestedCategoryName = categoryMatch[1].trim();
        const confidence = parseFloat(categoryMatch[2]);
        
        // First, try exact match
        let category = await findCategoryByNameAndOrg(organizationId, suggestedCategoryName);
        
        // If no exact match, try fuzzy matching as fallback
        if (!category) {
          console.log(`DEBUG FUZZY MATCHING: Attempting fuzzy match for '${suggestedCategoryName}' in categories: ${categoryNames.join(', ')}`);
          
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
            console.log(`DEBUG FUZZY MATCH: Found fuzzy match '${bestMatch}' for '${suggestedCategoryName}' with score ${bestScore}`);
            category = await findCategoryByNameAndOrg(organizationId, bestMatch);
          }
        }
        
        if (category) {
          // Update PR with category
          console.log(`DEBUG: Calling updatePullRequestCategory with PR id: ${pullRequest.id}, category id: ${category.id}, confidence: ${confidence}`);
          const updatedPR = await updatePullRequestCategory(pullRequest.id, category.id, confidence);
          console.log(`DEBUG: updatePullRequestCategory result:`, updatedPR);
          await updatePullRequestRecord(pullRequest.id, { ai_status: 'completed' });
          
          return NextResponse.json({
            success: true,
            category: {
              id: category.id,
              name: category.name,
              confidence: confidence
            },
            updatedPR,
            message: `PR #${pullRequest.number} categorized as '${category.name}' with confidence ${confidence}`
          });
        } else {
          await updatePullRequestRecord(pullRequest.id, { 
            ai_status: 'error', 
            error_message: `AI suggested category '${suggestedCategoryName}' not found`
          });
          
          return NextResponse.json({
            error: `AI suggested category '${suggestedCategoryName}' not found for organization ${organizationId}`
          }, { status: 404 });
        }
      } else {
        await updatePullRequestRecord(pullRequest.id, { 
          ai_status: 'error',
          error_message: 'Could not parse AI category response'
        });
        
        return NextResponse.json({
          error: `Could not parse category and confidence from AI response: ${text}`
        }, { status: 400 });
      }
    } catch (aiError) {
      console.error(`DEBUG ERROR: AI text generation failed:`, aiError);
      
      await updatePullRequestRecord(pullRequest.id, { 
        ai_status: 'error',
        error_message: 'AI text generation failed'
      });
      
      return NextResponse.json({
        error: `AI text generation failed: ${aiError instanceof Error ? aiError.message : String(aiError)}`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('DEBUG ERROR: General error during categorization:', error);
    return NextResponse.json({
      error: `Categorization failed: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
} 