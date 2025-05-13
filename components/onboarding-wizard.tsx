"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { InstallGitHubApp } from '@/components/ui/install-github-app';
import { CheckCircle2, ChevronRight, Github } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// Define the onboarding steps
const STEPS = {
  WELCOME: 0,
  GITHUB_APP: 1,
  AI_SETUP: 2,
  REPO_SELECT: 3,
  COMPLETE: 4
};

export function OnboardingWizard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(STEPS.WELCOME);
  const [githubAppInstalled, setGithubAppInstalled] = useState(false);
  
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
  
  // Go to next step
  const handleNext = () => {
    if (currentStep < STEPS.COMPLETE) {
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
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Welcome to Pandora</CardTitle>
              <CardDescription>
                Let's get your workspace set up in just a few steps
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip Setup
            </Button>
          </div>
        </CardHeader>
        
        <Progress value={progressPercentage} className="mb-4 mx-6" />
        
        <CardContent>
          {currentStep === STEPS.WELCOME && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Welcome to Pandora PR Categorizer!</h3>
              <p>
                Pandora helps you categorize and analyze pull requests using AI.
                Let's set up your account in a few simple steps.
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
                To analyze your pull requests, Pandora needs access to your GitHub repositories.
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
                    Click the button below to install the Pandora GitHub App.
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
                Pandora uses AI to categorize your pull requests. Choose your preferred AI provider and add your API key.
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium">Select AI Provider</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" className="justify-start h-auto py-2" onClick={() => toast.info("OpenAI selected")}>
                    <div className="flex flex-col items-start">
                      <span>OpenAI</span>
                      <span className="text-xs text-muted-foreground">GPT-4o, GPT-3.5</span>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start h-auto py-2" onClick={() => toast.info("Google selected")}>
                    <div className="flex flex-col items-start">
                      <span>Google</span>
                      <span className="text-xs text-muted-foreground">Gemini</span>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start h-auto py-2" onClick={() => toast.info("Anthropic selected")}>
                    <div className="flex flex-col items-start">
                      <span>Anthropic</span>
                      <span className="text-xs text-muted-foreground">Claude</span>
                    </div>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  You can configure these settings in detail later from the Settings page.
                </p>
              </div>
            </div>
          )}
          
          {currentStep === STEPS.REPO_SELECT && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Repositories</h3>
              <p>
                Choose which repositories you want Pandora to analyze and categorize pull requests for.
              </p>
              <div className="p-4 bg-muted/50 rounded-md">
                <p className="text-sm text-center">
                  You can select repositories once GitHub organizations have been synced.
                  This can be done from the dashboard after setup.
                </p>
              </div>
            </div>
          )}
          
          {currentStep === STEPS.COMPLETE && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <h3 className="text-lg font-medium">Setup Complete!</h3>
              <p>
                You're all set! Pandora is now ready to help you analyze and categorize your pull requests.
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