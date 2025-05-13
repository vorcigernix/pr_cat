"use client";

import React, { useState } from 'react';
import { Button } from './button';
import { toast } from 'sonner';
import { GithubIcon, CheckCircle2, ExternalLink } from 'lucide-react';

interface InstallGitHubAppProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  onClick?: () => void;
  showSuccessState?: boolean;
  organizationName?: string; // Display name of the org
  organizationGitHubId?: number; // GitHub's numerical ID for the org
}

export function InstallGitHubApp({ 
  className, 
  variant = "default", 
  size = "default", 
  onClick,
  showSuccessState = false,
  organizationName,
  organizationGitHubId
}: InstallGitHubAppProps) {
  const [installStarted, setInstallStarted] = useState(false);
  const githubAppSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;
  // const appId = process.env.NEXT_PUBLIC_GITHUB_APP_ID; // Not directly used in the preferred URL

  if (!githubAppSlug) {
    console.error("NEXT_PUBLIC_GITHUB_APP_SLUG is not configured.");
    // Potentially render a disabled button or an error message
    return <Button disabled>Install GitHub App (Config Error)</Button>;
  }
  
  const handleInstallApp = () => {
    let installUrl = `https://github.com/apps/${githubAppSlug}/installations/new`;

    if (organizationGitHubId) {
      // This is the preferred URL for installing on a specific organization, pre-selecting it.
      installUrl = `https://github.com/apps/${githubAppSlug}/installations/new/permissions?target_id=${organizationGitHubId}`;
    } else if (organizationName) {
      // Fallback if only name is available - this might lead to the user selecting the org again.
      // Or, one could attempt the previous URL, but the target_id one is generally more direct for uninstalled apps.
      // For simplicity, let's direct to the general page if only name is known and not ID.
      // console.warn("organizationGitHubId not provided to InstallGitHubApp, using general install URL.");
      // The URL `https://github.com/organizations/${organizationName}/settings/installations/new?suggested_target_id=${appId}`
      // has proven problematic. So we default to the general app installation page where user selects the org.
      // If NEXT_PUBLIC_GITHUB_APP_ID is available, one could also construct:
      // `https://github.com/apps/${githubAppSlug}/installations/new?target_id=${appId}&target_type=Organization` but that still requires user to pick the org.
    }
    
    window.open(installUrl, '_blank');
    setInstallStarted(true);
    
    const orgText = organizationName ? ` for ${organizationName}` : '';
    toast.info(
      `GitHub App installation process started${orgText}`, 
      {
        description: "After selecting your organization and completing the installation on GitHub, please refresh the status on this page.",
        action: {
          label: "Installation Complete? Refresh",
          onClick: () => {
            if (onClick) onClick(); // This is the onAppInstallInitiated callback
            toast.success(`Installation status will be checked.`);
          }
        },
        duration: 15000, 
      }
    );
    
    // Call the original onClick (onAppInstallInitiated) immediately as well if needed,
    // though the toast action is now the primary way to trigger the refresh.
    // if (onClick) onClick(); 
  };
  
  const showSuccess = showSuccessState || installStarted;
  
  // If showSuccessState is true (meaning parent detected installation), 
  // we show "Installed" even if this specific button click didn't initiate it.
  if (showSuccessState) {
    return (
      <Button 
        variant="outline"
        size={size}
        className={`bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400 ${className}`}
        disabled
      >
        <CheckCircle2 className="mr-2 h-4 w-4" />
        App Installed
      </Button>
    );
  }
  
  return (
    <Button 
      onClick={handleInstallApp}
      variant={variant}
      size={size}
      className={className}
    >
      <GithubIcon className="mr-2 h-4 w-4" />
      {organizationName ? `Install for ${organizationName}` : 'Install GitHub App'}
      <ExternalLink className="ml-2 h-3 w-3 opacity-70" />
    </Button>
  );
} 