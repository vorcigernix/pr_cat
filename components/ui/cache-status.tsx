"use client";

import React from "react";
import { IconClock, IconWifi, IconWifiOff } from "@tabler/icons-react";
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

  const getStatusColor = () => {
    if (error) return "text-red-500";
    if (isLoading) return "text-blue-500";
    if (!lastUpdated) return "text-gray-500";
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 5) return "text-green-500";
    if (diffInMinutes < 30) return "text-yellow-500";
    return "text-orange-500";
  };

  const getStatusIcon = () => {
    if (error) return <IconWifiOff className="h-3 w-3" />;
    if (isLoading) return <IconWifi className="h-3 w-3 animate-pulse" />;
    return <IconClock className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (error) return "Error";
    if (isLoading) return "Updating...";
    if (!lastUpdated) return "No data";
    return getTimeAgo(lastUpdated);
  };

  return (
    <Badge variant="outline" className={`${getStatusColor()} ${className}`}>
      {getStatusIcon()}
      <span className="ml-1 text-xs">{getStatusText()}</span>
    </Badge>
  );
} 