"use client"

import * as React from "react"
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts"
import { IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type TimeSeriesDataPoint = {
  date: string;
  prThroughput: number;
  cycleTime: number;
  reviewTime: number;
  codingHours: number;
};

interface EnhancedCompactEngineeringMetricsProps {
  initialData?: TimeSeriesDataPoint[];
  className?: string;
}

export function EnhancedCompactEngineeringMetrics({
  initialData,
  className
}: EnhancedCompactEngineeringMetricsProps) {
  const [chartData, setChartData] = React.useState<TimeSeriesDataPoint[]>(initialData || []);
  const [loading, setLoading] = React.useState(!initialData);
  const [error, setError] = React.useState<string | null>(null);

  // Background refresh after initial load
  React.useEffect(() => {
    if (!initialData) return;
    
    // Delay background refresh by 2 seconds to not interfere with initial render
    const refreshTimer = setTimeout(async () => {
      try {
        const response = await fetch('/api/metrics/time-series');
        if (response.ok) {
          const data = await response.json();
          setChartData(data);
        }
      } catch (error) {
        // Silent fail on background refresh - we have initial data
        console.warn("Background refresh failed:", error);
      }
    }, 2000);
    
    return () => clearTimeout(refreshTimer);
  }, [initialData]);

  React.useEffect(() => {
    if (initialData) return; // Skip if we have initial data
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/metrics/time-series');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setChartData(data);
      } catch (error) {
        console.error("Failed to load time series data:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialData]);

  const { filteredData, metrics } = React.useMemo(() => {
    if (!chartData.length) return { 
      filteredData: [], 
      metrics: { 
        prCurrent: 0, prChange: 0, 
        cycleCurrent: 0, cycleChange: 0, 
        reviewCurrent: 0, reviewChange: 0, 
        codingCurrent: 0, codingChange: 0 
      } 
    };
    
    // Sort data by date in ascending order
    const sortedData = [...chartData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const filtered = sortedData;

    // Calculate metrics
    const latest = filtered[filtered.length - 1] || { prThroughput: 0, cycleTime: 0, reviewTime: 0, codingHours: 0 };
    const previous = filtered[filtered.length - 2] || { prThroughput: 0, cycleTime: 0, reviewTime: 0, codingHours: 0 };
    
    const prCurrent = latest.prThroughput;
    const prChange = previous.prThroughput === 0 ? 0 : 
                    ((prCurrent - previous.prThroughput) / previous.prThroughput) * 100;
    
    const cycleCurrent = latest.cycleTime;
    const cycleChange = previous.cycleTime === 0 ? 0 : 
                       ((cycleCurrent - previous.cycleTime) / previous.cycleTime) * 100;
    
    const reviewCurrent = latest.reviewTime;
    const reviewChange = previous.reviewTime === 0 ? 0 : 
                        ((reviewCurrent - previous.reviewTime) / previous.reviewTime) * 100;
    
    const codingCurrent = latest.codingHours;
    const codingChange = previous.codingHours === 0 ? 0 : 
                        ((codingCurrent - previous.codingHours) / previous.codingHours) * 100;

    return { 
      filteredData: filtered,
      metrics: {
        prCurrent,
        prChange: isNaN(prChange) ? 0 : prChange,
        cycleCurrent,
        cycleChange: isNaN(cycleChange) ? 0 : cycleChange,
        reviewCurrent,
        reviewChange: isNaN(reviewChange) ? 0 : reviewChange,
        codingCurrent,
        codingChange: isNaN(codingChange) ? 0 : codingChange
      }
    };
  }, [chartData]);

  const metricsConfig = [
    { 
      name: "Shipping Velocity", 
      value: metrics.prCurrent, 
      change: metrics.prChange, 
      dataKey: "prThroughput", 
      color: "#3b82f6",
      unit: "",
      isReversed: false
    },
    { 
      name: "Delivery Speed", 
      value: metrics.cycleCurrent, 
      change: metrics.cycleChange, 
      dataKey: "cycleTime", 
      color: "#f97316",
      unit: "hrs",
      isReversed: true
    },
    { 
      name: "Feedback Time", 
      value: metrics.reviewCurrent, 
      change: metrics.reviewChange, 
      dataKey: "reviewTime", 
      color: "#a855f7",
      unit: "hrs",
      isReversed: true
    },
    { 
      name: "Flow State", 
      value: metrics.codingCurrent, 
      change: metrics.codingChange, 
      dataKey: "codingHours", 
      color: "#10b981",
      unit: "hrs",
      isReversed: false
    }
  ];

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Team Flow Metrics</CardTitle>
        </CardHeader>
        <CardContent className="h-[220px] flex items-center justify-center">
          <div className="animate-pulse w-full h-2/3 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Team Flow Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-0">
        <CardTitle className="text-base flex items-center justify-between">
          Team Flow Metrics
          {initialData && (
            <span className="text-xs text-muted-foreground font-normal">
              ⚡ Server-enhanced
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-4">
          {metricsConfig.map((metric) => (
            <div key={metric.name} className="flex items-start space-x-4">
              <div className="w-[140px] pt-1">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">{metric.name}</div>
                  <div className="flex items-center">
                    <span className="text-sm font-bold mr-1">{metric.value.toFixed(1)}{metric.unit}</span>
                    <span className={`text-xs font-medium ${
                      metric.isReversed ? 
                        (metric.change < 0 ? 'text-green-500' : metric.change > 0 ? 'text-orange-500' : 'text-muted-foreground') :
                        (metric.change > 0 ? 'text-green-500' : metric.change < 0 ? 'text-orange-500' : 'text-muted-foreground')
                    }`}>
                      {metric.isReversed ? 
                        (metric.change < 0 ? <IconArrowDownRight className="h-3 w-3 mr-0.5" /> : metric.change > 0 ? <IconArrowUpRight className="h-3 w-3 mr-0.5" /> : null) :
                        (metric.change > 0 ? <IconArrowUpRight className="h-3 w-3 mr-0.5" /> : metric.change < 0 ? <IconArrowDownRight className="h-3 w-3 mr-0.5" /> : null)
                      }
                      {Math.abs(metric.change).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex-1 h-[40px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData}>
                    <Line 
                      type="monotone" 
                      dataKey={metric.dataKey}
                      stroke={metric.color}
                      strokeWidth={3.5}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}${metric.unit}`, metric.name]}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      }}
                      contentStyle={{ fontSize: '12px' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
