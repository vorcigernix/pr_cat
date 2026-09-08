"use client";

import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaEngineering } from "@/components/chart-area-engineering"
import { PRQualityDetails } from "@/components/pr-quality-details"
import { DashboardHeader } from "@/components/dashboard-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useDashboardQuery } from "@/hooks/use-metrics"
import { TimeSeriesDataPoint } from "@/lib/core"

export default function LifecyclePage() {
  const { data: chartData = [], isLoading: loading, error: requestError } = useDashboardQuery<TimeSeriesDataPoint[]>('/api/metrics/time-series');
  const error = requestError?.message;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <DashboardHeader pageTitle="PR Lifecycle" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {loading ? (
                  <div className="h-[400px] w-full animate-pulse bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Loading chart data...</p>
                  </div>
                ) : error ? (
                  <div className="h-[400px] w-full border border-destructive rounded-lg flex items-center justify-center">
                    <p className="text-destructive">Error loading chart: {error}</p>
                  </div>
                ) : (
                  <ChartAreaEngineering chartData={chartData} />
                )}
              </div>
              <PRQualityDetails />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
