"use client";

import { Button } from "@/components/ui/button";
import { IconRefresh } from "@tabler/icons-react";

export function ReloadOrganizationsButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => window.location.reload()}
      title="Reload organizations"
    >
      <IconRefresh className="h-4 w-4" />
    </Button>
  );
} 