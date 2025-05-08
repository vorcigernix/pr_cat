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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { GitHubProfileCard } from "@/components/ui/github-profile-card"
import { GitHubOrganizationsCard } from "@/components/ui/github-organizations-card"
import { GitHubRepositoriesCard } from "@/components/ui/github-repositories-card"
import { AboutGitHubOrganizationsCard } from "@/components/ui/about-github-organizations-card"

export default function SettingsPage() {
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GitHubProfileCard />
                  <div className="flex flex-col gap-4">
                    <GitHubOrganizationsCard />
                    <AboutGitHubOrganizationsCard />
                  </div>
                </div>
                
                <GitHubRepositoriesCard />
                
                <Card>
                  <CardHeader>
                    <CardTitle>GitHub Integration</CardTitle>
                    <CardDescription>
                      Configure how PR Cat interacts with your GitHub repositories
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto-categorize">Auto-categorize PRs</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically categorize new PRs when they are created
                        </p>
                      </div>
                      <Switch id="auto-categorize" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto-label">Apply GitHub labels</Label>
                        <p className="text-sm text-muted-foreground">
                          Apply investment area labels to PRs in GitHub
                        </p>
                      </div>
                      <Switch id="auto-label" defaultChecked />
                    </div>
                    <Button variant="outline">Manage Repository Access</Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Investment Areas</CardTitle>
                    <CardDescription>
                      Customize investment area categories and thresholds
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline">Manage Categories</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 