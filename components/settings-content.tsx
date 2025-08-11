"use client";

import React, { useEffect, useState } from 'react';
import { use } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
} from "@/components/ui/card";
import { GitHubProfileCard } from "@/components/ui/github-profile-card";
import { GitHubOrganizationRepositories } from "@/components/ui/github-organization-repositories";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrganizationSettingsTab } from "@/components/ui/organization-settings-tab";
import { AiSettingsTab } from "@/components/ui/ai-settings-tab";
import { GitHubOrganizationManager } from "@/components/ui/github-organization-manager";
import { TeamManagement } from "@/components/ui/team-management";
import type { OrganizationWithInstallation } from "@/components/ui/github-org-setup-item";
import type { User } from "@/lib/types";

interface SettingsContentProps {
  organizationsPromise: Promise<OrganizationWithInstallation[]>;
}

export function SettingsContent({ organizationsPromise }: SettingsContentProps) {
  // Use the React 'use' hook to resolve the promise
  const organizations = use(organizationsPromise);
  
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationWithInstallation | null>(null);
  const [orgsState, setOrgsState] = useState<OrganizationWithInstallation[]>(organizations || []);
  const [organizationMembers, setOrganizationMembers] = useState<User[]>([]);

  const handleOrganizationSelected = (org: OrganizationWithInstallation | null) => {
    setSelectedOrganization(org);
  };

  // Keep local organizations state in sync with server-provided list
  useEffect(() => {
    setOrgsState(organizations || []);
  }, [organizations]);

  // Auto-select first available organization (prefer one with the app installed)
  useEffect(() => {
    if (!selectedOrganization && orgsState && orgsState.length > 0) {
      const preferred = orgsState.find((o) => (o as any).hasAppInstalled) || orgsState[0];
      setSelectedOrganization(preferred);
    }
  }, [orgsState, selectedOrganization]);

  // Load members when organization selection changes
  useEffect(() => {
    async function loadMembers() {
      if (!selectedOrganization?.id) {
        setOrganizationMembers([]);
        return;
      }
      try {
        const res = await fetch(`/api/organizations/${selectedOrganization.id}/members`);
        if (!res.ok) return setOrganizationMembers([]);
        const data: User[] = await res.json();
        setOrganizationMembers(Array.isArray(data) ? data : []);
      } catch {
        setOrganizationMembers([]);
      }
    }
    loadMembers();
  }, [selectedOrganization?.id]);

  const refreshMembers = async (search?: string) => {
    if (!selectedOrganization?.id) return;
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`/api/organizations/${selectedOrganization.id}/members${qs}`);
    if (!res.ok) return;
    const data: User[] = await res.json();
    setOrganizationMembers(Array.isArray(data) ? data : []);
  };

  return (
    <Tabs defaultValue="github" className="px-4 lg:px-6">
      <TabsList>
        <TabsTrigger value="github">GitHub</TabsTrigger>
        <TabsTrigger value="teams">Teams</TabsTrigger>
        <TabsTrigger value="ai">AI Settings</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
      </TabsList>
      
      <TabsContent value="github" className="py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Profile and General Info (takes 1/3 on lg screens) */}
          <div className="lg:col-span-1 space-y-6">
            <GitHubProfileCard />
            <Card>
              <CardHeader>
                <CardTitle>GitHub Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Connect your GitHub account to allow PR Cat to access your organization repositories, analyze pull requests, and provide insights.
                  Install the PR Cat GitHub App on organizations you wish to track.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Organization Management & Repositories (takes 2/3 on lg screens) */}
          <div className="lg:col-span-2 space-y-6">
            <GitHubOrganizationManager
              organizations={orgsState}
              selectedOrganization={selectedOrganization}
              onOrganizationSelected={handleOrganizationSelected}
              onOrganizationsUpdated={setOrgsState}
            />

            {selectedOrganization && selectedOrganization.hasAppInstalled && (
              <GitHubOrganizationRepositories 
                organizationId={selectedOrganization.github_id} 
                organizationName={selectedOrganization.name}
                key={selectedOrganization.github_id} // Ensure re-render when org changes
              />
            )}
            
            {selectedOrganization && !selectedOrganization.hasAppInstalled && (
              <Card>
                <CardHeader>
                  <CardTitle>Configure Repositories for {selectedOrganization.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Please install the GitHub App for "{selectedOrganization.name}" to configure its repositories.
                  </p>
                </CardContent>
              </Card>
            )}

            {!selectedOrganization && (
              <Card>
                <CardHeader>
                  <CardTitle>Configure Repositories</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Select an organization with the GitHub App installed to configure its repositories.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="teams" className="py-4">
        {selectedOrganization ? (
          <TeamManagement 
            organizationId={selectedOrganization.id}
            organizationMembers={organizationMembers}
            onRefreshMembers={refreshMembers}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please select an organization from the GitHub tab to manage teams.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
      
      <TabsContent value="ai">
        <AiSettingsTab 
          organizations={orgsState}
          selectedOrganization={selectedOrganization}
        />
      </TabsContent>
      
      <TabsContent value="categories">
        <OrganizationSettingsTab 
          organizations={orgsState}
          selectedOrganization={selectedOrganization}
        />
      </TabsContent>
    </Tabs>
  );
} 