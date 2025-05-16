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
import { TimeSeriesDataPoint } from "@/app/api/services/metrics-data"

// Default sample data for when the component is used without providing data
const defaultChartData: TimeSeriesDataPoint[] = [
  {
    date: "2025-04-20",
    prThroughput: 2,
    cycleTime: 45.2,
    reviewTime: 16.8,
    codingHours: 4.7
  },
  {
    date: "2025-04-21",
    prThroughput: 3,
    cycleTime: 52.1,
    reviewTime: 18.3,
    codingHours: 5.2
  },
  {
    date: "2025-04-22",
    prThroughput: 1,
    cycleTime: 48.5,
    reviewTime: 22.1,
    codingHours: 4.9
  },
  {
    date: "2025-04-23",
    prThroughput: 2,
    cycleTime: 43.2,
    reviewTime: 15.7,
    codingHours: 5.5
  },
  {
    date: "2025-04-24",
    prThroughput: 4,
    cycleTime: 39.8,
    reviewTime: 12.3,
    codingHours: 6.1
  }
];

interface ChartAreaEngineeringProps {
  initialChartData?: TimeSeriesDataPoint[]; // Make this optional
}

export function ChartAreaEngineering({ initialChartData = defaultChartData }: ChartAreaEngineeringProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")
  // Initialize state with server-fetched data or default values
  const [chartData, setChartData] = React.useState<TimeSeriesDataPoint[]>(initialChartData);
  const [metrics, setMetrics] = React.useState<string[]>(["prThroughput", "cycleTime", "codingHours"]);

  // No need for loading state or data fetching useEffect
  
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
      label: "Shipping Velocity",
      color: "var(--chart-1)",
    },
    cycleTime: {
      label: "Delivery Speed (hrs)",
      color: "var(--chart-2)",
    },
    reviewTime: {
      label: "Feedback Time (hrs)",
      color: "var(--chart-3)",
    },
    codingHours: {
      label: "Flow State Hours",
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

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Team Flow Metrics</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Team collaboration health over time
          </span>
          <span className="@[540px]/card:hidden">Team flow trends</span>
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
                if (name === "Delivery Speed (hrs)" || name === "Feedback Time (hrs)" || name === "Flow State Hours") {
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
                name="Feedback Time (hrs)"
                stroke={chartConfig.reviewTime.color}
                fillOpacity={1}
                fill={`url(#fillreviewTime)`}
              />
            )}
            
            {metrics.includes("codingHours") && (
              <Area
                type="monotone"
                dataKey="codingHours"
                name="Flow State Hours"
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