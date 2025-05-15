import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { createGitHubClient } from "@/lib/github";
import { redirect } from "next/navigation";
import { GitHubOrganization } from "@/lib/types";

interface DebugGitHubData {
  user: {
    login: string;
    id: number;
    name: string | null;
    email: string | null;
  } | null;
  organizations: GitHubOrganization[];
  organizationCount: number;
  error: string | null;
}

export default async function DebugPage() {
  const session = await auth();
  
  if (!session || !session.user) {
    redirect('/sign-in');
  }
  
  let githubData: DebugGitHubData = {
    user: null,
    organizations: [],
    organizationCount: 0,
    error: null
  };
  
  if (session.accessToken) {
    try {
      const githubClient = createGitHubClient(session.accessToken);
      const user = await githubClient.getCurrentUser();
      const orgs = await githubClient.getUserOrganizations();
      
      githubData = {
        user: {
          login: user.login,
          id: user.id,
          name: user.name || null,
          email: user.email || null,
        },
        organizations: orgs,
        organizationCount: orgs.length,
        error: null
      };
    } catch (error) {
      console.error("GitHub API error:", error);
      githubData.error = error instanceof Error ? error.message : "Unknown error";
    }
  } else {
    githubData.error = "No GitHub access token available";
  }
  
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
        <SiteHeader pageTitle="Debug Information" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="grid gap-4 px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>GitHub User</CardTitle>
                    <CardDescription>Current GitHub user information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {githubData.error ? (
                      <div className="text-destructive">{githubData.error}</div>
                    ) : githubData.user ? (
                      <pre className="p-4 bg-gray-50 rounded overflow-x-auto">
                        {JSON.stringify(githubData.user, null, 2)}
                      </pre>
                    ) : (
                      <div>No GitHub user data available</div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>GitHub Organizations</CardTitle>
                    <CardDescription>
                      Organizations returned by GitHub API ({githubData.organizationCount})
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {githubData.error ? (
                      <div className="text-destructive">{githubData.error}</div>
                    ) : githubData.organizations && githubData.organizations.length > 0 ? (
                      <pre className="p-4 bg-gray-50 rounded overflow-x-auto">
                        {JSON.stringify(githubData.organizations, null, 2)}
                      </pre>
                    ) : (
                      <div className="p-4 bg-amber-50 text-amber-800 rounded">
                        <p className="font-semibold mb-2">No GitHub organizations found</p>
                        <p>Your GitHub account is not a member of any organizations. This is why no organizations are displayed in the app.</p>
                        <p className="mt-2">You can:</p>
                        <ul className="list-disc pl-5 mt-1">
                          <li>Create an organization on GitHub</li>
                          <li>Join an existing organization</li>
                          <li>Continue using the app with your personal repositories</li>
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Session Information</CardTitle>
                    <CardDescription>Auth.js session data (non-sensitive)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="p-4 bg-gray-50 rounded overflow-x-auto">
                      {JSON.stringify({
                        user: {
                          id: session.user.id,
                          name: session.user.name,
                          email: session.user.email,
                          image: session.user.image,
                          login: session.user.login,
                        },
                        hasAccessToken: !!session.accessToken,
                        organizations: session.organizations || [],
                      }, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 