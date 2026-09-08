"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { InstallGitHubAppButton } from '@/components/ui/install-github-app';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const STEPS = { WELCOME: 0, GITHUB_APP: 1, REPOSITORIES: 2, COMPLETE: 3 };

interface GitHubOrganization {
  id: number;
  login: string;
  avatar_url?: string;
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
}

async function readGitHubResponse(response: Response) {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || `GitHub request failed (HTTP ${response.status}).`);
  }
  return response.json();
}

const QUERY_OPTIONS = { revalidateOnFocus: false, shouldRetryOnError: false, keepPreviousData: false };

async function fetchGitHubList([url, token]: [string, string]) {
  const data = await readGitHubResponse(await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  }));
  if (!Array.isArray(data)) throw new Error('GitHub returned an invalid list.');
  return data;
}

export function OnboardingWizard() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(STEPS.WELCOME);
  const [isCheckingInstallation, setIsCheckingInstallation] = useState(false);
  const [installationError, setInstallationError] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const token = currentStep === STEPS.REPOSITORIES ? accessToken : undefined;
  const organizationQuery = useSWR<GitHubOrganization[], Error>(
    token ? ['https://api.github.com/user/orgs?per_page=100', token] : null, fetchGitHubList, QUERY_OPTIONS,
  );
  const organizations = organizationQuery.data ?? [];
  const selectedOrg = organizations.find(org => org.id === selectedOrgId) ?? organizations[0] ?? null;
  const repositoryQuery = useSWR<GitHubRepository[], Error>(
    token && selectedOrg && !organizationQuery.error ? [`https://api.github.com/orgs/${encodeURIComponent(selectedOrg.login)}/repos?per_page=100`, token] : null, fetchGitHubList, QUERY_OPTIONS,
  );
  const repositories = repositoryQuery.data ?? [];
  const isLoadingOrgs = organizationQuery.isLoading;
  const isLoadingRepos = repositoryQuery.isLoading;
  const organizationError = organizationQuery.error?.message;
  const repositoryError = repositoryQuery.error?.message;

  async function checkInstallation() {
    setIsCheckingInstallation(true);
    setInstallationError(null);
    try {
      if (!accessToken) throw new Error('GitHub authorization is missing. Reconnect your GitHub account.');
      await readGitHubResponse(await fetch('/api/github/organizations/sync', { method: 'POST' }));
      const data = await readGitHubResponse(await fetch('/api/github/organizations/with-installations'));
      if (!Array.isArray(data.installations) || !data.installations.some((org: { hasAppInstalled?: boolean }) => org.hasAppInstalled === true)) {
        throw new Error('No PR Cat GitHub App installation was found for your organizations. Complete installation on GitHub, then retry.');
      }
      setCurrentStep(STEPS.REPOSITORIES);
    } catch (error) {
      setInstallationError(error instanceof Error ? error.message : 'Unable to verify the GitHub App installation.');
    } finally {
      setIsCheckingInstallation(false);
    }
  }

  const repositoryCheckIncomplete = !accessToken || isLoadingOrgs || isLoadingRepos || Boolean(organizationError || repositoryError) || repositories.length === 0;
  const error = currentStep === STEPS.GITHUB_APP ? installationError : currentStep === STEPS.REPOSITORIES ? organizationError || repositoryError || (!accessToken && 'GitHub authorization is missing. Reconnect your GitHub account.') : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">Welcome to PR Cat</CardTitle>
              <CardDescription>Check GitHub access, then configure your workspace in Settings.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} disabled={isCheckingInstallation}>Skip Setup</Button>
          </div>
        </CardHeader>
        <div className="px-6"><Progress value={currentStep / STEPS.COMPLETE * 100} className="mb-4" aria-label="Setup progress" /></div>
        <CardContent>
          {currentStep === STEPS.WELCOME && (
            <div className="space-y-4">
              <p>PR Cat helps your team understand pull request activity and improve delivery flow.</p>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                <li>Install the GitHub App and verify access.</li>
                <li>Check that your GitHub organizations and repositories are available.</li>
                <li>Save AI settings and enable repository tracking in Settings.</li>
              </ol>
            </div>
          )}
          {currentStep === STEPS.GITHUB_APP && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Install GitHub App</h3>
              <p>Install PR Cat for your organization on GitHub. After completing installation, check access below.</p>
              <InstallGitHubAppButton />
              <p className="text-sm text-muted-foreground">Opening the installation page does not confirm installation. We verify access with GitHub before continuing.</p>
            </div>
          )}
          {currentStep === STEPS.REPOSITORIES && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Check repositories</h3>
              <p className="text-sm">These repositories are visible to your GitHub account. Review app permissions and enable tracking in Settings.</p>
              {isLoadingOrgs ? <p role="status">Loading your GitHub organizations...</p> : !organizationError && organizations.length === 0 ? (
                <div className="space-y-2">
                  <p>No GitHub organizations found. Check your organization membership and GitHub permissions.</p>
                  <Button variant="outline" onClick={() => void organizationQuery.mutate()}>Retry organizations</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2" aria-label="Organizations">
                    {organizations.map(org => (
                      <Button key={org.id} variant={selectedOrg?.id === org.id ? 'default' : 'outline'} size="sm" aria-pressed={selectedOrg?.id === org.id} onClick={() => setSelectedOrgId(org.id)}>
                        <Avatar className="mr-2 h-5 w-5"><AvatarImage src={org.avatar_url} alt="" /><AvatarFallback>{org.login.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                        {org.login}
                      </Button>
                    ))}
                  </div>
                  {selectedOrg && (isLoadingRepos ? <p role="status">Loading repositories...</p> : !repositoryError && repositories.length === 0 ? (
                    <div className="space-y-2"><p>No repositories found for {selectedOrg.login}. Check GitHub permissions or choose another organization.</p><Button variant="outline" onClick={() => void repositoryQuery.mutate()}>Retry repositories</Button></div>
                  ) : !repositoryError && (
                    <ul className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-3" aria-label={`${selectedOrg.login} repositories`}>
                      {repositories.map(repo => <li key={repo.id} className="flex items-center justify-between gap-2 text-sm"><span className="break-all">{repo.name}</span>{repo.private && <span className="text-xs text-muted-foreground">Private</span>}</li>)}
                    </ul>
                  ))}
                  {repositories.length > 0 && <p className="text-xs text-muted-foreground">Showing {repositories.length} repositories (up to 100). Tracking has not been enabled by this access check.</p>}
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="mt-4 space-y-3 rounded-md border border-destructive/50 p-3">
              <p role="alert" className="text-sm text-destructive">{error}</p>
              <div className="flex flex-wrap gap-2">
                {currentStep === STEPS.REPOSITORIES && <Button variant="outline" onClick={() => organizationError ? void organizationQuery.mutate() : void repositoryQuery.mutate()}>{organizationError ? 'Retry organizations' : 'Retry repositories'}</Button>}
                <Button variant="outline" onClick={() => void signIn('github', { callbackUrl: '/onboarding' })}>Reconnect GitHub</Button>
              </div>
            </div>
          )}
          {currentStep === STEPS.COMPLETE && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" aria-hidden="true" />
              <h3 className="text-lg font-medium">GitHub access checked</h3>
              <p>Next, use Settings to enable tracking for repositories and save your AI provider, model, and API key. Those settings have not been configured by this check.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between gap-3">
          <Button variant="outline" onClick={() => setCurrentStep(step => Math.max(STEPS.WELCOME, step - 1))} disabled={currentStep === STEPS.WELCOME || isCheckingInstallation}>Back</Button>
          <Button disabled={isCheckingInstallation || (currentStep === STEPS.REPOSITORIES && repositoryCheckIncomplete)} onClick={() => {
            if (currentStep === STEPS.GITHUB_APP) void checkInstallation();
            else if (currentStep === STEPS.COMPLETE) router.push('/dashboard/settings');
            else setCurrentStep(step => step + 1);
          }}>
            {isCheckingInstallation ? 'Checking GitHub...' : currentStep === STEPS.GITHUB_APP ? installationError ? 'Retry GitHub check' : 'Check GitHub access' : currentStep === STEPS.COMPLETE ? 'Continue to Settings' : 'Continue'}
            <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
