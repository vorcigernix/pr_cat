"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { IconRefresh, IconBrandGithub, IconLock, IconLockOpen } from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  is_tracked?: boolean;
}

export function GitHubRepositoriesCard({ organizationName }: { organizationName?: string }) {
  const { data: session, status } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  const fetchRepositories = useCallback(async () => {
    if (!session?.accessToken) return;

    setLoading(true);
    setError(null);
    try {
      const endpoint = organizationName 
        ? `/api/github/organizations/${organizationName}/repositories` 
        : `/api/github/repositories`;
      
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error("Failed to fetch repositories");
      }

      const data = await response.json();
      setRepositories(data.repositories);
    } catch (error) {
      console.error("Error fetching repositories:", error);
      setError("Failed to load repositories");
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, organizationName]);

  const syncRepositories = async () => {
    if (!session?.accessToken) return;

    setIsSyncing(true);
    try {
      const endpoint = organizationName 
        ? `/api/github/organizations/${organizationName}/repositories/sync` 
        : `/api/github/repositories/sync`;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to sync repositories");
      }

      // Refresh repositories list
      await fetchRepositories();
    } catch (error) {
      console.error("Error syncing repositories:", error);
      setError("Failed to sync repositories");
    } finally {
      setIsSyncing(false);
    }
  };

  // Load repositories only once on initial mount and when auth is ready
  useEffect(() => {
    // Only fetch if authenticated and not already initialized
    if (status === "authenticated" && session?.accessToken && !hasInitialized.current) {
      hasInitialized.current = true;
      fetchRepositories();
    }
  }, [status, fetchRepositories, session?.accessToken]);

  if (status === "loading" || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub Repositories</CardTitle>
          <CardDescription>
            {organizationName ? `Repositories in ${organizationName}` : 'Your repositories on GitHub'}
          </CardDescription>
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
          <CardTitle>GitHub Repositories</CardTitle>
          <CardDescription>
            {organizationName ? `Repositories in ${organizationName}` : 'Your repositories on GitHub'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-destructive">{error}</div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={fetchRepositories}
            disabled={!session?.accessToken}
          >
            Retry
            <IconRefresh className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!repositories || repositories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub Repositories</CardTitle>
          <CardDescription>
            {organizationName ? `Repositories in ${organizationName}` : 'Your repositories on GitHub'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-muted-foreground">No repositories found.</div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={syncRepositories}
            disabled={isSyncing || !session?.accessToken}
          >
            {isSyncing ? "Syncing..." : "Sync Repositories"}
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
            <CardTitle>GitHub Repositories</CardTitle>
            <CardDescription>
              {organizationName ? `Repositories in ${organizationName}` : 'Your repositories on GitHub'}
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={syncRepositories}
            disabled={isSyncing}
            className="h-8 w-8"
            title="Sync repositories"
          >
            <IconRefresh className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="private">Private</TabsTrigger>
            <TabsTrigger value="public">Public</TabsTrigger>
            {/* <TabsTrigger value="tracked">Tracked</TabsTrigger> */}
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <RepositoryList repositories={repositories} />
          </TabsContent>
          
          <TabsContent value="private" className="mt-0">
            <RepositoryList repositories={repositories.filter(repo => repo.private)} />
          </TabsContent>
          
          <TabsContent value="public" className="mt-0">
            <RepositoryList repositories={repositories.filter(repo => !repo.private)} />
          </TabsContent>
          
          {/* <TabsContent value="tracked" className="mt-0">
            <RepositoryList repositories={repositories.filter(repo => repo.is_tracked)} />
          </TabsContent> */}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function RepositoryList({ repositories }: { repositories: Repository[] }) {
  if (repositories.length === 0) {
    return <div className="text-muted-foreground">No repositories found.</div>;
  }
  
  return (
    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto">
      {repositories.map((repo) => (
        <div key={repo.id} className="flex items-center gap-3 p-2 rounded-md border">
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
            <a
              href={`https://github.com/${repo.full_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-xs"
            >
              {repo.full_name}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
} 