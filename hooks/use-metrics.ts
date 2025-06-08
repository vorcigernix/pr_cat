import useSWR from 'swr';

// Centralized fetcher with better error handling
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} - ${res.statusText}`);
  }
  return res.json();
};

// Base configuration for different metric types
const METRIC_CONFIGS = {
  summary: {
    refreshInterval: 30 * 60 * 1000, // 30 minutes
    dedupingInterval: 5 * 60 * 1000,  // 5 minutes
  },
  recommendations: {
    refreshInterval: 60 * 60 * 1000, // 1 hour
    dedupingInterval: 10 * 60 * 1000, // 10 minutes
  },
  timeSeries: {
    refreshInterval: 15 * 60 * 1000, // 15 minutes
    dedupingInterval: 5 * 60 * 1000,  // 5 minutes
  },
  insights: {
    refreshInterval: 30 * 60 * 1000, // 30 minutes
    dedupingInterval: 10 * 60 * 1000, // 10 minutes
  },
} as const;

// Base hook factory to reduce duplication
function useMetricsBase(endpoint: string, configKey: keyof typeof METRIC_CONFIGS) {
  const config = METRIC_CONFIGS[configKey];
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/metrics/${endpoint}`,
    fetcher,
    {
      revalidateOnFocus: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      ...config,
    }
  );

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}

// Specific metric hooks
export function useMetricsSummary() {
  const result = useMetricsBase('summary', 'summary');
  
  return {
    ...result,
    // Add lastUpdated timestamp for summary data
    data: result.data ? { ...result.data, lastUpdated: new Date() } : undefined,
  };
}

export function useWorkflowRecommendations() {
  return useMetricsBase('recommendations', 'recommendations');
}

export function useTimeSeriesData() {
  return useMetricsBase('time-series', 'timeSeries');
}

export function useRepositoryInsights() {
  return useMetricsBase('repository-insights', 'insights');
}

export function useTeamPerformance() {
  return useMetricsBase('team-performance', 'insights');
}

// Consolidated refresh hook
export function useRefreshAllMetrics() {
  const hooks = [
    useMetricsSummary(),
    useWorkflowRecommendations(),
    useTimeSeriesData(),
    useRepositoryInsights(),
    useTeamPerformance(),
  ];

  const refreshAll = () => Promise.all(hooks.map(hook => hook.refresh()));
  const isLoading = hooks.some(hook => hook.isLoading);

  return { refreshAll, isLoading };
} 