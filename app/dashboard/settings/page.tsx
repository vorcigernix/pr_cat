import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GitHubProfileCard } from "@/components/ui/github-profile-card"
import { GitHubOrganizationsCard } from "@/components/ui/github-organizations-card"
import { GitHubOrganizationRepositories } from "@/components/ui/github-organization-repositories"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { IconRefresh } from "@tabler/icons-react"
import { ReloadOrganizationsButton } from "@/components/ui/reload-organizations-button"
import { OrganizationSettingsTab } from "@/components/ui/organization-settings-tab"
import { AiSettingsTab } from "@/components/ui/ai-settings-tab"

export default function SettingsPage() {
  // GitHub App installation URL (replace with your app's actual URL if needed)
  const githubAppInstallUrl = "https://github.com/apps/pr-cat/installations/new";

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <h1 className="text-2xl font-semibold">Settings</h1>
              </div>
              <div className="grid gap-4 px-4 lg:px-6">
                <Tabs defaultValue="github" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="github">GitHub</TabsTrigger>
                    <TabsTrigger value="organizations">Organizations</TabsTrigger>
                    <TabsTrigger value="ai">AI & Categorization</TabsTrigger>
                  </TabsList>
                  <TabsContent value="github">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <GitHubProfileCard />
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <div>
                            <CardTitle>GitHub Organizations</CardTitle>
                            <CardDescription>
                              Manage your connected GitHub organizations
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                            >
                              <a
                                href="https://github.com/apps/pr-cat/installations/new"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Manage
                              </a>
                            </Button>
                            <ReloadOrganizationsButton />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <GitHubOrganizationsCard />
                        </CardContent>
                      </Card>
                    </div>
                    <GitHubOrganizationRepositories />
                  </TabsContent>
                  <TabsContent value="organizations">
                    <OrganizationSettingsTab />
                  </TabsContent>
                  <TabsContent value="ai">
                    <AiSettingsTab />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 