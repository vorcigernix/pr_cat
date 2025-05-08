"use client";

import { IconExternalLink } from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AboutGitHubOrganizationsCard() {
  const openGitHubAppSettings = () => {
    window.open("https://github.com/settings/applications", "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>About GitHub Organizations</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          If no organizations are displayed, you may not be a member of any GitHub organizations.
          You can still track personal repositories, or <a href="https://github.com/organizations/plan" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">create a free organization</a> on GitHub.
        </p>
        <Button 
          variant="outline" 
          onClick={openGitHubAppSettings}
          className="w-full"
        >
          <IconExternalLink className="mr-2 h-4 w-4" />
          Manage in GitHub Settings
        </Button>
      </CardContent>
    </Card>
  );
} 