"use client"

import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function GitHubProfileCard() {
  const { data: session, status } = useSession();

  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub Profile</CardTitle>
        <CardDescription>Your connected GitHub account</CardDescription>
      </CardHeader>
      <CardContent>
        {status === "loading" && <div className="text-muted-foreground">Loading GitHub profile...</div>}
        {status === "unauthenticated" && <div className="text-destructive">Not signed in</div>}
        {status === "authenticated" && session?.user && (
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={session.user.image || session.user.avatar_url || ""} alt={session.user.name || "User"} />
              <AvatarFallback>{session.user.name?.[0] ?? session.user.login?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <div className="font-semibold text-lg">{session.user.name || session.user.login || "User"}</div>
              {session.user.login && <div className="text-muted-foreground text-sm">@{session.user.login}</div>}
              {session.user.email && <div className="text-muted-foreground text-sm">{session.user.email}</div>}
              {session.user.html_url && (
                <a
                  href={session.user.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View on GitHub
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 