"use client";

import { useState } from "react";
import { useTeamFilter } from "@/hooks/use-team-filter";
import { useDashboardQuery } from "@/hooks/use-metrics";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";

type TimeSeriesDataPoint = {
  date: string;
  [key: string]: string | number;
};

type CategoryInfo = {
  key: string;
  label: string;
  color: string;
};

type TimeSeriesResponse = {
  data: TimeSeriesDataPoint[];
  categories: CategoryInfo[];
};

export function InvestmentAreaDistribution() {
  const { timeRange } = useTeamFilter();
  const { data: response, isLoading: loading, error: requestError, refresh } = useDashboardQuery<TimeSeriesResponse>(
    '/api/pull-requests/category-distribution', { format: 'timeseries' }
  );
  const error = requestError?.message;
  const filteredData = response?.data || [];
  const categories = response?.categories || [];
  const [selection, setSelectedCategories] = useState<string[] | null>(null);
  const availableSelection = selection?.filter(key => categories.some(category => category.key === key));
  const selectedCategories = availableSelection?.length ? availableSelection : categories.map(category => category.key);

  const getStandardizedColor = (categoryKey: string, categoryLabel: string) => {
    // Standardize colors to match PR activity table
    const lowerKey = categoryKey.toLowerCase();
    const lowerLabel = categoryLabel.toLowerCase();

    if (lowerKey.includes('bug') || lowerLabel.includes('bug') || lowerLabel.includes('fix')) {
      return '#ef4444'; // red-500
    }
    if (lowerKey.includes('feature') || lowerLabel.includes('feature') || lowerLabel.includes('enhancement')) {
      return '#3b82f6'; // blue-500
    }
    if (lowerKey.includes('debt') || lowerLabel.includes('debt') || lowerLabel.includes('refactor')) {
      return '#eab308'; // yellow-500
    }
    if (lowerKey.includes('doc') || lowerLabel.includes('doc')) {
      return '#10b981'; // green-500
    }
    if (lowerKey.includes('ui') || lowerLabel.includes('ux') || lowerLabel.includes('product')) {
      return '#8b5cf6'; // violet-500
    }

    // Default fallback color
    return '#6b7280'; // gray-500
  };

  const chartConfig: ChartConfig = categories.reduce((config, category) => {
    config[category.key] = {
      label: category.label,
      color: getStandardizedColor(category.key, category.label),
    };
    return config;
  }, {} as ChartConfig);

  const handleCategoryToggle = (categoryKey: string) => {
    if (selectedCategories.includes(categoryKey)) {
      // Remove the category if it's already selected
      if (selectedCategories.length > 1) { // Ensure at least one category is always selected
        setSelectedCategories(selectedCategories.filter(c => c !== categoryKey));
      }
    } else {
      // Add the category
      setSelectedCategories([...selectedCategories, categoryKey]);
    }
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7d': return 'Last 7 days';
      case '14d': return 'Last 14 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      default: return 'Last 30 days';
    }
  };

  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Team Focus Distribution</CardTitle>
          <CardDescription>Loading team focus trends...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse bg-muted"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Team Focus Distribution</CardTitle>
          <CardDescription className="text-red-500">Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => void refresh()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (filteredData.length === 0 || categories.length === 0) {
    return (
      <Card className="@container/card">
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
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Focus Distribution</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:hidden">Daily focus breakdown • {getTimeRangeLabel()}</span>
          <span className="hidden @[540px]/card:block">
            Daily breakdown of your teams collaborative energy across categories • {getTimeRangeLabel()}
          </span>
        </CardDescription>
      </CardHeader>

      {/* Filters Row */}
      <div className="flex items-center justify-between gap-4 px-6 pb-4">
        <div className="hidden lg:flex gap-2">
          {categories.map((category) => (
            <button
              key={category.key}
              onClick={() => handleCategoryToggle(category.key)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                selectedCategories.includes(category.key)
                ? 'bg-primary/10 text-primary'
                : 'bg-transparent text-muted-foreground hover:bg-muted'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

      </div>

      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <BarChart accessibilityLayer data={filteredData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              }}
            />
            <ChartTooltip content={<ChartTooltipContent variant="labelless" />} />
            <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-3 gap-y-2" />} />

            {selectedCategories.map((categoryKey, index) => {
              const category = categories.find(c => c.key === categoryKey);
              if (!category) return null;

              const isFirst = index === 0;
              const isLast = index === selectedCategories.length - 1;

              return (
                <Bar
                  key={categoryKey}
                  dataKey={categoryKey}
                  stackId="a"
                  fill={`var(--color-${categoryKey})`}
                  radius={
                    selectedCategories.length === 1
                      ? [4, 4, 4, 4] // Single bar gets rounded on all corners
                      : isLast
                        ? [4, 4, 0, 0] // Top bar gets rounded top corners
                        : isFirst
                          ? [0, 0, 4, 4] // Bottom bar gets rounded bottom corners
                          : [0, 0, 0, 0] // Middle bars have no radius
                  }
                />
              );
            })}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
