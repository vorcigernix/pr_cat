"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { IconRefresh, IconBrandGithub, IconLock, IconLockOpen, IconWebhook, IconCheck, IconX, IconAlertTriangle } from "@tabler/icons-react";

interface Repository {
  id: number;
  github_id: number;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  is_tracked: boolean;
  organization_id: number;
}

interface Organization {
  id: number;
  name: string;
  avatar_url?: string;
}

interface OrganizationWithRepositories {
  organization: Organization;
  repositories: Repository[];
}

interface GitHubOrganizationRepositoriesProps {
  organizationId: number;
  organizationName: string;
}

export function GitHubOrganizationRepositories({
  organizationId,
  organizationName,
}: GitHubOrganizationRepositoriesProps) {
  const { data: session, status } = useSession();
  const [isSyncingSpecific, setIsSyncingSpecific] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRepoId, setProcessingRepoId] = useState<number | null>(null);
  const [accessibleRepos, setAccessibleRepos] = useState<Set<string>>(new Set());
  const [isLoadingAccessible, setIsLoadingAccessible] = useState(false);

  const fetchRepositoriesForOrganization = useCallback(async (isInitialLoad = false) => {
    if (!organizationId) {
      setRepositories([]);
      setLoading(false);
      return;
    }
    console.log(`Fetching repositories for orgId: ${organizationId}, orgName: ${organizationName}, initial: ${isInitialLoad}`);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/github/organizations/repositories?orgId=${organizationId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch repositories for " + organizationName }));
        throw new Error(errorData.message || `Failed to fetch repositories for ${organizationName}`);
      }
      const data = await response.json();
      if (data.repositories) {
        setRepositories(data.repositories);
      } else if (data.organizationsWithRepositories && data.organizationsWithRepositories.length > 0) {
        const orgData = data.organizationsWithRepositories.find((o: any) => o.organization.id === organizationId || o.organization.name === organizationName);
        setRepositories(orgData ? orgData.repositories : []);
      } else {
        setRepositories([]);
      }
    } catch (fetchError) {
      const defaultMessage = `Failed to load repositories for ${organizationName}. Please try syncing manually.`;
      if (fetchError instanceof Error && fetchError.message.includes("Failed to fetch")) {
         setError(defaultMessage);
      } else {
        setError(fetchError instanceof Error ? fetchError.message : "An unexpected error occurred.");
      }
      console.error(`Error fetching repositories for ${organizationName}:`, fetchError);
    } finally {
      setLoading(false);
    }
  }, [organizationId, organizationName]);

  const fetchAccessibleRepositories = useCallback(async () => {
    if (!organizationName) return;
    
    setIsLoadingAccessible(true);
    try {
      const response = await fetch(`/api/github/organizations/${organizationName}/accessible-repositories`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch accessible repositories');
      }
      
      const data = await response.json();
      if (data.accessibleRepositories) {
        setAccessibleRepos(new Set(data.accessibleRepositories));
      }
    } catch (error) {
      console.error('Error fetching accessible repositories:', error);
    } finally {
      setIsLoadingAccessible(false);
    }
  }, [organizationName]);

  const syncSpecificOrganizationRepositories = async () => {
    setIsSyncingSpecific(true);
    setLoading(true);
    setError(null);
    toast.info(`Syncing repositories for ${organizationName} from GitHub...`);
    try {
      const response = await fetch(`/api/github/organizations/${organizationName}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to sync ${organizationName}`);
      }
      toast.success(`Sync complete for ${organizationName}! Fetching updated data...`);
      await fetchRepositoriesForOrganization(false);
      // After syncing repos, refresh the accessibility data
      await fetchAccessibleRepositories();
    } catch (syncError) {
      const errorMessage = syncError instanceof Error ? syncError.message : `Failed to sync ${organizationName}`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSyncingSpecific(false);
      setLoading(false);
    }
  };

  const toggleWebhook = async (repository: Repository) => {
    if (!accessibleRepos.has(repository.full_name)) {
      toast.error(`Repository ${repository.name} is not accessible. Update GitHub App permissions to enable webhooks.`);
      return;
    }
    
    setProcessingRepoId(repository.id);
    try {
      const newState = !repository.is_tracked;
      const response = await fetch(`/api/github/repositories/${repository.github_id}/webhook`, {
        method: newState ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${newState ? "enable" : "disable"} webhook`);
      }
      setRepositories((prevRepos) =>
        prevRepos.map((repo) =>
            repo.id === repository.id ? { ...repo, is_tracked: newState } : repo
        )
      );
      toast.success(`Webhook ${newState ? "enabled" : "disabled"} for ${repository.name}`);
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : "Failed to update webhook"}`);
    } finally {
      setProcessingRepoId(null);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && organizationId && organizationName) {
      fetchRepositoriesForOrganization(true);
      fetchAccessibleRepositories();
    }
  }, [status, organizationId, organizationName, fetchRepositoriesForOrganization, fetchAccessibleRepositories]);

  if (status === "loading" || (loading && !isSyncingSpecific)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repositories for {organizationName}</CardTitle>
          <CardDescription>Loading repositories...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <IconRefresh className="h-6 w-6 text-muted-foreground animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repositories for {organizationName}</CardTitle>
          <CardDescription className="text-destructive">Error loading repositories</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-destructive">{error}</div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full" onClick={() => fetchRepositoriesForOrganization(false)}>
            Retry Fetch
            <IconRefresh className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Repositories for {organizationName}</CardTitle>
            <CardDescription>Configure webhooks for repositories in {organizationName}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={syncSpecificOrganizationRepositories} disabled={isSyncingSpecific} title={`Sync repositories for ${organizationName}`}>
            <IconRefresh className={`h-4 w-4 mr-2 ${isSyncingSpecific ? "animate-spin" : ""}`} />
            Sync Repos
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {repositories.length > 0 && repositories.some(repo => !accessibleRepos.has(repo.full_name)) && (
          <div className="text-sm bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md mb-4 border border-amber-200 dark:border-amber-800 text-foreground">
            <div className="flex items-center mb-1">
              <IconAlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2" /> 
              <span className="font-medium text-amber-900 dark:text-amber-100">Some repositories are not accessible</span>
            </div>
            <p className="text-foreground">You've approved PR Cat for only selected repositories. Repositories marked "No Access" need additional permissions.</p>
            <a 
              href={`https://github.com/apps/pr-cat/installations/new/permissions?target_id=${organizationId}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline mt-2 inline-block"
            >
              Configure PR Cat Repository Access
            </a>
          </div>
        )}
        
        {repositories.length === 0 ? (
            <div className="text-muted-foreground mb-4 p-4 border border-dashed rounded-md">
                No repositories found for {organizationName}. Try syncing or ensure repositories exist in this organization on GitHub.
            </div>
        ) : (
            <div className="space-y-3">
            {repositories.map((repo) => {
                const isAccessible = accessibleRepos.has(repo.full_name);
                
                return (
                <div key={repo.id} className="flex items-center justify-between gap-3 p-3 rounded-md border hover:shadow-sm">
                <div className="flex items-center gap-3 grow min-w-0">
                      <IconBrandGithub className="h-5 w-5" />
                      <div className="truncate">
                        <span className="font-medium">{repo.name}</span>
                        {!isAccessible && (
                          <Badge variant="secondary" className="ml-2">
                            No Access
                        </Badge>
                        )}
                        <p className="text-sm text-muted-foreground truncate">{repo.description || "No description"}</p>
                    </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={repo.private ? "default" : "secondary"} className="hidden md:flex">
                        {repo.private ? <><IconLock className="h-3 w-3 mr-1" /> Private</> : <><IconLockOpen className="h-3 w-3 mr-1" /> Public</>}
                      </Badge>
                      
                <Button 
                        variant="ghost"
                    size="sm" 
                        disabled={processingRepoId === repo.id || !isAccessible}
                    onClick={() => toggleWebhook(repo)}
                        className={`${repo.is_tracked ? "text-primary" : "text-muted-foreground"} ${!isAccessible ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                    {processingRepoId === repo.id ? (
                    <IconRefresh className="h-4 w-4 animate-spin" />
                    ) : repo.is_tracked ? (
                          <><IconCheck className="h-4 w-4 mr-2" /> Disable</>
                    ) : (
                          <>{isAccessible ? <><IconWebhook className="h-4 w-4 mr-2" /> Enable</> : <><IconX className="h-4 w-4 mr-2" /> No Access</>}</>
                    )}
                </Button>
                </div>
                  </div>
                );
              })}
            </div>
        )}
      </CardContent>
    </Card>
  );
} 