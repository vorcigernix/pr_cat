"use client";

import { useState } from "react";
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
import type { MetricsSummary } from "@/app/api/services/metrics-data";

// Default fallback metrics to use when no props are provided
const defaultMetrics: MetricsSummary = {
  codingTime: { value: 4.6, change: 0, trend: "up" },
  prSize: { value: 359, change: -55, trend: "up" },
  cycleTime: { value: 77.8, change: -5.4, trend: "up" },
  reviewTime: { value: 39.1, change: -5.9, trend: "up" }
};

interface SectionCardsEngineeringProps {
  initialMetrics?: MetricsSummary; // Make this optional
}

export function SectionCardsEngineering({ initialMetrics = defaultMetrics }: SectionCardsEngineeringProps) {
  // Initialize state with server-fetched data or default values
  const [metrics, setMetrics] = useState<MetricsSummary>(initialMetrics);

  // No need for loading state or useEffect fetch anymore since data is passed as prop

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
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