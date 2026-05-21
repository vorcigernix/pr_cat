"use client";

import React from 'react';
import { Button } from './button';
import { toast } from 'sonner';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { IconBrandGithub } from '@tabler/icons-react';
import { cn } from "@/lib/utils";

type InstallButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type InstallButtonSize = "default" | "sm" | "lg" | "icon";

interface InstallGitHubAppButtonProps {
  className?: string;
  variant?: InstallButtonVariant;
  size?: InstallButtonSize;
  onClick?: () => void;
  organizationName?: string; // Display name of the org
  organizationGitHubId?: number; // GitHub's numerical ID for the org
}

interface GitHubAppInstalledBadgeProps {
  className?: string;
  size?: InstallButtonSize;
  label?: string;
}

function getInstallUrl(githubAppSlug: string, organizationGitHubId?: number) {
  if (organizationGitHubId) {
    return `https://github.com/apps/${githubAppSlug}/installations/new/permissions?target_id=${organizationGitHubId}`;
  }

  return `https://github.com/apps/${githubAppSlug}/installations/new`;
}

export function InstallGitHubAppButton({
  className, 
  variant = "default", 
  size = "default", 
  onClick,
  organizationName,
  organizationGitHubId
}: InstallGitHubAppButtonProps) {
  const githubAppSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;

  if (!githubAppSlug) {
    console.error("NEXT_PUBLIC_GITHUB_APP_SLUG is not configured.");
    return <Button disabled>Install GitHub App (Config Error)</Button>;
  }
  
  const handleInstallApp = () => {
    const installUrl = getInstallUrl(githubAppSlug, organizationGitHubId);
    window.open(installUrl, '_blank');
    
    const orgText = organizationName ? ` for ${organizationName}` : '';
    toast.info(
      `GitHub App installation process started${orgText}`, 
      {
        description: "After selecting your organization and completing the installation on GitHub, please refresh the status on this page.",
        action: {
          label: "Installation Complete? Refresh",
          onClick: () => {
            if (onClick) onClick();
            toast.success(`Installation status will be checked.`);
          }
        },
        duration: 15000, 
      }
    );
  };

  return (
    <Button 
      onClick={handleInstallApp}
      variant={variant}
      size={size}
      className={className}
    >
      <IconBrandGithub className="mr-2 h-4 w-4" />
      {organizationName ? `Install for ${organizationName}` : 'Install GitHub App'}
      <ExternalLink className="ml-2 h-3 w-3 opacity-70" />
    </Button>
  );
}

export function GitHubAppInstalledBadge({
  className,
  size = "default",
  label = "App Installed",
}: GitHubAppInstalledBadgeProps) {
  return (
    <Button
      variant="outline"
      size={size}
      className={cn(
        "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400",
        className
      )}
      disabled
    >
      <CheckCircle2 className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

// Backward-compatible alias while callsites migrate to explicit variants.
export const InstallGitHubApp = InstallGitHubAppButton;
