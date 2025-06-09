"use client";

import React from "react";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMetricsSummary } from "@/hooks/use-metrics";

// Types
type MetricsSummary = {
  codingTime: { value: number; change: number; trend: "up" | "down" };
  prSize: { value: number; change: number; trend: "up" | "down" };
  cycleTime: { value: number; change: number; trend: "up" | "down" };
  reviewTime: { value: number; change: number; trend: "up" | "down" };
};

type ApiSummaryResponse = {
  trackedRepositories: number;
  prsMergedThisWeek: number;
  prsMergedLastWeek: number;
  weeklyPRVolumeChange: number;
  averagePRSize: number;
  openPRCount: number;
  categorizationRate: number;
};

// Cached data type (extends the API response with cache metadata)
type CachedSummaryData = ApiSummaryResponse & {
  dataUpToDate?: string;
  lastUpdated?: string;
  cacheStrategy?: string;
  nextUpdateDue?: string;
  _fetchedAt?: string;
  _cacheHeaders?: {
    etag?: string | null;
    cacheControl?: string | null;
    dataDate?: string | null;
    cacheStrategy?: string | null;
  };
};

// Metric configuration for cleaner code
const METRICS_CONFIG = [
  {
    key: 'codingTime' as const,
    title: 'Flow State Time',
    description: 'Daily average per team member',
    unit: 'hrs',
    trendMessage: (trend: string) => trend === 'up' ? 'More focus time unlocked' : 'Less flow state time'
  },
  {
    key: 'prSize' as const,
    title: 'PR Size',
    description: 'Avg. lines of code per contribution',
    unit: 'LOC',
    trendMessage: (trend: string) => trend === 'up' ? 'More focused, digestible PRs' : 'PRs are getting larger'
  },
  {
    key: 'cycleTime' as const,
    title: 'Delivery Speed',
    description: 'From first commit to production',
    unit: 'hrs',
    trendMessage: (trend: string) => trend === 'up' ? 'Team is shipping faster' : 'Delivery cycle slowing down'
  },
  {
    key: 'reviewTime' as const,
    title: 'Feedback Speed',
    description: 'Time to first meaningful review',
    unit: 'hrs',
    trendMessage: (trend: string) => trend === 'up' ? 'Faster team feedback' : 'Feedback loop slowing'
  }
];

// Default metrics
const DEFAULT_METRICS: MetricsSummary = {
  codingTime: { value: 4.6, change: 0, trend: "up" },
  prSize: { value: 359, change: -55, trend: "up" },
  cycleTime: { value: 77.8, change: -5.4, trend: "up" },
  reviewTime: { value: 39.1, change: -5.9, trend: "up" }
};

// Transform API data to metrics format
const transformApiDataToMetrics = (data: CachedSummaryData): MetricsSummary => {
  const weeklyPRChange = data.prsMergedLastWeek > 0 
    ? ((data.prsMergedThisWeek - data.prsMergedLastWeek) / data.prsMergedLastWeek) * 100
    : 0;

  return {
    codingTime: { 
      value: parseFloat((data.averagePRSize / 100).toFixed(1)), 
      change: 0,
      trend: "up" 
    },
    prSize: {
      value: data.averagePRSize,
      change: 0,
      trend: "up"
    },
    cycleTime: {
      value: 48,
      change: weeklyPRChange > 0 ? -5 : 5,
      trend: weeklyPRChange > 0 ? "up" : "down"
    },
    reviewTime: {
      value: 24,
      change: data.categorizationRate > 75 ? -3 : 3,
      trend: data.categorizationRate > 75 ? "up" : "down"
    }
  };
};

// Reusable metric card component
function MetricCard({ config, metric }: { 
  config: typeof METRICS_CONFIG[0]; 
  metric: { value: number; change: number; trend: "up" | "down" } 
}) {
  const isPositiveTrend = metric.trend === 'up';
  const changeValue = config.key === 'prSize' ? Math.abs(metric.change) : metric.change;
  const changePrefix = metric.change > 0 ? '+' : '';

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{config.title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {metric.value} {config.unit}
        </CardTitle>
        <CardAction>
          <Badge variant="outline" className={isPositiveTrend ? 'text-green-500' : 'text-amber-500'}>
            {isPositiveTrend ? <IconTrendingUp /> : <IconTrendingDown />}
            {changePrefix}{changeValue}{config.key === 'prSize' ? '' : ` ${config.unit}`}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {config.trendMessage(metric.trend)}
        </div>
        <div className="text-muted-foreground">
          {config.description}
        </div>
      </CardFooter>
    </Card>
  );
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {Array(4).fill(0).map((_, i) => (
        <Card key={i} className="@container/card">
          <CardHeader>
            <CardDescription>Loading...</CardDescription>
            <div className="h-8 w-24 animate-pulse bg-muted rounded mt-1"></div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="h-4 w-32 animate-pulse bg-muted rounded"></div>
            <div className="h-4 w-48 animate-pulse bg-muted rounded"></div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// Error component
function ErrorCard({ error, refresh }: { error: Error; refresh: () => void }) {
  return (
    <div className="px-4 lg:px-6">
      <Card className="p-4">
        <CardTitle className="mb-2">Error Loading Metrics</CardTitle>
        <CardDescription className="text-red-500">{error.message}</CardDescription>
        <button 
          onClick={refresh} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </Card>
    </div>
  );
}

export function SectionCardsEngineering() {
  const { data, isLoading, error, refresh } = useMetricsSummary();
  
  const metrics = data ? transformApiDataToMetrics(data as CachedSummaryData) : DEFAULT_METRICS;

  if (isLoading && !data) return <LoadingSkeleton />;
  if (error && !data) return <ErrorCard error={error} refresh={refresh} />;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {METRICS_CONFIG.map((config) => (
        <MetricCard
          key={config.key}
          config={config}
          metric={metrics[config.key]}
        />
      ))}
    </div>
  );
} 