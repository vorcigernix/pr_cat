"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { IconRefresh, IconBrandGithub, IconLock, IconLockOpen, IconWebhook, IconCheck, IconX } from "@tabler/icons-react";

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

export function GitHubOrganizationRepositories() {
  const { data: session, status } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const [organizationsWithRepos, setOrganizationsWithRepos] = useState<OrganizationWithRepositories[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRepoId, setProcessingRepoId] = useState<number | null>(null);
  const hasInitialized = useRef(false);

  const fetchOrganizationsWithRepositories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/github/organizations/repositories");
      if (!response.ok) {
        throw new Error("Failed to fetch organization repositories");
      }
      const data = await response.json();
      setOrganizationsWithRepos(data.organizationsWithRepositories || []);
    } catch (error) {
      setError("Failed to load organization repositories");
    } finally {
      setLoading(false);
    }
  }, []);

  const syncRepositories = async () => {
    setIsSyncing(true);
    toast.info("Syncing repositories from GitHub...");
    try {
      const response = await fetch("/api/github/organizations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Failed to sync organizations and repositories");
      }
      toast.success("Repositories synced successfully!");
      await fetchOrganizationsWithRepositories();
    } catch (error) {
      setError("Failed to sync repositories");
      toast.error("Failed to sync repositories");
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleWebhook = async (repository: Repository) => {
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
      setOrganizationsWithRepos((prev) =>
        prev.map((org) => ({
          ...org,
          repositories: org.repositories.map((repo) =>
            repo.id === repository.id ? { ...repo, is_tracked: newState } : repo
          ),
        }))
      );
      toast.success(`Webhook ${newState ? "enabled" : "disabled"} for ${repository.name}`);
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : "Failed to update webhook"}`);
    } finally {
      setProcessingRepoId(null);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && !hasInitialized.current) {
      hasInitialized.current = true;
      fetchOrganizationsWithRepositories();
    }
  }, [status, fetchOrganizationsWithRepositories]);

  if (status === "loading" || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Repositories</CardTitle>
          <CardDescription>Your GitHub organization repositories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading repositories...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Repositories</CardTitle>
          <CardDescription>Your GitHub organization repositories</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-destructive">{error}</div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full" onClick={fetchOrganizationsWithRepositories}>
            Retry
            <IconRefresh className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!organizationsWithRepos || organizationsWithRepos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Repositories</CardTitle>
          <CardDescription>Your GitHub organization repositories</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-muted-foreground mb-4">
            No organization repositories found. Add PR Cat to your GitHub organizations to see repositories here.
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Personal repositories are not supported. PR Cat requires organization repositories to function.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full" onClick={syncRepositories} disabled={isSyncing}>
            {isSyncing ? "Syncing..." : "Sync GitHub Organizations"}
            {!isSyncing && <IconRefresh className="ml-2 h-4 w-4" />}
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
            <CardTitle>Organization Repositories</CardTitle>
            <CardDescription>Configure webhooks for your GitHub organization repositories</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={syncRepositories} disabled={isSyncing} className="h-8 w-8" title="Sync repositories">
            <IconRefresh className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-muted rounded-md">
          <p className="text-sm">
            <strong>Webhooks:</strong> Enable webhooks for repositories you want PR Cat to track. This allows PR Cat to receive real-time notifications when pull requests are created, updated, or reviewed.
          </p>
        </div>
        <Accordion type="multiple" className="w-full">
          {organizationsWithRepos.map((orgWithRepos) => (
            <AccordionItem key={orgWithRepos.organization.id} value={orgWithRepos.organization.id.toString()}>
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  {orgWithRepos.organization.name}
                  <Badge variant="outline" className="ml-2">
                    {orgWithRepos.repositories.length} repos
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3 py-2">
                  {orgWithRepos.repositories.length === 0 ? (
                    <div className="text-muted-foreground text-sm">No repositories found in this organization.</div>
                  ) : (
                    orgWithRepos.repositories.map((repo) => (
                      <div key={repo.id} className="flex items-center justify-between gap-3 p-3 rounded-md border">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <IconBrandGithub className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">{repo.name}</h4>
                              {repo.private ? (
                                <Badge variant="outline" className="ml-1">
                                  <IconLock className="h-3 w-3 mr-1" />
                                  Private
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="ml-1">
                                  <IconLockOpen className="h-3 w-3 mr-1" />
                                  Public
                                </Badge>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-muted-foreground text-sm truncate">{repo.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {repo.is_tracked ? (
                            <Badge variant="outline" className="flex items-center gap-1 mr-2 bg-green-100 text-green-800 border-green-200">
                              <IconCheck className="h-3 w-3" />
                              Tracking
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1 mr-2">
                              <IconX className="h-3 w-3" />
                              Not Tracked
                            </Badge>
                          )}
                          <Button variant={repo.is_tracked ? "destructive" : "default"} size="sm" onClick={() => toggleWebhook(repo)} disabled={processingRepoId === repo.id} className="min-w-[90px]">
                            {processingRepoId === repo.id ? (
                              <IconRefresh className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <IconWebhook className="h-4 w-4 mr-2" />
                                {repo.is_tracked ? "Disable" : "Enable"}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
} 