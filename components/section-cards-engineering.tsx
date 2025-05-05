"use client";

import { useEffect, useState } from "react";
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

type MetricsSummary = {
  codingTime: {
    value: number;
    change: number;
    trend: string;
  };
  prSize: {
    value: number;
    change: number;
    trend: string;
  };
  cycleTime: {
    value: number;
    change: number;
    trend: string;
  };
  reviewTime: {
    value: number;
    change: number;
    trend: string;
  };
};

export function SectionCardsEngineering() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // In a real app, this would be an API call
        const data = await import("@/app/dashboard/metrics-summary.json");
        setMetrics(data.default as MetricsSummary);
      } catch (error) {
        console.error("Failed to load metrics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="@container/card animate-pulse">
            <CardHeader>
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="h-8 w-16 bg-muted rounded mt-2"></div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5">
              <div className="h-4 w-32 bg-muted rounded"></div>
              <div className="h-4 w-40 bg-muted rounded"></div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Coding Time</CardDescription>
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
            {metrics.codingTime.trend === 'up' ? 'Increased focused time' : 'Less coding time'}
          </div>
          <div className="text-muted-foreground">
            Daily average per developer
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
            {metrics.prSize.trend === 'up' ? 'Smaller PRs' : 'PRs are getting larger'}
          </div>
          <div className="text-muted-foreground">
            Avg. lines of code per PR
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Cycle Time</CardDescription>
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
            {metrics.cycleTime.trend === 'up' ? 'Faster delivery' : 'Slower delivery cycle'}
          </div>
          <div className="text-muted-foreground">
            From first commit to production
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Review Time</CardDescription>
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
            {metrics.reviewTime.trend === 'up' ? 'Faster reviews' : 'Reviews taking longer'}
          </div>
          <div className="text-muted-foreground">
            Average PR review completion time
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 