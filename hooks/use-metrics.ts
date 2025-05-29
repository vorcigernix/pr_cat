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
    data: data ? { ...data, lastUpdated: new Date() } : undefined,
    error,
    isLoading,
    refresh: mutate,
  };
}

// Custom hook for workflow recommendations
export function useWorkflowRecommendations() {
  const { data, error, isLoading, mutate } = useSWR('/api/metrics/recommendations', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60 * 60 * 1000, // 1 hour
    dedupingInterval: 10 * 60 * 1000, // 10 minutes
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}

// Custom hook for time series data
export function useTimeSeriesData() {
  const { data, error, isLoading, mutate } = useSWR('/api/metrics/time-series', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 15 * 60 * 1000, // 15 minutes
    dedupingInterval: 5 * 60 * 1000, // 5 minutes
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}

// Custom hook for repository insights
export function useRepositoryInsights() {
  const { data, error, isLoading, mutate } = useSWR('/api/metrics/repository-insights', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30 * 60 * 1000, // 30 minutes
    dedupingInterval: 10 * 60 * 1000, // 10 minutes
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}

// Custom hook for team performance
export function useTeamPerformance() {
  const { data, error, isLoading, mutate } = useSWR('/api/metrics/team-performance', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30 * 60 * 1000, // 30 minutes
    dedupingInterval: 10 * 60 * 1000, // 10 minutes
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}

// Hook to refresh all metrics at once
export function useRefreshAllMetrics() {
  const summaryHook = useMetricsSummary();
  const recommendationsHook = useWorkflowRecommendations();
  const timeSeriesHook = useTimeSeriesData();
  const repositoryHook = useRepositoryInsights();
  const teamHook = useTeamPerformance();

  const refreshAll = async () => {
    await Promise.all([
      summaryHook.refresh(),
      recommendationsHook.refresh(),
      timeSeriesHook.refresh(),
      repositoryHook.refresh(),
      teamHook.refresh(),
    ]);
  };

  return {
    refreshAll,
    isLoading: summaryHook.isLoading || recommendationsHook.isLoading || timeSeriesHook.isLoading || repositoryHook.isLoading || teamHook.isLoading,
  };
} 