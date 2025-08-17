"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { IconClock, IconRefresh, IconCheck, IconAlertCircle } from "@tabler/icons-react";

interface CacheStatusProps {
  isLoading?: boolean;
  error?: Error | null;
  lastUpdated?: Date;
  dataDate?: string;
  cacheStrategy?: string;
  isComplete?: boolean;
  nextUpdate?: string;
}

export function CacheStatus({ 
  isLoading, 
  error, 
  lastUpdated, 
  dataDate,
  cacheStrategy = 'daily-complete-data',
  isComplete = true,
  nextUpdate
}: CacheStatusProps) {
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getDataDateInfo = () => {
    if (!dataDate) return null;
    
    const date = new Date(dataDate);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if data is from yesterday (complete) or today (incomplete)
    if (date.toDateString() === yesterday.toDateString()) {
      return {
        text: `Data through ${formatDate(date)}`,
        variant: 'default' as const,
        icon: <IconCheck className="w-3 h-3" />
      };
    } else if (date.toDateString() === today.toDateString()) {
      return {
        text: `Incomplete data (${formatDate(date)})`,
        variant: 'secondary' as const,
        icon: <IconAlertCircle className="w-3 h-3" />
      };
    } else {
      return {
        text: `Data from ${formatDate(date)}`,
        variant: 'outline' as const,
        icon: <IconClock className="w-3 h-3" />
      };
    }
  };

  const getNextUpdateInfo = () => {
    if (!nextUpdate) return null;
    
    const nextDate = new Date(nextUpdate);
    const now = new Date();
    const hoursUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursUntil <= 0) {
      return 'Update available';
    } else if (hoursUntil < 24) {
      return `Next update in ${hoursUntil}h`;
    } else {
      return `Next update ${formatDate(nextDate)}`;
    }
  };

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
        <span className="text-gray-400">Data unavailable</span>
        <Badge variant="outline" className="text-xs border-amber-400/30 text-amber-400">
          Loading issue
        </Badge>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <IconRefresh className="w-4 h-4 animate-spin" />
        <span>Loading metrics...</span>
        <Badge variant="outline" className="text-xs">
          Loading
        </Badge>
      </div>
    );
  }

  const dataInfo = getDataDateInfo();
  const nextUpdateText = getNextUpdateInfo();

  return (
    <div className="flex items-center space-x-3 text-sm">
      {/* Data date status */}
      {dataInfo && (
        <div className="flex items-center space-x-1">
          {dataInfo.icon}
          <span className="text-muted-foreground">{dataInfo.text}</span>
        </div>
      )}

      {/* Last updated */}
      {lastUpdated && (
        <div className="flex items-center space-x-1 text-muted-foreground">
          <IconClock className="w-3 h-3" />
          <span>Updated {formatTime(lastUpdated)}</span>
        </div>
      )}

      {/* Cache strategy badge */}
      <Badge variant="outline" className="text-xs">
        {cacheStrategy === 'daily-complete-data' ? 'Daily Cache' : 'Cached'}
      </Badge>

      {/* Next update info */}
      {nextUpdateText && (
        <span className="text-xs text-muted-foreground">
          {nextUpdateText}
        </span>
      )}

      {/* Data completeness indicator */}
      {!isComplete && (
        <Badge variant="secondary" className="text-xs">
          <IconAlertCircle className="w-3 h-3 mr-1" />
          Incomplete
        </Badge>
      )}
    </div>
  );
} 