"use client";

import React, { useState } from 'react';
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { GitHubProfileCard } from "@/components/ui/github-profile-card"
import { GitHubOrganizationRepositories } from "@/components/ui/github-organization-repositories"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { OrganizationSettingsTab } from "@/components/ui/organization-settings-tab"
import { AiSettingsTab } from "@/components/ui/ai-settings-tab"
import { GitHubOrganizationManager } from "@/components/ui/github-organization-manager"
import type { OrganizationWithInstallation } from "@/components/ui/github-org-setup-item"

export default function SettingsPage() {
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationWithInstallation | null>(null);

  const handleOrganizationSelected = (org: OrganizationWithInstallation | null) => {
    setSelectedOrganization(org);
  };

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader pageTitle="Settings" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <Tabs defaultValue="github" className="px-4 lg:px-6">
                <TabsList>
                  <TabsTrigger value="github">GitHub</TabsTrigger>
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
                          {/* Add more general info or links here if desired */}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Column 2: Organization Management & Repositories (takes 2/3 on lg screens) */}
                    <div className="lg:col-span-2 space-y-6">
                      <GitHubOrganizationManager 
                        selectedOrganization={selectedOrganization}
                        onOrganizationSelected={handleOrganizationSelected}
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
                              Please install the GitHub App for \"{selectedOrganization.name}\" to configure its repositories.
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
                
                <TabsContent value="ai">
                  <AiSettingsTab />
                </TabsContent>
                
                <TabsContent value="categories">
                  <OrganizationSettingsTab />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 