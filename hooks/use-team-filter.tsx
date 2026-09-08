"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import useSWR, { useSWRConfig } from "swr"
import { DASHBOARD_TIME_RANGES, type DashboardTimeRange } from "@/lib/core/domain/value-objects/dashboard-filters"

export type Team = {
  id: number; organization_id: number; name: string; description: string | null;
  color: string | null; created_at: string; updated_at: string; member_count?: number;
}
export type Organization = { id: string | number; name: string; role?: string }
export type DashboardRepository = { id: string; name: string; full_name?: string; last_synced_at?: string | null }
export type TimeRange = DashboardTimeRange

export interface TeamFilterContextType {
  organizations: Organization[]; teams: Team[]; repositories: DashboardRepository[];
  selectedOrganization: Organization | null; selectedTeam: Team | null;
  selectedRepositoryId: string; timeRange: TimeRange; loading: boolean; ready: boolean;
  error: string | null; refreshing: boolean; lastRefreshed: string | null;
  setSelectedOrganization: (org: Organization | null) => void;
  setSelectedTeam: (team: Team | null) => void;
  setSelectedRepositoryId: (id: string) => void;
  setTimeRange: (range: TimeRange) => void;
  refreshData: () => Promise<void>;
}
const TeamFilterContext = createContext<TeamFilterContextType | undefined>(undefined)
const FILTER_KEYS = ['organizationId', 'teamId', 'repositoryId', 'timeRange'] as const
const STORAGE_KEY = 'pr_cat_dashboard_filters'
const EMPTY_ORGANIZATIONS: Organization[] = []

async function fetchFilters(url: string) {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Could not load dashboard filters. Please retry.')
  return response.json()
}

function updateFilters(values: Record<string, string | null>, replace = false) {
  const url = new URL(window.location.href)
  Object.entries(values).forEach(([key, value]) => {
    if (value === null) url.searchParams.delete(key)
    else url.searchParams.set(key, value)
  })
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url.pathname + url.search + url.hash)
}

export function TeamFilterProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const { mutate, cache } = useSWRConfig()
  const [refresh, setRefresh] = useState<{
    scope: string; pending: boolean; completedAt: string | null; error: string | null;
  } | null>(null)
  const orgQuery = useSWR<Organization[]>('/api/organizations', fetchFilters)
  const organizations = orgQuery.data || EMPTY_ORGANIZATIONS
  const organizationId = searchParams.get('organizationId')
  const selectedOrganization = organizations.find(org => String(org.id) === organizationId) || null
  const teamEndpoint = selectedOrganization ? `/api/organizations/${selectedOrganization.id}/teams` : null
  const repoEndpoint = selectedOrganization ? `/api/repositories?organizationId=${selectedOrganization.id}` : null
  const teamQuery = useSWR<Team[]>(teamEndpoint, fetchFilters)
  const repoQuery = useSWR<{ repositories: DashboardRepository[] }>(repoEndpoint, fetchFilters)
  const teams = teamQuery.data || []
  const repositories = repoQuery.data?.repositories || []
  const selectedTeam = teams.find(team => String(team.id) === searchParams.get('teamId')) || null
  const selectedRepositoryId = repositories.find(repo => String(repo.id) === searchParams.get('repositoryId'))?.id.toString() || 'all'
  const requestedRange = searchParams.get('timeRange')
  const timeRange: TimeRange = DASHBOARD_TIME_RANGES.includes(requestedRange as TimeRange) ? requestedRange as TimeRange : '14d'
  const filterScope = FILTER_KEYS.map(key => searchParams.get(key) || '').join('|')

  const currentRefresh = refresh?.scope === filterScope ? refresh : null
  const hasUrlFilters = FILTER_KEYS.some(key => searchParams.has(key))
  const invalidTeam = !!searchParams.get('teamId') && !!teamQuery.data && !selectedTeam
  const invalidRepository = !!searchParams.get('repositoryId') && !!repoQuery.data && selectedRepositoryId === 'all'
  const ready = !!selectedOrganization && !!teamQuery.data && !!repoQuery.data && !invalidTeam && !invalidRepository && requestedRange === timeRange

  // The URL is the source of truth. Restore only when navigation provides no filters.
  useEffect(() => {
    if (!orgQuery.data) return
    if (!hasUrlFilters) {
      let saved: Record<string, string> = {}
      try {
        const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
        if (value && typeof value === 'object') {
          saved = Object.fromEntries(Object.entries(value).filter(([key, item]) => FILTER_KEYS.includes(key as typeof FILTER_KEYS[number]) && typeof item === 'string'))
        }
      } catch { /* Storage may be disabled. The URL still works. */ }
      const org = organizations.find(org => String(org.id) === saved.organizationId) || organizations[0]
      updateFilters({ ...saved, organizationId: org ? String(org.id) : null, timeRange: saved.timeRange || '14d' }, true)
      return
    }
    const corrections: Record<string, string | null> = {}
    if (!organizationId && organizations.length) corrections.organizationId = String(organizations[0].id)
    if (invalidTeam) corrections.teamId = null
    if (invalidRepository) corrections.repositoryId = null
    if (requestedRange !== timeRange) corrections.timeRange = timeRange
    if (Object.keys(corrections).length) {
      updateFilters(corrections, true)
    } else if (ready) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(FILTER_KEYS.flatMap(key => searchParams.has(key) ? [[key, searchParams.get(key)]] : []))))
      } catch { /* Persistence is optional. */ }
    }
  }, [orgQuery.data, organizations, searchParams, hasUrlFilters, organizationId, invalidTeam, invalidRepository, requestedRange, timeRange, ready])

  const error = currentRefresh?.error || orgQuery.error?.message || teamQuery.error?.message || repoQuery.error?.message ||
    (organizationId && orgQuery.data && !selectedOrganization ? 'This organization is unavailable. Select another organization.' : null)

  const refreshData = async () => {
    const request = { scope: filterScope, pending: true, completedAt: currentRefresh?.completedAt ?? null, error: null }
    setRefresh(request)
    let refreshError: string | null = null
    try {
      const refreshedKeys: string[] = []
      await mutate(key => {
        if (typeof key !== 'string' || !key.startsWith('/api/')) return false
        const url = new URL(key, window.location.origin)
        const isFilterList = ['/api/organizations', teamEndpoint, repoEndpoint].includes(key)
        const isScopedMetric = (url.pathname.startsWith('/api/metrics/') || url.pathname.startsWith('/api/pull-requests/')) &&
          FILTER_KEYS.every(filter => (url.searchParams.get(filter) || '') === (searchParams.get(filter) || ''))
        if (isFilterList || isScopedMetric) refreshedKeys.push(key)
        return isFilterList || isScopedMetric
      })
      // SWR revalidation records fetch errors in cache instead of rejecting mutate().
      if (refreshedKeys.some(key => cache.get(key)?.error)) throw new Error('Dashboard refresh failed')
    } catch {
      refreshError = 'Some dashboard data could not be refreshed. Please retry.'
    }
    const completedAt = refreshError ? request.completedAt : new Date().toISOString()
    setRefresh(current => current === request ? { ...request, pending: false, completedAt, error: refreshError } : current)
  }

  return <TeamFilterContext.Provider value={{
    organizations, teams, repositories, selectedOrganization, selectedTeam, selectedRepositoryId,
    timeRange, loading: orgQuery.isLoading || teamQuery.isLoading || repoQuery.isLoading,
    ready, error, refreshing: currentRefresh?.pending ?? false, lastRefreshed: currentRefresh?.completedAt ?? null, refreshData,
    setSelectedOrganization: org => updateFilters({ organizationId: org ? String(org.id) : null, teamId: null, repositoryId: null }),
    setSelectedTeam: team => updateFilters({ teamId: team ? String(team.id) : null }),
    setSelectedRepositoryId: id => updateFilters({ repositoryId: id === 'all' ? null : id }),
    setTimeRange: range => updateFilters({ timeRange: range }),
  }}>{children}</TeamFilterContext.Provider>
}

export function useTeamFilter() {
  const context = useContext(TeamFilterContext)
  if (!context) throw new Error('useTeamFilter must be used within a TeamFilterProvider')
  return context
}

export function useTeamFilterParams() {
  const { selectedOrganization, selectedTeam, selectedRepositoryId, timeRange, ready } = useTeamFilter()
  if (!ready || !selectedOrganization) return ''
  const params = new URLSearchParams({ organizationId: String(selectedOrganization.id), timeRange })
  if (selectedTeam) params.set('teamId', String(selectedTeam.id))
  if (selectedRepositoryId !== 'all') params.set('repositoryId', selectedRepositoryId)
  return params.toString()
}
