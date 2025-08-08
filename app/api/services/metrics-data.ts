// Types for metrics data
export type MetricsSummary = {
  codingTime: {
    value: number;
    change: number;
    trend: string;
  };
  prSize: {
    value: number;
    change: number;
    trend: string;
  };
  cycleTime: {
    value: number;
    change: number;
    trend: string;
  };
  reviewTime: {
    value: number;
    change: number;
    trend: string;
  };
};

export type TimeSeriesDataPoint = {
  date: string;
  prThroughput: number;
  cycleTime: number;
  reviewTime: number;
  codingHours: number;
};

// Get base URL for server-side API calls
function getBaseUrl() {
  // When running on the server, we need an absolute URL
  if (typeof window === 'undefined') {
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    return `http://localhost:${process.env.PORT || 3000}`;
  }
  // In the browser, relative URLs work fine
  return '';
}

/**
 * Fetch metrics summary data (server component)
 */
export async function getMetricsSummary(): Promise<MetricsSummary> {
  try {
    // In a real app, this would fetch from an API endpoint
    // For demo purposes, we're importing the JSON directly
    // This is a server component, so we can use import directly
    const data = await import("@/app/dashboard/metrics-summary.json");
    return data.default;
  } catch (error) {
    console.error("Error fetching metrics summary:", error);
    // Return fallback data if the fetch fails
    return {
      codingTime: { value: 0, change: 0, trend: "neutral" },
      prSize: { value: 0, change: 0, trend: "neutral" },
      cycleTime: { value: 0, change: 0, trend: "neutral" },
      reviewTime: { value: 0, change: 0, trend: "neutral" }
    };
  }
}

/**
 * Fetch time series data (server component)
 */
export async function getTimeSeriesData(): Promise<TimeSeriesDataPoint[]> {
  try {
    // In a real app, this would fetch from an API endpoint
    const data = await import("@/app/dashboard/time-series.json");
    return data.default;
  } catch (error) {
    console.error("Error fetching time series data:", error);
    // Return empty array if the fetch fails
    return [];
  }
} 