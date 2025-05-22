"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

type CategoryData = {
  name: string;
  value: number;
  color: string;
};

export function InvestmentAreaDistribution() {
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch real category distribution data
        const response = await fetch('/api/pull-requests/category-distribution');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch category distribution: ${response.status} ${response.statusText}`);
        }
        
        const categoryData = await response.json();
        
        // Map the API response to the format needed for the chart
        const colors = [
          "#3b82f6", // Blue
          "#ef4444", // Red
          "#f97316", // Orange
          "#a855f7", // Purple
          "#14b8a6", // Teal
          "#eab308", // Yellow
          "#ec4899"  // Pink
        ];
        
        const formattedData = categoryData.map((item: any, index: number) => ({
          name: item.category_name,
          value: item.count,
          color: colors[index % colors.length]
        }));
        
        setData(formattedData);
      } catch (error) {
        console.error("Failed to load category distribution:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Focus Distribution</CardTitle>
          <CardDescription>Loading team focus data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse bg-muted"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Focus Distribution</CardTitle>
          <CardDescription className="text-red-500">Error loading data</CardDescription>
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

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Focus Distribution</CardTitle>
          <CardDescription>No category data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No PR categories found. Categories will appear here once PRs are categorized.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Team Focus Distribution</CardTitle>
        <CardDescription>
          Where your team is putting their collaborative energy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 