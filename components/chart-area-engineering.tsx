"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart"
import type { TimeSeriesDataPoint } from "@/lib/core"

export function ChartAreaEngineering({ chartData }: { chartData: TimeSeriesDataPoint[] }) {
  const isMobile = useIsMobile()
  const [selectedMetrics, setSelectedMetrics] = React.useState<string[] | null>(null)
  const metrics = selectedMetrics ?? (isMobile ? ["prThroughput", "cycleTime"] : ["prThroughput", "cycleTime", "codingHours"])

  const filteredData = React.useMemo(() => [...chartData].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  ), [chartData]);

  const chartConfig = {
    prThroughput: {
      label: "Shipping Velocity",
      color: "var(--chart-1)",
    },
    cycleTime: {
      label: "Delivery Speed (hrs)",
      color: "var(--chart-2)",
    },
    reviewTime: {
      label: "Estimated review time (hrs)",
      color: "var(--chart-3)",
    },
    codingHours: {
      label: "Estimated coding hours",
      color: "var(--chart-4)",
    },
  } as ChartConfig;

  const handleMetricToggle = (value: string) => {
    if (metrics.includes(value)) {
      if (metrics.length > 1) {
        setSelectedMetrics(metrics.filter(m => m !== value));
      }
    } else {
      setSelectedMetrics([...metrics, value]);
    }
  };

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Team Flow Metrics</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            PRs and cycle time for the selected period. Estimates use 30% of cycle time for review and one coding hour per 50 changed lines.
          </span>
          <span className="@[540px]/card:hidden">Team flow trends</span>
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <div className="hidden lg:flex gap-2">
            {Object.entries(chartConfig).map(([key, config]) => (
              <button 
                key={key}
                onClick={() => handleMetricToggle(key)}
                aria-pressed={metrics.includes(key)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  metrics.includes(key) 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-transparent text-muted-foreground hover:bg-muted'
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <AreaChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              {Object.entries(chartConfig).map(([key, config]) => (
                <linearGradient key={key} id={`fill${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis axisLine={false} tickLine={false} tickMargin={8} />
            <Tooltip 
              formatter={(value, name) => {
                // Format the tooltip value based on the metric
                if (name === "Delivery Speed (hrs)" || name === "Estimated review time (hrs)" || name === "Estimated coding hours") {
                  return [`${value} hrs`, name];
                }
                return [value, name];
              }} 
            />
            <Legend />
            
            {metrics.includes("prThroughput") && (
              <Area
                type="monotone"
                dataKey="prThroughput"
                name="Shipping Velocity"
                stroke={chartConfig.prThroughput.color}
                fillOpacity={1}
                fill={`url(#fillprThroughput)`}
              />
            )}
            
            {metrics.includes("cycleTime") && (
              <Area
                type="monotone"
                dataKey="cycleTime"
                name="Delivery Speed (hrs)"
                stroke={chartConfig.cycleTime.color}
                fillOpacity={1}
                fill={`url(#fillcycleTime)`}
              />
            )}
            
            {metrics.includes("reviewTime") && (
              <Area
                type="monotone"
                dataKey="reviewTime"
                name="Estimated review time (hrs)"
                stroke={chartConfig.reviewTime.color}
                fillOpacity={1}
                fill={`url(#fillreviewTime)`}
              />
            )}
            
            {metrics.includes("codingHours") && (
              <Area
                type="monotone"
                dataKey="codingHours"
                name="Estimated coding hours"
                stroke={chartConfig.codingHours.color}
                fillOpacity={1}
                fill={`url(#fillcodingHours)`}
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
} 
