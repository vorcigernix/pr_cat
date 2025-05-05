"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type InvestmentArea = {
  name: string;
  percentage: number;
  color: string;
};

export function InvestmentAreaDistribution() {
  const [investmentAreas, setInvestmentAreas] = useState<InvestmentArea[]>([
    { name: "Bug Fixes", percentage: 38, color: "bg-red-500" },
    { name: "Technical Debt", percentage: 27, color: "bg-amber-500" },
    { name: "New Features", percentage: 25, color: "bg-blue-500" },
    { name: "Product Debt", percentage: 10, color: "bg-violet-500" },
  ]);
  const [loading, setLoading] = useState(false);

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
    <Card>
      <CardHeader>
        <CardTitle>Investment Area Distribution</CardTitle>
        <CardDescription>
          How your engineering resources are being allocated
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between mb-2">
            <h3 className="text-sm font-medium">Current Sprint</h3>
            <span className="text-xs text-muted-foreground">Last 14 days</span>
          </div>

          <div className="space-y-3">
            {investmentAreas.map((area) => (
              <div key={area.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{area.name}</span>
                  <span>{area.percentage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${area.color} rounded-full`}
                    style={{ width: `${area.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <h3 className="text-sm font-medium mb-3">Recent Categorizations</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                <span className="flex-grow font-medium">
                  Fix auth token refresh loop
                </span>
                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900">
                  Bug Fixes
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500"></div>
                <span className="flex-grow font-medium">
                  Refactor API error handling
                </span>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900">
                  Technical Debt
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
                <span className="flex-grow font-medium">
                  Add user onboarding flow
                </span>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900">
                  New Features
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="h-2.5 w-2.5 rounded-full bg-violet-500"></div>
                <span className="flex-grow font-medium">
                  Improve UX of checkout page
                </span>
                <Badge variant="outline" className="bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900">
                  Product Debt
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 