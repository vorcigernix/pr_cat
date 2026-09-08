import useSWR from 'swr';
import type { MetricsSummary, PaginatedResult, PullRequestSummary } from '@/lib/core';
import { fetchJson } from '@/lib/fetch-json';
import { useTeamFilterParams } from './use-team-filter';

function useMetricsQuery<T>(endpoint: string | null) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(endpoint, fetchJson, {
    dedupingInterval: 30000,
    revalidateOnFocus: false,
    keepPreviousData: false,
    errorRetryCount: 3,
  });
  return { data, error, isLoading: !endpoint || isLoading, isValidating, refresh: mutate };
}

export function useMetricsSummary(filters?: string) {
  return useMetricsQuery<MetricsSummary>(filters ? `/api/metrics/summary?${filters}` : null);
}

export function usePullRequestsRecent(filters?: string) {
  const ready = filters && new URLSearchParams(filters).has('organizationId');
  return useMetricsQuery<PaginatedResult<PullRequestSummary> | PullRequestSummary[]>(ready ? `/api/pull-requests/recent?${filters}` : null);
}

export function useDashboardQuery<T>(path: string, extraParams?: Record<string, string>) {
  const filters = useTeamFilterParams();
  const params = new URLSearchParams(filters);
  Object.entries(extraParams || {}).forEach(([key, value]) => params.set(key, value));
  return useMetricsQuery<T>(filters ? `${path}?${params}` : null);
}
