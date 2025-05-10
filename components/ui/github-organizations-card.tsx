"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { IconRefresh } from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface GitHubOrg {
  id: number;
  login: string;
  avatar_url: string;
}

interface SyncedOrg {
  id: number;
  github_id: number;
  name: string;
  avatar_url: string | null;
}

export function GitHubOrganizationsCard() {
  const { data: session, status, update } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedOrgs, setSyncedOrgs] = useState<SyncedOrg[]>([]);
  const [showSyncedOrgs, setShowSyncedOrgs] = useState(false);

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

      // Get the response data
      const data = await response.json();
      console.log("Organizations sync response:", data);

      if (data.organizations && data.organizations.length > 0) {
        // Store synced orgs locally for display
        setSyncedOrgs(data.organizations.map((org: GitHubOrg) => ({
          id: 0, // temporary ID until we get it from next request
          github_id: org.id,
          name: org.login,
          avatar_url: org.avatar_url,
        })));
        setShowSyncedOrgs(true);
        
        // This updates the session using next-auth's useSession update function
        await update({
          ...session,
          organizations: data.organizations.map((org: GitHubOrg) => ({
            id: 0, // temporary ID until we get it from next request
            github_id: org.id,
            name: org.login,
            avatar_url: org.avatar_url,
          })),
        });
      } else {
        // No organizations found
        setSyncedOrgs([]);
        setShowSyncedOrgs(true);
      }
    } catch (error) {
      console.error("Error syncing organizations:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (status === "loading") {
    return (

          <div className="text-muted-foreground">Loading organizations...</div>

    );
  }

  // If we have synced orgs to display, show them instead of the empty state
  if (showSyncedOrgs && syncedOrgs.length > 0) {
    return (
  
          <div className="flex flex-col gap-3">
            {syncedOrgs.map((org) => (
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
       
    );
  }

  if (!session?.organizations || session.organizations.length === 0) {
    return (

          <div className="text-muted-foreground">
            {showSyncedOrgs 
              ? "No organizations found in your GitHub account." 
              : "No organizations found."}
          </div>

    );
  }

  return (


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
 
  );
} 