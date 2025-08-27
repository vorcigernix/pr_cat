"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"

// Team and Organization types
export type Team = {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export type Organization = {
  id: number;
  name: string;
  role?: string;
}

// Time range options focused on retrospective intervals
export type TimeRange = "7d" | "14d" | "30d" | "90d"

export interface TeamFilterContextType {
  // Team and Organization state
  organizations: Organization[];
  teams: Team[];
  selectedOrganization: Organization | null;
  selectedTeam: Team | null;
  
  // Time filtering for retrospectives
  timeRange: TimeRange;
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Actions
  setSelectedOrganization: (org: Organization | null) => void;
  setSelectedTeam: (team: Team | null) => void;
  setTimeRange: (range: TimeRange) => void;
  refreshData: () => Promise<void>;
}

const TeamFilterContext = createContext<TeamFilterContextType | undefined>(undefined)

interface TeamFilterProviderProps {
  children: React.ReactNode;
}

// localStorage keys
const STORAGE_KEYS = {
  SELECTED_ORG_ID: 'pr_cat_selected_org_id',
  SELECTED_TEAM_ID: 'pr_cat_selected_team_id',
  TIME_RANGE: 'pr_cat_time_range'
} as const;

// Helper functions for localStorage with SSR safety
const getStorageValue = (key: string, defaultValue: any) => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStorageValue = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Fail silently if localStorage is not available
  }
};

export function TeamFilterProvider({ children }: TeamFilterProviderProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(() => 
    getStorageValue(STORAGE_KEYS.TIME_RANGE, "14d")
  ); // Default to 2 weeks for retrospectives
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch organizations on mount
  const fetchOrganizations = async () => {
    try {
      setError(null);
      const response = await fetch('/api/organizations');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch organizations');
      }
      
      const data = await response.json();
      setOrganizations(data);
      
          // Auto-select first organization if none selected, or restore from localStorage
      if (data.length > 0 && !selectedOrganization) {
        const savedOrgId = getStorageValue(STORAGE_KEYS.SELECTED_ORG_ID, null);
        const orgToSelect = savedOrgId 
          ? data.find((org: Organization) => org.id === savedOrgId) || data[0]
          : data[0];
        setSelectedOrganization(orgToSelect);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load organizations');
      return [];
    }
  };

  // Fetch teams for selected organization
  const fetchTeams = async (orgId: number) => {
    try {
      setError(null);
      const response = await fetch(`/api/organizations/${orgId}/teams`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch teams');
      }
      
      const data = await response.json();
      setTeams(data);
      
      // Restore selected team from localStorage if it exists in the fetched teams
      const savedTeamId = getStorageValue(STORAGE_KEYS.SELECTED_TEAM_ID, null);
      if (savedTeamId && data.length > 0 && !selectedTeam) {
        const teamToSelect = data.find((team: Team) => team.id === savedTeamId);
        if (teamToSelect) {
          setSelectedTeam(teamToSelect);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      setError(error instanceof Error ? error.message : 'Failed to load teams');
      return [];
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setLoading(true);
    try {
      const orgs = await fetchOrganizations();
      if (orgs.length > 0 && selectedOrganization) {
        await fetchTeams(selectedOrganization.id);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    refreshData();
  }, []);

  // Fetch teams when organization changes
  useEffect(() => {
    if (selectedOrganization) {
      fetchTeams(selectedOrganization.id);
      // Clear selected team when changing organizations
      setSelectedTeam(null);
    } else {
      setTeams([]);
      setSelectedTeam(null);
    }
  }, [selectedOrganization]);

  // Persist selections to localStorage
  useEffect(() => {
    if (selectedOrganization) {
      setStorageValue(STORAGE_KEYS.SELECTED_ORG_ID, selectedOrganization.id);
    }
  }, [selectedOrganization]);

  useEffect(() => {
    if (selectedTeam) {
      setStorageValue(STORAGE_KEYS.SELECTED_TEAM_ID, selectedTeam.id);
    } else {
      // Clear the stored team ID when no team is selected
      setStorageValue(STORAGE_KEYS.SELECTED_TEAM_ID, null);
    }
  }, [selectedTeam]);

  useEffect(() => {
    setStorageValue(STORAGE_KEYS.TIME_RANGE, timeRange);
  }, [timeRange]);

  const contextValue: TeamFilterContextType = {
    organizations,
    teams,
    selectedOrganization,
    selectedTeam,
    timeRange,
    loading,
    error,
    setSelectedOrganization,
    setSelectedTeam,
    setTimeRange,
    refreshData,
  };

  return (
    <TeamFilterContext.Provider value={contextValue}>
      {children}
    </TeamFilterContext.Provider>
  );
}

export function useTeamFilter() {
  const context = useContext(TeamFilterContext);
  if (!context) {
    throw new Error('useTeamFilter must be used within a TeamFilterProvider');
  }
  return context;
}

// Helper hook for building API query parameters with team filtering
export function useTeamFilterParams() {
  const { selectedTeam, selectedOrganization, timeRange } = useTeamFilter();
  
  return React.useMemo(() => {
    const params = new URLSearchParams();
    
    if (selectedOrganization) {
      params.append('organizationId', selectedOrganization.id.toString());
    }
    
    if (selectedTeam) {
      params.append('teamId', selectedTeam.id.toString());
    }
    
    params.append('timeRange', timeRange);
    
    return params.toString();
  }, [selectedTeam, selectedOrganization, timeRange]);
}
