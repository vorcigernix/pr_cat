import useSWR from 'swr';
import { useCallback } from 'react';

// Base interface for cached data with metadata
interface CachedData {
  dataUpToDate?: string;
  nextUpdateDue?: string;
  lastUpdated?: string;
  cacheStrategy?: string;
  _fetchedAt?: string;
  _cacheHeaders?: {
    etag?: string | null;
    cacheControl?: string | null;
    dataDate?: string | null;
    cacheStrategy?: string | null;
  };
}

// Enhanced fetcher with better error handling and cache headers
const fetcher = async (url: string) => {
  const response = await fetch(url, {
    // Add cache headers for optimal browser caching
    headers: {
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour in browser
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Add metadata about when this data was fetched
  data._fetchedAt = new Date().toISOString();
  data._cacheHeaders = {
    etag: response.headers.get('etag'),
    cacheControl: response.headers.get('cache-control'),
    dataDate: response.headers.get('x-data-date'),
    cacheStrategy: response.headers.get('x-cache-strategy')
  };
  
  return data;
};

// Helper to determine if data is stale based on daily granularity
function getOptimalRevalidationTime(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(1, 0, 0, 0); // 1 AM next day
  
  // Return milliseconds until 1 AM tomorrow
  return tomorrow.getTime() - now.getTime();
}

// Smart revalidation based on data freshness
function shouldRevalidateDaily(data: any): boolean {
  if (!data?._fetchedAt) return true;
  
  const fetchedAt = new Date(data._fetchedAt);
  const now = new Date();
  
  // Check if we've crossed midnight since last fetch
  const fetchedDay = fetchedAt.getDate();
  const currentDay = now.getDate();
  
  // If it's a new day and after 1 AM (when daily data should be ready)
  if (currentDay !== fetchedDay && now.getHours() >= 1) {
    return true;
  }
  
  return false;
}

// Base hook factory with optimal daily caching
function useMetricsBase<T extends CachedData>(
  endpoint: string, 
  config: {
    refreshInterval?: number
    revalidateOnFocus?: boolean
    revalidateOnReconnect?: boolean
    dedupingInterval?: number
  } = {}
) {
  const defaultConfig = {
    // Longer cache times for daily data
    dedupingInterval: 300000, // 5 minutes deduping
    refreshInterval: 0, // Don't auto-refresh (we use smart revalidation)
    revalidateOnFocus: false, // Don't revalidate on focus
    revalidateOnReconnect: true, // Revalidate on reconnect
    // Smart revalidation based on data freshness
    revalidateIfStale: true,
    // Custom revalidation logic
    revalidateWhenStale: (data: any) => shouldRevalidateDaily(data),
    // Error retry with exponential backoff
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    // Better loading experience
    keepPreviousData: true,
    ...config
  };

  const { data, error, isLoading, mutate, isValidating } = useSWR<T>(
    endpoint,
    fetcher,
    defaultConfig
  );

  // Manual refresh function
  const refresh = useCallback(() => {
    return mutate();
  }, [mutate]);

  // Check if data is from today (incomplete)
  const isDataComplete = useCallback(() => {
    if (!data?.dataUpToDate) return false;
    
    const dataDate = new Date(data.dataUpToDate);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    
    return dataDate >= yesterday;
  }, [data]);

  // Get cache status information
  const getCacheInfo = useCallback(() => {
    if (!data?._cacheHeaders) return null;
    
    return {
      strategy: data._cacheHeaders.cacheStrategy,
      dataDate: data._cacheHeaders.dataDate,
      etag: data._cacheHeaders.etag,
      fetchedAt: data._fetchedAt,
      isComplete: isDataComplete(),
      nextUpdate: data.nextUpdateDue
    };
  }, [data, isDataComplete]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    refresh,
    isDataComplete: isDataComplete(),
    cacheInfo: getCacheInfo(),
    // Legacy support
    mutate: refresh
  };
}

// Specific hooks with optimized configurations
export function useMetricsSummary(teamParams?: string) {
  const endpoint = teamParams ? `/api/metrics/summary?${teamParams}` : '/api/metrics/summary';
  return useMetricsBase(endpoint, {
    // Even longer cache for summary data since it's daily
    dedupingInterval: 600000, // 10 minutes
  });
}

export function useMetricsTimeSeries() {
  return useMetricsBase('/api/metrics/time-series', {
    // Time series data is also daily, cache longer
    dedupingInterval: 900000, // 15 minutes
  });
}

export function useRecommendations() {
  return useMetricsBase('/api/metrics/recommendations', {
    // Recommendations can be cached longer as they're strategic
    dedupingInterval: 1800000, // 30 minutes
  });
}

export function useRepositoryInsights() {
  return useMetricsBase('/api/metrics/repository-insights');
}

export function useTeamPerformance() {
  return useMetricsBase('/api/metrics/team-performance');
}

export function usePullRequestsRecent() {
  return useMetricsBase('/api/pull-requests/recent', {
    // Recent PRs might change more often, but still daily granularity
    dedupingInterval: 300000, // 5 minutes
  });
}

export function usePullRequestsCategoryDistribution() {
  return useMetricsBase('/api/pull-requests/category-distribution', {
    // Category distribution is daily data
    dedupingInterval: 600000, // 10 minutes
  });
}

// Hook for cache status across all metrics
export function useMetricsCacheStatus() {
  const summary = useMetricsSummary();
  const timeSeries = useMetricsTimeSeries();
  const recommendations = useRecommendations();
  
  return {
    summary: summary.cacheInfo,
    timeSeries: timeSeries.cacheInfo,
    recommendations: recommendations.cacheInfo,
    // Overall cache health
    isAllDataComplete: summary.isDataComplete && timeSeries.isDataComplete && recommendations.isDataComplete,
    lastUpdate: Math.max(
      summary.cacheInfo?.fetchedAt ? new Date(summary.cacheInfo.fetchedAt).getTime() : 0,
      timeSeries.cacheInfo?.fetchedAt ? new Date(timeSeries.cacheInfo.fetchedAt).getTime() : 0,
      recommendations.cacheInfo?.fetchedAt ? new Date(recommendations.cacheInfo.fetchedAt).getTime() : 0
    )
  };
} 