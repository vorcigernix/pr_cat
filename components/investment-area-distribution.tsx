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

const data = [
  { name: "Product Features", value: 35, color: "#3b82f6" },
  { name: "Bug Fixes", value: 25, color: "#ef4444" },
  { name: "Tech Debt", value: 20, color: "#f97316" },
  { name: "Product Debt", value: 15, color: "#a855f7" },
  { name: "Research", value: 5, color: "#14b8a6" },
];

export function InvestmentAreaDistribution() {
  const [loading] = useState(false);

  // In a real app, this would fetch data from an API
  useEffect(() => {
    // Placeholder for future API integration
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investment Area Distribution</CardTitle>
          <CardDescription>Loading investment area data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse bg-muted"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Investment Area Distribution</CardTitle>
        <CardDescription>
          How your team&apos;s efforts are distributed across investment areas
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