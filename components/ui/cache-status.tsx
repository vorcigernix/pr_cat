"use client";

import React from "react";
import { IconClock, IconWifi, IconWifiOff, IconLoader } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";

interface CacheStatusProps {
  isLoading?: boolean;
  error?: Error | null;
  lastUpdated?: Date;
  className?: string;
}

export function CacheStatus({ isLoading, error, lastUpdated, className }: CacheStatusProps) {
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getStatusInfo = () => {
    if (isLoading) {
      return {
        text: "Loading...",
        variant: "secondary" as const,
        icon: <IconLoader className="h-3 w-3 animate-spin" />,
      };
    }

    if (error) {
      return {
        text: "Error",
        variant: "destructive" as const,
        icon: <IconWifiOff className="h-3 w-3" />,
      };
    }

    if (lastUpdated) {
      const timeAgo = getTimeAgo(lastUpdated);
      const isStale = new Date().getTime() - lastUpdated.getTime() > 30 * 60 * 1000; // 30 minutes
      
      return {
        text: `Updated ${timeAgo}`,
        variant: isStale ? ("outline" as const) : ("default" as const),
        icon: <IconClock className="h-3 w-3" />,
      };
    }

    return {
      text: "Ready",
      variant: "outline" as const,
      icon: <IconWifi className="h-3 w-3" />,
    };
  };

  const status = getStatusInfo();

  return (
    <Badge variant={status.variant} className={`flex items-center gap-1 ${className}`}>
      {status.icon}
      <span className="text-xs">{status.text}</span>
    </Badge>
  );
} 