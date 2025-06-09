"use client";

import React from "react";
import { IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { mutate } from "swr";

interface RefreshButtonProps {
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function RefreshButton({ variant = "outline", size = "sm", className }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all metrics-related SWR cache keys
      await mutate(
        key => typeof key === 'string' && key.startsWith('/api/metrics'),
        undefined,
        { revalidate: true }
      );
    } catch (error) {
      console.error("Failed to refresh metrics:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={className}
    >
      <IconRefresh className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {size !== "icon" && (
        <span className="ml-2">
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </span>
      )}
    </Button>
  );
} 