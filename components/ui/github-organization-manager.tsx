"use client";

import React, { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { GitHubOrgSetupItem, OrganizationWithInstallation } from '@/components/ui/github-org-setup-item';

interface GitHubOrganizationManagerProps {
  organizations: OrganizationWithInstallation[];
  onOrganizationSelected: (org: OrganizationWithInstallation | null) => void;
  selectedOrganization: OrganizationWithInstallation | null;
  onOrganizationsUpdated: (orgs: OrganizationWithInstallation[]) => void;
}

export function GitHubOrganizationManager({
  organizations = [],  // Provided from parent as source of truth
  onOrganizationSelected,
  selectedOrganization,
  onOrganizationsUpdated,
}: GitHubOrganizationManagerProps) {
  const { data: session } = useSession();
  
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleRefresh = async () => {
      setRefreshing(true);
      toast.info("Checking GitHub App installation status...");

    try {
      const response = await fetch('/api/github/organizations/installation-status');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch installation status');
      }
      const data = await response.json();
      const fetchedOrgs = data.installations || [];
      onOrganizationsUpdated(fetchedOrgs);

      if (selectedOrganization) {
        const currentSelectedOrgInNewList = fetchedOrgs.find(
          (o: OrganizationWithInstallation) => o.github_id === selectedOrganization.github_id
        );
        if (!currentSelectedOrgInNewList || !currentSelectedOrgInNewList.hasAppInstalled) {
          if (selectedOrganization.hasAppInstalled || !currentSelectedOrgInNewList) { 
            onOrganizationSelected(null);
          }
        } 
      }

        toast.success("Installation status updated");
    } catch (error) {
      console.error('Error fetching GitHub App installation status:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to check installation status');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncOrganizations = async () => {
    if (!session?.accessToken) {
      toast.error('GitHub authorization required');
      return;
    }

    setSyncing(true);
    toast.info("Syncing GitHub organizations...");

    try {
      // Call the backend API to sync organizations
      const response = await fetch('/api/github/organizations/sync', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync organizations');
    }
      
      const data = await response.json();
      toast.success(`Successfully synced ${data.organizations?.length || 0} organizations`);
      
      // Refresh the data after sync
      await handleRefresh();
    } catch (error) {
      console.error('Error syncing organizations:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync organizations');
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectOrganization = (org: OrganizationWithInstallation) => {
    if (org.hasAppInstalled) {
      onOrganizationSelected(org);
    } else {
      toast.info("Please install the GitHub App for this organization to select it.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Manage GitHub Organizations</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSyncOrganizations} disabled={syncing}>
              <RotateCw className={syncing ? "h-4 w-4 animate-spin" : "h-4 w-4 mr-2"} />
              {!syncing && "Sync Organizations"}
              {syncing && "Syncing..."}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4 mr-2"} />
            Refresh Status
          </Button>
          </div>
        </div>
        <CardDescription>
          Select an organization to configure its repositories, or install the GitHub App if not already active.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!organizations || organizations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No organizations found. Ensure your GitHub organization membership is public. 
            You can manage visibility at <a href="https://github.com/settings/organizations" target="_blank" rel="noopener noreferrer" className="underline">GitHub Organization Settings</a>. 
            Try syncing again.
          </p>
        ) : (
          <div className="space-y-2">
            {organizations.map((org) => (
              <GitHubOrgSetupItem 
                key={org.github_id} 
                org={org} 
                isSelected={selectedOrganization?.github_id === org.github_id && org.hasAppInstalled}
                onSelectOrganization={handleSelectOrganization}
                onAppInstallInitiated={() => setTimeout(() => handleRefresh(), 3000)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 