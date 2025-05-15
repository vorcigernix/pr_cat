"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { InstallGitHubApp } from '@/components/ui/install-github-app';
import { CheckCircle2, ChevronRight, Github, CheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { allModels, ModelDefinition } from '@/lib/ai-models';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Organization, Repository } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';

// Define the onboarding steps
const STEPS = {
  WELCOME: 0,
  GITHUB_APP: 1,
  AI_SETUP: 2,
  REPO_SELECT: 3,
  COMPLETE: 4
};

// Define minimal organization and repository types
interface GitHubOrganization {
  id: number;
  login: string;
  avatar_url?: string;
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
}

export function OnboardingWizard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(STEPS.WELCOME);
  const [githubAppInstalled, setGithubAppInstalled] = useState(false);
  
  // Add AI settings state
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'google' | 'anthropic' | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');

  // Add organization and repository state
  const [organizations, setOrganizations] = useState<GitHubOrganization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<GitHubOrganization | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<number>>(new Set());
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

  // Filter models based on selected provider
  const availableModels = selectedProvider 
    ? allModels.filter(model => model.provider === selectedProvider)
    : [];

  // Load GitHub data when on repository selection step
  useEffect(() => {
    const fetchGitHubData = async () => {
      if (currentStep === STEPS.REPO_SELECT) {
        await fetchGitHubOrganizations();
      }
    };
    
    fetchGitHubData();
  }, [currentStep]);

  // Fetch GitHub organizations directly
  const fetchGitHubOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      // Use GitHub API directly - bypassing our backend API
      const accessToken = session?.accessToken;
      
      if (!accessToken) {
        console.error('No GitHub access token found in session');
        toast.error('GitHub authorization required');
        return;
      }
      
      const response = await fetch('https://api.github.com/user/orgs', {
        headers: {
          Authorization: `Bearer ${accessToken}`, 
          Accept: 'application/vnd.github.v3+json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const data = await response.json();
      setOrganizations(data);
      
      if (data.length > 0) {
        setSelectedOrg(data[0]);
        fetchGitHubRepositories(data[0].login);
      }
    } catch (error) {
      console.error('Error fetching GitHub organizations:', error);
      toast.error('Failed to load GitHub organizations');
      // Fallback to mocks if needed
      setOrganizations([
        { id: 1, login: 'Example-Organization', avatar_url: '' }
      ]);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  // Fetch repositories for the selected organization
  const fetchGitHubRepositories = async (orgName: string) => {
    setIsLoadingRepos(true);
    try {
      // Use GitHub API directly - bypassing our backend API
      const accessToken = session?.accessToken;
      
      if (!accessToken) {
        console.error('No GitHub access token found in session');
        toast.error('GitHub authorization required');
        return;
      }
      
      const response = await fetch(`https://api.github.com/orgs/${orgName}/repos?per_page=100`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const data = await response.json();
      setRepositories(data);
    } catch (error) {
      console.error(`Error fetching repositories for ${orgName}:`, error);
      toast.error('Failed to load repositories');
      // Fallback to mocks if needed
      setRepositories([
        { id: 101, name: 'example-repo', full_name: 'Example-Organization/example-repo', private: false }
      ]);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Handle organization selection
  const handleOrgSelect = (org: GitHubOrganization) => {
    setSelectedOrg(org);
    setRepositories([]);
    setSelectedRepoIds(new Set());
    fetchGitHubRepositories(org.login);
  };
  
  // Toggle repository selection
  const toggleRepository = (repoId: number) => {
    setSelectedRepoIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(repoId)) {
        newSet.delete(repoId);
      } else {
        newSet.add(repoId);
      }
      return newSet;
    });
  };
  
  // Check if GitHub App is installed (simplified version)
  useEffect(() => {
    // In a real implementation, you'd make an API call to check if the GitHub App
    // is installed for the user's organization
    const checkGitHubAppInstallation = async () => {
      try {
        // Mock API call - replace with actual API endpoint
        // const response = await fetch('/api/github/app-installation-status');
        // const data = await response.json();
        // setGithubAppInstalled(data.installed);
        
        // For demo purposes, we'll use a mock check
        // In production, you should implement a proper check
        const hasVisitedGitHub = sessionStorage.getItem('githubAppInstallStarted');
        if (hasVisitedGitHub) {
          setGithubAppInstalled(true);
        }
      } catch (error) {
        console.error('Failed to check GitHub App installation status:', error);
      }
    };
    
    checkGitHubAppInstallation();
  }, [currentStep]);
  
  // Simulate GitHub App installation tracking
  const handleGitHubAppInstall = () => {
    sessionStorage.setItem('githubAppInstallStarted', 'true');
    // This is where you'd open the GitHub App installation page
    // For now, we'll use the InstallGitHubApp component's logic
  };

  // Handle provider selection
  const handleProviderSelect = (provider: 'openai' | 'google' | 'anthropic' | null) => {
    setSelectedProvider(provider);
    setSelectedModelId(null); // Reset model when provider changes
    setApiKey('');
  };
  
  // Go to next step
  const handleNext = async () => {
    if (currentStep < STEPS.COMPLETE) {
      // When moving from GitHub App installation to AI setup,
      // sync GitHub organizations to create user-organization mappings
      if (currentStep === STEPS.GITHUB_APP && githubAppInstalled) {
        try {
          // Call the backend API to sync organizations and create proper user-org mappings
          const response = await fetch('/api/github/organizations/sync', {
            method: 'POST',
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to sync organizations');
          }
          
          const data = await response.json();
          toast.success(`Successfully synced ${data.organizations?.length || 0} organizations`);
        } catch (error) {
          console.error('Error syncing organizations:', error);
          toast.error('Failed to sync GitHub organizations. You may need to re-sync in settings.');
          // Continue anyway to not block user progress
        }
      }

      // Validate AI settings before proceeding
      if (currentStep === STEPS.AI_SETUP) {
        if (!selectedProvider) {
          toast.warning("Please select an AI provider");
          return;
        }
        if (!selectedModelId) {
          toast.warning("Please select an AI model");
          return;
        }
        
        // Save AI settings (in a real app, this would be persisted)
        toast.success(`${selectedProvider} provider with ${selectedModelId} model selected`);
        // In a real implementation, you would save the API key and other settings to the database
      }

      // Handle repository tracking when completing the repo selection step
      if (currentStep === STEPS.REPO_SELECT && selectedRepoIds.size > 0) {
        try {
          // In a real implementation, you would save the selected repositories
          // This is a simplified version that just shows a toast
          toast.success(`${selectedRepoIds.size} repositories selected for tracking`);
          
          // Ideally you'd make an API call to update repositories
          // const response = await fetch('/api/repositories/track', {
          //   method: 'POST',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify({ 
          //     repositoryIds: Array.from(selectedRepoIds),
          //     tracked: true 
          //   })
          // });
          // if (!response.ok) throw new Error('Failed to update repository tracking');
        } catch (error) {
          console.error('Error updating repository tracking:', error);
          toast.error('Failed to update repository tracking');
          return;
        }
      }
      
      setCurrentStep(currentStep + 1);
    } else {
      // Onboarding complete, navigate to dashboard
      router.push('/dashboard');
    }
  };
  
  // Skip onboarding
  const handleSkip = () => {
    toast.info("You can complete setup later in Settings");
    router.push('/dashboard');
  };
  
  // Progress percentage
  const progressPercentage = Math.min(100, (currentStep / (STEPS.COMPLETE)) * 100);

  // Get API key label and link based on provider
  const getApiKeyInfo = () => {
    if (!selectedProvider) return { label: '', link: '' };
    
    switch (selectedProvider) {
      case 'openai':
        return {
          label: 'OpenAI API Key',
          link: 'https://platform.openai.com/api-keys'
        };
      case 'google':
        return {
          label: 'Google AI API Key',
          link: 'https://ai.google.dev/'
        };
      case 'anthropic':
        return {
          label: 'Anthropic API Key',
          link: 'https://console.anthropic.com/'
        };
      default:
        return { label: '', link: '' };
    }
  };
  
  const apiKeyInfo = getApiKeyInfo();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Welcome to PR Cat</CardTitle>
              <CardDescription>
                Let's get your workspace set up in just a few steps
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip Setup
            </Button>
          </div>
        </CardHeader>
        
        <div className="px-6">
          <Progress value={progressPercentage} className="mb-4" />
        </div>
        
        <CardContent>
          {currentStep === STEPS.WELCOME && (
            <div className="space-y-4">
              <p>
              PR Cat helps engineering leads who are in the trenches with their teams. Not an enterprise surveillance tool, but a collaborative platform that improves flow and removes barriers together.
              </p>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>GitHub account connected</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="h-5 w-5 rounded-full border border-muted-foreground/50 flex items-center justify-center">
                    <span className="text-xs">2</span>
                  </div>
                  <span>Install GitHub App</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="h-5 w-5 rounded-full border border-muted-foreground/50 flex items-center justify-center">
                    <span className="text-xs">3</span>
                  </div>
                  <span>Configure AI settings</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="h-5 w-5 rounded-full border border-muted-foreground/50 flex items-center justify-center">
                    <span className="text-xs">4</span>
                  </div>
                  <span>Select repositories</span>
                </div>
              </div>
            </div>
          )}
          
          {currentStep === STEPS.GITHUB_APP && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Install GitHub App</h3>
              <p>
                To analyze your pull requests, PR Cat needs access to your GitHub repositories.
                Install our GitHub App to continue.
              </p>
              
              {githubAppInstalled ? (
                <div className="flex items-center p-4 bg-green-50 dark:bg-green-950/30 rounded-md">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  <span>GitHub App installed successfully!</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4 p-4 bg-muted/50 rounded-md">
                  <Github className="h-10 w-10" />
                  <p className="text-sm text-center">
                    Click the button below to install the PR Cat GitHub App.
                    You'll be redirected to GitHub to complete the installation.
                  </p>
                  <InstallGitHubApp onClick={handleGitHubAppInstall} />
                </div>
              )}
            </div>
          )}
          
          {currentStep === STEPS.AI_SETUP && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configure AI Settings</h3>
              <p>
                PR Cat uses AI to categorize your pull requests. Choose your preferred AI provider and add your API key.
              </p>
              
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label htmlFor="provider-select">Select AI Provider</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={selectedProvider === 'openai' ? 'default' : 'outline'} 
                    className="justify-start h-auto py-2" 
                    onClick={() => handleProviderSelect('openai')}
                  >
                    <div className="flex flex-col items-start">
                      <span>OpenAI</span>
                      <span className="text-xs text-muted-foreground">GPT-4o, GPT-3.5</span>
                    </div>
                  </Button>
                  <Button 
                    variant={selectedProvider === 'google' ? 'default' : 'outline'} 
                    className="justify-start h-auto py-2" 
                    onClick={() => handleProviderSelect('google')}
                  >
                    <div className="flex flex-col items-start">
                      <span>Google</span>
                      <span className="text-xs text-muted-foreground">Gemini</span>
                    </div>
                  </Button>
                  <Button 
                    variant={selectedProvider === 'anthropic' ? 'default' : 'outline'} 
                    className="justify-start h-auto py-2" 
                    onClick={() => handleProviderSelect('anthropic')}
                  >
                    <div className="flex flex-col items-start">
                      <span>Anthropic</span>
                      <span className="text-xs text-muted-foreground">Claude</span>
                    </div>
                  </Button>
                </div>
              </div>
              
              {/* Model Selection - only shown when provider is selected */}
              {selectedProvider && (
                <div className="space-y-2">
                  <Label htmlFor="model-select">Select AI Model</Label>
                  <Select
                    value={selectedModelId || ''}
                    onValueChange={(value) => setSelectedModelId(value || null)}
                  >
                    <SelectTrigger id="model-select">
                      <SelectValue placeholder={`Select ${selectedProvider} model`} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* API Key Input - only shown when provider is selected */}
              {selectedProvider && (
                <div className="space-y-2">
                  <Label htmlFor="api-key-input">{apiKeyInfo.label}</Label>
                  <Input
                    id="api-key-input"
                    type="password"
                    placeholder="Enter your API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your API key from <a href={apiKeyInfo.link} target="_blank" rel="noopener noreferrer" className="underline">
                      {selectedProvider === 'openai' ? 'OpenAI dashboard' : 
                       selectedProvider === 'google' ? 'Google AI Studio' : 'Anthropic Console'}
                    </a>.
                  </p>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground mt-4">
                You can configure these settings in detail later from the Settings page.
              </p>
            </div>
          )}
          
          {currentStep === STEPS.REPO_SELECT && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Repositories</h3>
              <p>
                Choose which repositories you want PR Cat to analyze and categorize pull requests for.
              </p>
              
              {isLoadingOrgs ? (
                <div className="p-4 bg-muted/50 rounded-md text-center">
                  <p>Loading your GitHub organizations...</p>
                </div>
              ) : organizations.length === 0 ? (
                <div className="p-4 bg-muted/50 rounded-md">
                  <p className="text-sm text-center">
                    No GitHub organizations found. Please make sure you've installed the PR Cat GitHub App and have access to GitHub organizations.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Organization List */}
                  <div className="space-y-2">
                    <Label>Select Organization</Label>
                    <div className="flex flex-wrap gap-2">
                      {organizations.map((org) => (
                        <Button
                          key={org.id}
                          variant={selectedOrg?.id === org.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleOrgSelect(org)}
                          className="flex items-center gap-2"
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={org.avatar_url || undefined} alt={org.login} />
                            <AvatarFallback>{org.login.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{org.login}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Repository List */}
                  {selectedOrg && (
                    <div className="space-y-2">
                      <Label>Select Repositories to Track</Label>
                      {isLoadingRepos ? (
                        <p className="text-sm">Loading repositories...</p>
                      ) : repositories.length === 0 ? (
                        <p className="text-sm">No repositories found for this organization.</p>
                      ) : (
                        <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                          {repositories.map((repo) => (
                            <div 
                              key={repo.id} 
                              className="flex items-center p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                              onClick={() => toggleRepository(repo.id)}
                            >
                              <Checkbox 
                                id={`repo-${repo.id}`}
                                checked={selectedRepoIds.has(repo.id)}
                                className="mr-2"
                              />
                              <Label 
                                htmlFor={`repo-${repo.id}`}
                                className="flex-grow cursor-pointer"
                              >
                                {repo.name}
                                {repo.private && (
                                  <span className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">Private</span>
                                )}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Selected {selectedRepoIds.size} repositories for tracking
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {currentStep === STEPS.COMPLETE && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <h3 className="text-lg font-medium">Setup Complete!</h3>
              <p>
                You're all set! PR Cat is now ready to help you analyze and categorize your pull requests.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === STEPS.WELCOME}
          >
            Back
          </Button>
          <Button onClick={handleNext}>
            {currentStep === STEPS.COMPLETE ? "Go to Dashboard" : "Continue"}
            {currentStep !== STEPS.COMPLETE && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 