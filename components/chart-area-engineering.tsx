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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

type TimeSeriesDataPoint = {
  date: string;
  prThroughput: number;
  cycleTime: number;
  reviewTime: number;
  codingHours: number;
};

export function ChartAreaEngineering() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")
  const [chartData, setChartData] = React.useState<TimeSeriesDataPoint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [metrics, setMetrics] = React.useState<string[]>(["prThroughput", "cycleTime", "codingHours"]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // In a real app, this would be an API call
        const response = await import("@/app/dashboard/time-series.json");
        setChartData(response.default);
      } catch (error) {
        console.error("Failed to load time series data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
      setMetrics(["prThroughput", "cycleTime"]);
    }
  }, [isMobile])

  const filteredData = React.useMemo(() => {
    if (!chartData.length) return [];
    
    // Sort data by date in ascending order
    const sortedData = [...chartData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Filter based on time range
    const today = new Date();
    let daysToSubtract = 30;
    if (timeRange === "7d") {
      daysToSubtract = 7;
    } else if (timeRange === "90d") {
      daysToSubtract = 90;
    }
    
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    return sortedData.filter(item => {
      const date = new Date(item.date);
      return date >= startDate;
    });
  }, [chartData, timeRange]);

  const chartConfig = {
    prThroughput: {
      label: "PR Throughput",
      color: "var(--chart-1)",
    },
    cycleTime: {
      label: "Cycle Time (hrs)",
      color: "var(--chart-2)",
    },
    reviewTime: {
      label: "Review Time (hrs)",
      color: "var(--chart-3)",
    },
    codingHours: {
      label: "Coding Hours",
      color: "var(--chart-4)",
    },
  } as ChartConfig;

  const handleMetricToggle = (value: string) => {
    if (metrics.includes(value)) {
      // Remove the metric if it's already selected
      if (metrics.length > 1) { // Ensure at least one metric is always selected
        setMetrics(metrics.filter(m => m !== value));
      }
    } else {
      // Add the metric
      setMetrics([...metrics, value]);
    }
  };

  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Engineering Metrics</CardTitle>
          <CardDescription>Loading data...</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse w-full h-2/3 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Engineering Metrics</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Performance metrics over time
          </span>
          <span className="@[540px]/card:hidden">Engineering trends</span>
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <div className="hidden lg:flex gap-2">
            {Object.entries(chartConfig).map(([key, config]) => (
              <button 
                key={key}
                onClick={() => handleMetricToggle(key)}
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
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="7d">7 days</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 days</ToggleGroupItem>
            <ToggleGroupItem value="90d">90 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-28 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select time range"
            >
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="90d" className="rounded-lg">
                Last 90 days
              </SelectItem>
            </SelectContent>
          </Select>
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
                if (name === "Cycle Time (hrs)" || name === "Review Time (hrs)" || name === "Coding Hours") {
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
                name="PR Throughput"
                stroke={chartConfig.prThroughput.color}
                fillOpacity={1}
                fill={`url(#fillprThroughput)`}
              />
            )}
            
            {metrics.includes("cycleTime") && (
              <Area
                type="monotone"
                dataKey="cycleTime"
                name="Cycle Time (hrs)"
                stroke={chartConfig.cycleTime.color}
                fillOpacity={1}
                fill={`url(#fillcycleTime)`}
              />
            )}
            
            {metrics.includes("reviewTime") && (
              <Area
                type="monotone"
                dataKey="reviewTime"
                name="Review Time (hrs)"
                stroke={chartConfig.reviewTime.color}
                fillOpacity={1}
                fill={`url(#fillreviewTime)`}
              />
            )}
            
            {metrics.includes("codingHours") && (
              <Area
                type="monotone"
                dataKey="codingHours"
                name="Coding Hours"
                stroke={chartConfig.codingHours.color}
                fillOpacity={1}
                fill={`url(#fillcodingHours)`}
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
} 