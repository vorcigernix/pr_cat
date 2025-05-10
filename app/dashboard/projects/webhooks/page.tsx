import { auth } from '@/auth';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { findUserById } from '@/lib/repositories';
import { GitHubWebhookConfig, WebhookRepository } from '@/components/ui/github-webhook-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RepositoryService } from '@/lib/services/repository-service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata: Metadata = {
  title: 'Webhook Configuration',
  description: 'Configure GitHub webhooks for real-time PR tracking',
};

interface WebhookPageProps {
  searchParams: {
    org?: string;
  };
}

async function toggleWebhook(repository: WebhookRepository, newState: boolean): Promise<void> {
  'use server';
  
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  
  const apiUrl = `/api/github/repositories/${repository.github_id}/webhook`;
  const response = await fetch(process.env.APP_URL + apiUrl, {
    method: newState ? 'POST' : 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': (session as any).cookies || '',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update webhook');
  }
  
  return;
}

export default async function WebhooksPage({ searchParams }: WebhookPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/sign-in');
  }
  
  // Fetch user
  const user = await findUserById(session.user.id);
  if (!user) {
    redirect('/sign-in');
  }
  
  // Fetch repositories organized by organization, using the user-organization relationship
  const orgRepos = await RepositoryService.getRepositoriesForUserOrganizations(user.id);
  
  // Default to the first organization if none specified
  let selectedOrgId = searchParams.org ? parseInt(searchParams.org) : 
                     (orgRepos.length > 0 ? orgRepos[0].organization.id : 0);
  
  // Find the selected organization in our list
  const selectedOrg = orgRepos.find(item => item.organization.id === selectedOrgId)?.organization;
  
  // If the user doesn't have access to the selected org, default to the first one
  if (!selectedOrg && orgRepos.length > 0) {
    selectedOrgId = orgRepos[0].organization.id;
  }
  
  // Get repositories for the selected organization
  const repositories = selectedOrgId 
    ? orgRepos.find(item => item.organization.id === selectedOrgId)?.repositories || []
    : [];
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Webhook Configuration</h1>
        <p className="text-muted-foreground">
          Configure webhooks to track pull requests in real-time
        </p>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>What are webhooks?</CardTitle>
          <CardDescription>
            Webhooks allow PR Cat to receive real-time updates when pull requests are created, updated, or reviewed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            When you enable tracking for a repository, PR Cat will:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Create a webhook in your GitHub repository</li>
            <li>Receive real-time notifications for PR events</li>
            <li>Process and categorize new PRs automatically</li>
            <li>Track review activity as it happens</li>
          </ul>
          <p className="text-sm mt-4">
            You can enable or disable tracking at any time, and PR Cat will handle the webhook configuration for you.
          </p>
        </CardContent>
      </Card>
      
      {orgRepos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No organizations found</CardTitle>
            <CardDescription>
              No GitHub organizations are available for configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You need to add PR Cat to your GitHub organizations before you can configure webhooks.
              Please visit the <a href="/dashboard/settings" className="underline">settings page</a> to
              connect your GitHub organizations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs defaultValue={selectedOrgId.toString()} className="mb-8">
            <TabsList className="mb-4">
              {orgRepos.map((item) => (
                <TabsTrigger 
                  key={item.organization.id} 
                  value={item.organization.id.toString()}
                  asChild
                >
                  <a href={`/dashboard/projects/webhooks?org=${item.organization.id}`}>
                    {item.organization.name}
                  </a>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {selectedOrg && (
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Repositories in {selectedOrg.name}
                </h2>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {repositories.length === 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>No repositories found</CardTitle>
                        <CardDescription>
                          No repositories are available in this organization
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Try syncing your GitHub repositories from the settings page,
                          or select a different organization.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    repositories.map((repository) => (
                      <GitHubWebhookConfig
                        key={repository.id}
                        repository={repository as WebhookRepository}
                        onWebhookToggle={toggleWebhook}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
} 