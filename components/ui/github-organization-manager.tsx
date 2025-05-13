"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { GitHubOrgSetupItem, OrganizationWithInstallation } from '@/components/ui/github-org-setup-item';

interface GitHubOrganizationManagerProps {
  onOrganizationSelected: (org: OrganizationWithInstallation | null) => void;
  selectedOrganization: OrganizationWithInstallation | null;
}

export function GitHubOrganizationManager({
  onOrganizationSelected,
  selectedOrganization
}: GitHubOrganizationManagerProps) {
  const { data: session } = useSession();
  const [organizations, setOrganizations] = useState<OrganizationWithInstallation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInstallationStatus = useCallback(async (showToast = false) => {
    if (!session?.accessToken) {
      setLoading(false);
      return;
    }

    if (showToast) {
      setRefreshing(true);
      toast.info("Checking GitHub App installation status...");
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/github/organizations/installation-status');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch installation status');
      }
      const data = await response.json();
      const fetchedOrgs = data.installations || [];
      setOrganizations(fetchedOrgs);

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

      if (showToast) {
        toast.success("Installation status updated");
      }
    } catch (error) {
      console.error('Error fetching GitHub App installation status:', error);
      if (showToast) {
        toast.error(error instanceof Error ? error.message : 'Failed to check installation status');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.accessToken, selectedOrganization, onOrganizationSelected]);

  useEffect(() => {
    if (session?.accessToken) {
      fetchInstallationStatus();
    }
  }, [session?.accessToken, fetchInstallationStatus]);

  const handleRefresh = () => {
    fetchInstallationStatus(true);
  };

  const handleSelectOrganization = (org: OrganizationWithInstallation) => {
    if (org.hasAppInstalled) {
      onOrganizationSelected(org);
    } else {
      toast.info("Please install the GitHub App for this organization to select it.");
    }
  };

  if (loading && !refreshing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub Organizations</CardTitle>
          <CardDescription>
            Loading your GitHub organizations and app installation status...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Manage GitHub Organizations</CardTitle>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || loading}>
            <RefreshCw className={(refreshing || loading) ? "h-4 w-4 animate-spin" : "h-4 w-4 mr-2"} />
            Refresh Status
          </Button>
        </div>
        <CardDescription>
          Select an organization to configure its repositories, or install the GitHub App if not already active.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {organizations.length === 0 && !loading ? (
          <p className="text-muted-foreground">
            No GitHub organizations found for your account. If you belong to organizations, try syncing your profile or refresh.
          </p>
        ) : (
          <div className="space-y-2">
            {organizations.map((org) => (
              <GitHubOrgSetupItem 
                key={org.github_id} 
                org={org} 
                isSelected={selectedOrganization?.github_id === org.github_id && org.hasAppInstalled}
                onSelectOrganization={handleSelectOrganization}
                onAppInstallInitiated={() => setTimeout(() => fetchInstallationStatus(true), 3000)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 