"use client";

import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaEngineering } from "@/components/chart-area-engineering"
import { DateRangePickerWithPresets } from "@/components/date-range-picker"
import { PRQualityDetails } from "@/components/pr-quality-details"
import { RepositoryFilter } from "@/components/repository-filter"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { TimeSeriesDataPoint } from "@/app/api/services/metrics-data"

export default function LifecyclePage() {
  const [selectedRepository, setSelectedRepository] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [chartData, setChartData] = useState<TimeSeriesDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch chart data based on filters
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build query parameters
        const params = new URLSearchParams();
        
        if (selectedRepository && selectedRepository !== "all") {
          params.append("repositoryId", selectedRepository);
        }
        
        if (dateRange?.from) {
          params.append("startDate", dateRange.from.toISOString());
        }
        
        if (dateRange?.to) {
          params.append("endDate", dateRange.to.toISOString());
        }
        
        const url = `/api/metrics/time-series${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch time series data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setChartData(data);
      } catch (error) {
        console.error("Failed to load chart data:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [selectedRepository, dateRange]);

  const handleRepositoryChange = (repositoryId: string) => {
    setSelectedRepository(repositoryId);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };

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
        <SiteHeader pageTitle="PR Lifecycle" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="flex justify-between items-center px-4 lg:px-6">
                <div className="flex gap-3">
                  <RepositoryFilter 
                    onRepositoryChange={handleRepositoryChange}
                    selectedRepository={selectedRepository}
                  />
                  <DateRangePickerWithPresets 
                    onDateRangeChange={handleDateRangeChange}
                    selectedRange={dateRange}
                  />
                </div>
              </div>
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
                  <ChartAreaEngineering initialChartData={chartData} />
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