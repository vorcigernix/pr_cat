"use client";

import React from "react";
import { RefreshButton } from "@/components/ui/refresh-button";
import { CacheStatus } from "@/components/ui/cache-status";
import { useMetricsSummary } from "@/hooks/use-metrics";

export function DashboardControls() {
  const { data, error, isLoading, isDataComplete, cacheInfo } = useMetricsSummary();

  return (
    <div className="flex items-center justify-between my-4">
      <div className="flex items-center space-x-4">
        <CacheStatus 
          isLoading={isLoading}
          error={error}
          lastUpdated={data?.lastUpdated ? new Date(data.lastUpdated) : undefined}
          dataDate={data?.dataUpToDate}
          cacheStrategy={data?.cacheStrategy}
          isComplete={isDataComplete}
          nextUpdate={data?.nextUpdateDue}
        />
      </div>
      <div className="flex items-center space-x-2">
        <RefreshButton />
      </div>
    </div>
  );
} 