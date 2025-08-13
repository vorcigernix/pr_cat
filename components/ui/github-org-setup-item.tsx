"use client";

import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InstallGitHubApp } from "@/components/ui/install-github-app";
import { CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";

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
  isSelected: boolean;
  onSelectOrganization: (org: OrganizationWithInstallation) => void;
  onAppInstallInitiated: () => void;
}

export function GitHubOrgSetupItem({
  org,
  isSelected,
  onSelectOrganization,
  onAppInstallInitiated
}: GitHubOrgSetupItemProps) {
  const canBeSelected = org.hasAppInstalled;

  const handleItemClick = () => {
    if (canBeSelected) {
      onSelectOrganization(org);
    }
  };

  return (
    <div 
      className={cn(
        "flex flex-col p-4 border rounded-lg space-y-3",
        canBeSelected && "hover:bg-muted/50 cursor-pointer",
        isSelected && canBeSelected && "ring-2 ring-primary bg-muted/30"
      )}
      onClick={handleItemClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 grow min-w-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={org.avatar_url || undefined} alt={org.name} />
            <AvatarFallback>{org.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="grow min-w-0">
            <p className="font-medium text-lg truncate">{org.name}</p>
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
        
        <div className="shrink-0 ml-2">
            {!org.hasAppInstalled ? (
            <InstallGitHubApp 
                size="sm" 
                organizationName={org.name} 
                organizationGitHubId={org.github_id}
                onClick={onAppInstallInitiated}
            />
            ) : isSelected ? (
                <ChevronRight className="h-6 w-6 text-primary" />
            ) : (
                <ChevronRight className="h-6 w-6 text-muted-foreground/50 group-hover:text-muted-foreground" />
            )}
        </div>
      </div>
      {!org.hasAppInstalled && (
        <p className="text-sm text-muted-foreground pl-13">
          Install the GitHub App to enable repository configuration for this organization.
        </p>
      )}
    </div>
  );
} 