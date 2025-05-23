import { useState, useEffect } from 'react';

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
  };
  organizations: Array<{
    id: number;
    name: string;
    role: string;
  }>;
  primaryOrganization: {
    id: number;
    name: string;
  };
  repositories?: any[];
  metricsSummary?: any;
  recentPRs?: any[];
}

interface UseDashboardDataOptions {
  include?: ('repositories' | 'metrics-summary' | 'recent-prs')[];
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    include = [],
    autoRefresh = false,
    refreshInterval = 30000 // 30 seconds
  } = options;

  const fetchData = async () => {
    try {
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (include.length > 0) {
        params.append('include', include.join(','));
      }

      const response = await fetch(`/api/dashboard/data?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setData(result);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up auto-refresh if enabled
    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      intervalId = setInterval(fetchData, refreshInterval);
    }

    // Cleanup
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [include.join(','), autoRefresh, refreshInterval]);

  const refetch = () => {
    setLoading(true);
    fetchData();
  };

  return {
    data,
    loading,
    error,
    refetch
  };
} 