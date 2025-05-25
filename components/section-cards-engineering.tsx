"use client";

import { useState, useEffect } from "react";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Define the metrics types
type MetricsSummary = {
  codingTime: { value: number; change: number; trend: "up" | "down" };
  prSize: { value: number; change: number; trend: "up" | "down" };
  cycleTime: { value: number; change: number; trend: "up" | "down" };
  reviewTime: { value: number; change: number; trend: "up" | "down" };
};

// API response type
type ApiSummaryResponse = {
  trackedRepositories: number;
  prsMergedThisWeek: number;
  prsMergedLastWeek: number;
  weeklyPRVolumeChange: number;
  averagePRSize: number;
  openPRCount: number;
  categorizationRate: number;
};

// Default fallback metrics to use when API data isn't available yet
const defaultMetrics: MetricsSummary = {
  codingTime: { value: 4.6, change: 0, trend: "up" },
  prSize: { value: 359, change: -55, trend: "up" },
  cycleTime: { value: 77.8, change: -5.4, trend: "up" },
  reviewTime: { value: 39.1, change: -5.9, trend: "up" }
};

// Helper function to transform API data to metrics format
const transformApiDataToMetrics = (data: ApiSummaryResponse): MetricsSummary => {
  const weeklyPRChange = data.prsMergedLastWeek > 0 
    ? ((data.prsMergedThisWeek - data.prsMergedLastWeek) / data.prsMergedLastWeek) * 100
    : 0;

  return {
    // Estimate coding time based on average PR size
    codingTime: { 
      value: parseFloat((data.averagePRSize / 100).toFixed(1)), 
      change: 0, // We don't have historical data yet
      trend: "up" 
    },
    // Average PR size from the API
    prSize: {
      value: data.averagePRSize,
      change: 0, // We don't have historical data yet
      trend: "up" // Lower is better for PR size
    },
    // Cycle time - we'll use a placeholder since we don't have real cycle time in the API yet
    cycleTime: {
      value: 48, // Placeholder value
      change: weeklyPRChange > 0 ? -5 : 5, // If PR volume is up, cycle time is down (estimate)
      trend: weeklyPRChange > 0 ? "up" : "down"
    },
    // Review time - placeholder based on categorization rate
    reviewTime: {
      value: 24, // Placeholder value
      change: data.categorizationRate > 75 ? -3 : 3, // High categorization = faster reviews (estimate)
      trend: data.categorizationRate > 75 ? "up" : "down"
    }
  };
};

export function SectionCardsEngineering() {
  const [metrics, setMetrics] = useState<MetricsSummary>(defaultMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch real metrics data from our API
        const response = await fetch('/api/metrics/summary');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.status} ${response.statusText}`);
        }
        
        const data: ApiSummaryResponse = await response.json();
        
        // Transform API data to our metrics format using the helper function
        setMetrics(transformApiDataToMetrics(data));
      } catch (error) {
        console.error("Failed to load metrics:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  // Show loading placeholder when data is being fetched
  if (loading) {
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

  // Show error state
  if (error) {
    return (
      <div className="px-4 lg:px-6">
        <Card className="p-4">
          <CardTitle className="mb-2">Error Loading Metrics</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Flow State Time</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {metrics.codingTime.value} hrs
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={metrics.codingTime.trend === 'up' ? 'text-green-500' : 'text-amber-500'}>
              {metrics.codingTime.trend === 'up' ? <IconTrendingUp /> : <IconTrendingDown />}
              {metrics.codingTime.change > 0 ? '+' : ''}{metrics.codingTime.change} hrs
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {metrics.codingTime.trend === 'up' ? 'More focus time unlocked' : 'Less flow state time'}
          </div>
          <div className="text-muted-foreground">
            Daily average per team member
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>PR Size</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {metrics.prSize.value} LOC
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={metrics.prSize.trend === 'up' ? 'text-green-500' : 'text-amber-500'}>
              {metrics.prSize.trend === 'up' ? <IconTrendingUp /> : <IconTrendingDown />}
              {metrics.prSize.change > 0 ? '+' : ''}{Math.abs(metrics.prSize.change)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {metrics.prSize.trend === 'up' ? 'More focused, digestible PRs' : 'PRs are getting larger'}
          </div>
          <div className="text-muted-foreground">
            Avg. lines of code per contribution
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Delivery Speed</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {metrics.cycleTime.value} hrs
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={metrics.cycleTime.trend === 'up' ? 'text-green-500' : 'text-amber-500'}>
              {metrics.cycleTime.trend === 'up' ? <IconTrendingUp /> : <IconTrendingDown />}
              {metrics.cycleTime.change > 0 ? '+' : ''}{metrics.cycleTime.change} hrs
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {metrics.cycleTime.trend === 'up' ? 'Team is shipping faster' : 'Delivery cycle slowing down'}
          </div>
          <div className="text-muted-foreground">
            From first commit to production
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Feedback Speed</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {metrics.reviewTime.value} hrs
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={metrics.reviewTime.trend === 'up' ? 'text-green-500' : 'text-amber-500'}>
              {metrics.reviewTime.trend === 'up' ? <IconTrendingUp /> : <IconTrendingDown />}
              {metrics.reviewTime.change > 0 ? '+' : ''}{metrics.reviewTime.change} hrs
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {metrics.reviewTime.trend === 'up' ? 'Faster team feedback' : 'Feedback loop slowing'}
          </div>
          <div className="text-muted-foreground">
            How quickly the team reviews code
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 