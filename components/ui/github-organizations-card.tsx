"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { IconRefresh } from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function GitHubOrganizationsCard() {
  const { data: session, status, update } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncOrganizations = async () => {
    if (!session?.accessToken) return;

    setIsSyncing(true);
    try {
      const response = await fetch("/api/github/organizations/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to sync organizations");
      }

      // Update the session to get the latest data
      await update();
    } catch (error) {
      console.error("Error syncing organizations:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (status === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub Organizations</CardTitle>
          <CardDescription>Your organizations on GitHub</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading organizations...</div>
        </CardContent>
      </Card>
    );
  }

  if (!session?.organizations || session.organizations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub Organizations</CardTitle>
          <CardDescription>Your organizations on GitHub</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-muted-foreground">No organizations found.</div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={syncOrganizations}
            disabled={isSyncing || !session?.accessToken}
          >
            {isSyncing ? "Syncing..." : "Sync Organizations"}
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
            <CardTitle>GitHub Organizations</CardTitle>
            <CardDescription>Your organizations on GitHub</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={syncOrganizations}
            disabled={isSyncing}
            className="h-8 w-8"
            title="Sync organizations"
          >
            <IconRefresh className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {session.organizations.map((org) => (
            <div key={org.github_id || org.id} className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarImage src={org.avatar_url ?? undefined} alt={org.name} />
                <AvatarFallback>{org.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{org.name}</span>
                <a
                  href={`https://github.com/orgs/${org.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  View on GitHub
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 