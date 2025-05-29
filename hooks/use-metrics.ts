import useSWR from 'swr';

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }
  return res.json();
});

// Custom hook for metrics summary
export function useMetricsSummary() {
  const { data, error, isLoading, mutate } = useSWR('/api/metrics/summary', fetcher, {
    // Revalidate every 30 minutes on focus
    revalidateOnFocus: true,
    // Revalidate every 30 minutes
    refreshInterval: 30 * 60 * 1000,
    // Keep data fresh for 5 minutes, then show stale data while revalidating
    dedupingInterval: 5 * 60 * 1000,
    // Retry on error
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  return {
    data,
    isLoading,
    error,
    refresh: mutate,
  };
}

// Custom hook for workflow recommendations
export function useWorkflowRecommendations() {
  const { data, error, isLoading, mutate } = useSWR('/api/metrics/recommendations', fetcher, {
    // Revalidate less frequently since recommendations change slowly
    revalidateOnFocus: false,
    // Revalidate every 2 hours
    refreshInterval: 2 * 60 * 60 * 1000,
    // Keep data fresh for 30 minutes
    dedupingInterval: 30 * 60 * 1000,
    errorRetryCount: 2,
    errorRetryInterval: 10000,
  });

  return {
    data,
    isLoading,
    error,
    refresh: mutate,
  };
}

// Custom hook for time series data
export function useTimeSeriesData(repositoryId?: string, startDate?: string, endDate?: string) {
  // Build query string
  const params = new URLSearchParams();
  if (repositoryId && repositoryId !== 'all') {
    params.set('repositoryId', repositoryId);
  }
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  
  const queryString = params.toString();
  const url = `/api/metrics/time-series${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: true,
    // Revalidate every 15 minutes for time series
    refreshInterval: 15 * 60 * 1000,
    dedupingInterval: 5 * 60 * 1000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  return {
    data,
    isLoading,
    error,
    refresh: mutate,
  };
}

// Custom hook for repository insights
export function useRepositoryInsights() {
  const { data, error, isLoading, mutate } = useSWR('/api/metrics/repository-insights', fetcher, {
    revalidateOnFocus: true,
    // Revalidate every 30 minutes
    refreshInterval: 30 * 60 * 1000,
    dedupingInterval: 10 * 60 * 1000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  return {
    data,
    isLoading,
    error,
    refresh: mutate,
  };
}

// Custom hook for team performance
export function useTeamPerformance(repositoryId?: string) {
  const params = new URLSearchParams();
  if (repositoryId && repositoryId !== 'all') {
    params.set('repositoryId', repositoryId);
  }
  
  const queryString = params.toString();
  const url = `/api/metrics/team-performance${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: true,
    // Revalidate every 30 minutes
    refreshInterval: 30 * 60 * 1000,
    dedupingInterval: 10 * 60 * 1000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  return {
    data,
    isLoading,
    error,
    refresh: mutate,
  };
}

// Hook for manual refresh of all metrics
export function useRefreshAllMetrics() {
  const { refresh: refreshSummary } = useMetricsSummary();
  const { refresh: refreshRecommendations } = useWorkflowRecommendations();
  const { refresh: refreshTimeSeries } = useTimeSeriesData();
  const { refresh: refreshRepositoryInsights } = useRepositoryInsights();
  const { refresh: refreshTeamPerformance } = useTeamPerformance();

  const refreshAll = async () => {
    await Promise.all([
      refreshSummary(),
      refreshRecommendations(),
      refreshTimeSeries(),
      refreshRepositoryInsights(),
      refreshTeamPerformance(),
    ]);
  };

  return { refreshAll };
} 