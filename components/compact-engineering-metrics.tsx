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

export function CompactEngineeringMetrics() {
  const [chartData, setChartData] = React.useState<TimeSeriesDataPoint[]>([]);
  const [loading, setLoading] = React.useState(true);

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
    
    // Show only last 14 days
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 14);
    
    const filtered = sortedData.filter(item => {
      const date = new Date(item.date);
      return date >= startDate;
    });

    // Calculate metrics
    const latest = filtered[filtered.length - 1] || { prThroughput: 0, cycleTime: 0, reviewTime: 0, codingHours: 0 };
    const previous = filtered[filtered.length - 2] || { prThroughput: 0, cycleTime: 0, reviewTime: 0, codingHours: 0 };
    
    const prCurrent = latest.prThroughput;
    const prChange = ((prCurrent - previous.prThroughput) / previous.prThroughput) * 100;
    
    const cycleCurrent = latest.cycleTime;
    const cycleChange = ((cycleCurrent - previous.cycleTime) / previous.cycleTime) * 100;
    
    const reviewCurrent = latest.reviewTime;
    const reviewChange = ((reviewCurrent - previous.reviewTime) / previous.reviewTime) * 100;
    
    const codingCurrent = latest.codingHours;
    const codingChange = ((codingCurrent - previous.codingHours) / previous.codingHours) * 100;

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
      color: "#3b82f6",  // Blue
      unit: "",
      isReversed: false  // Higher is better
    },
    { 
      name: "Delivery Speed", 
      value: metrics.cycleCurrent, 
      change: metrics.cycleChange, 
      dataKey: "cycleTime", 
      color: "#f97316",  // Orange
      unit: "hrs",
      isReversed: true   // Lower is better
    },
    { 
      name: "Feedback Time", 
      value: metrics.reviewCurrent, 
      change: metrics.reviewChange, 
      dataKey: "reviewTime", 
      color: "#a855f7",  // Purple
      unit: "hrs",
      isReversed: true   // Lower is better
    },
    { 
      name: "Flow State", 
      value: metrics.codingCurrent, 
      change: metrics.codingChange, 
      dataKey: "codingHours", 
      color: "#10b981",  // Green
      unit: "hrs",
      isReversed: false  // Higher is better
    }
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Team Flow Metrics</CardTitle>
        </CardHeader>
        <CardContent className="h-[220px] flex items-center justify-center">
          <div className="animate-pulse w-full h-2/3 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Team Flow Metrics</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-4">
          {metricsConfig.map((metric) => (
            <div key={metric.name} className="flex items-start space-x-4">
              <div className="w-[140px] pt-1">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">{metric.name}</div>
                  <div className="flex items-center">
                    <span className="text-sm font-bold mr-1">{metric.value}{metric.unit}</span>
                    <span className={`text-xs font-medium flex items-center ${
                      metric.isReversed ? 
                        (metric.change < 0 ? 'text-green-500' : metric.change > 0 ? 'text-red-500' : 'text-muted-foreground') :
                        (metric.change > 0 ? 'text-green-500' : metric.change < 0 ? 'text-red-500' : 'text-muted-foreground')
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