"use client";

import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InstallGitHubApp } from "@/components/ui/install-github-app";
import { CheckCircle2, XCircle } from 'lucide-react';

export type OrganizationWithInstallation = {
  id: number; // This is the database ID of the org if synced, or a temporary one
  github_id: number; // GitHub's unique ID for the org
  name: string;
  avatar_url: string | null;
  hasAppInstalled: boolean;
  installationId: number | null; // GitHub App installation ID for this org
};

interface GitHubOrgSetupItemProps {
  org: OrganizationWithInstallation;
  onConfigureRepositories: (org: OrganizationWithInstallation) => void;
  onAppInstallInitiated: () => void; // Callback to refresh status after install attempt
}

export function GitHubOrgSetupItem({
  org,
  onConfigureRepositories,
  onAppInstallInitiated
}: GitHubOrgSetupItemProps) {
  return (
    <div className="flex flex-col p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={org.avatar_url || undefined} alt={org.name} />
            <AvatarFallback>{org.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-lg">{org.name}</p>
            {org.hasAppInstalled ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                App Installed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                <XCircle className="mr-1 h-3 w-3" />
                App Not Installed
              </Badge>
            )}
          </div>
        </div>
        {org.hasAppInstalled ? (
          <Button 
            variant="default" 
            size="sm"
            onClick={() => onConfigureRepositories(org)}
          >
            Configure Repositories
          </Button>
        ) : (
          <InstallGitHubApp 
            size="sm" 
            organizationName={org.name} 
            organizationGitHubId={org.github_id}
            onClick={onAppInstallInitiated}
          />
        )}
      </div>
      {!org.hasAppInstalled && (
        <p className="text-sm text-muted-foreground">
          Install the GitHub App to sync repositories and configure webhooks for this organization.
        </p>
      )}
    </div>
  );
} 