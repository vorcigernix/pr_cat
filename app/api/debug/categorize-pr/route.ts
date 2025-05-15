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

    // Create GitHub client using system token (for testing)
    const githubSystemToken = process.env.GITHUB_APP_INSTALLATION_TOKEN || process.env.GITHUB_SYSTEM_TOKEN;
    if (!githubSystemToken) {
      return NextResponse.json({
        error: 'No system GitHub token configured for PR diff access'
      }, { status: 500 });
    }
    
    const githubClient = new GitHubClient(githubSystemToken);
    
    // Fetch PR diff
    console.log(`DEBUG: Fetching PR diff for ${repository.full_name}#${pullRequest.number}`);
    let diff: string;
    try {
      diff = await githubClient.getPullRequestDiff(owner, repo, pullRequest.number);
    } catch (diffError) {
      console.error(`DEBUG ERROR: Failed to fetch PR diff:`, diffError);
      return NextResponse.json({
        error: 'Failed to fetch PR diff'
      }, { status: 500 });
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
    
    // Prepare AI prompt
    const prTitle = pullRequest.title;
    const prBody = pullRequest.description || '';
    
    const systemPrompt = `You are an expert at categorizing GitHub pull requests. Analyze the pull request title, body, and diff. Respond with the most relevant category from the provided list and a confidence score (0-1). Available categories: ${categoryNames.join(', ')}. Respond in the format: Category: [Selected Category], Confidence: [Score]. Example: Category: Bug Fix, Confidence: 0.9`;
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
      
      // Parse AI response
      const categoryMatch = text.match(/Category: (.*?), Confidence: (\d\.?\d*)/i);
      
      if (categoryMatch && categoryMatch[1] && categoryMatch[2]) {
        const categoryName = categoryMatch[1].trim();
        const confidence = parseFloat(categoryMatch[2]);
        
        // Find category in database
        const category = await findCategoryByNameAndOrg(organizationId, categoryName);
        
        if (category) {
          // Update PR with category
          await updatePullRequestCategory(pullRequest.id, category.id, confidence);
          await updatePullRequestRecord(pullRequest.id, { ai_status: 'completed' });
          
          return NextResponse.json({
            success: true,
            category: {
              id: category.id,
              name: category.name,
              confidence: confidence
            },
            message: `PR #${pullRequest.number} categorized as '${categoryName}' with confidence ${confidence}`
          });
        } else {
          await updatePullRequestRecord(pullRequest.id, { 
            ai_status: 'error', 
            error_message: `AI suggested category '${categoryName}' not found`
          });
          
          return NextResponse.json({
            error: `AI suggested category '${categoryName}' not found for organization ${organizationId}`
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