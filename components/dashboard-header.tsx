"use client"

import * as React from "react"
import { useTeamFilter, type TimeRange } from "@/hooks/use-team-filter"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  IconUsers, 
  IconCalendar, 
  IconBuilding, 
  IconRefresh
} from "@tabler/icons-react"

interface DashboardHeaderProps {
  pageTitle?: string;
}

// Retrospective-focused time range options
const timeRangeOptions = [
  { value: "7d" as TimeRange, label: "Last Week", shortLabel: "7d" },
  { value: "14d" as TimeRange, label: "Last 2 Weeks", shortLabel: "14d" },
  { value: "30d" as TimeRange, label: "Last Month", shortLabel: "30d" },
  { value: "90d" as TimeRange, label: "Last Quarter", shortLabel: "90d" },
];

export function DashboardHeader({ pageTitle = "Dashboard" }: DashboardHeaderProps) {
  const {
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
  } = useTeamFilter();

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  const getTeamDisplayInfo = () => {
    if (selectedTeam) {
      return {
        name: selectedTeam.name,
        color: selectedTeam.color,
        isTeamSelected: true,
      };
    }
    return {
      name: "All Teams",
      color: null,
      isTeamSelected: false,
    };
  };

  const selectedTimeRange = timeRangeOptions.find(option => option.value === timeRange);
  const teamInfo = getTeamDisplayInfo();

  return (
    <header className="flex h-[--header-height] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[data-collapsible=icon]/sidebar-wrapper:h-[--header-height]">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        {/* Left side - Logo and Title */}
        <div className="flex items-center">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-2xl font-semibold ml-4 py-2">{pageTitle}</h1>
        </div>

        {/* Center - Team Filtering Controls */}
        <div className="flex items-center gap-3">
          {loading && !organizations.length ? (
            <>
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-24" />
            </>
          ) : error ? (
            <div className="text-sm text-destructive">Error loading teams</div>
          ) : (
            <>
              {/* Organization Selector (only show if multiple orgs) */}
              {organizations.length > 1 && (
                <Select
                  value={selectedOrganization?.id.toString()}
                  onValueChange={(value) => {
                    const org = organizations.find(o => o.id.toString() === value);
                    setSelectedOrganization(org || null);
                  }}
                >
                  <SelectTrigger className="w-[160px] h-9">
                    <div className="flex items-center gap-1">
                      <IconBuilding className="h-4 w-4" />
                      <SelectValue placeholder="Organization" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Team Selector */}
              <Select
                value={selectedTeam?.id.toString() || "all"}
                onValueChange={(value) => {
                  if (value === "all") {
                    setSelectedTeam(null);
                  } else {
                    const team = teams.find(t => t.id.toString() === value);
                    setSelectedTeam(team || null);
                  }
                }}
                disabled={!selectedOrganization}
              >
                <SelectTrigger className="w-[180px] h-9">
                  <div className="flex items-center gap-2">
                    <IconUsers className="h-4 w-4" />
                    <div className="flex items-center gap-1">
                      {teamInfo.color && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: teamInfo.color }}
                        />
                      )}
                      <span className="truncate">{teamInfo.name}</span>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center justify-between w-full">
                      <span>All Teams</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Organization
                      </Badge>
                    </div>
                  </SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          {team.color && (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: team.color }}
                            />
                          )}
                          <span className="truncate">{team.name}</span>
                        </div>
                        {team.member_count && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {team.member_count}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Time Range Selector */}
              <Select
                value={timeRange}
                onValueChange={(value: TimeRange) => setTimeRange(value)}
              >
                <SelectTrigger className="w-[130px] h-9">
                  <div className="flex items-center gap-1">
                    <IconCalendar className="h-4 w-4" />
                    <span>{selectedTimeRange?.shortLabel || timeRange}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.value === "7d" && "Sprint retrospective"}
                          {option.value === "14d" && "Bi-weekly review"}  
                          {option.value === "30d" && "Monthly overview"}
                          {option.value === "90d" && "Quarterly trends"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* Right side - Actions and Theme Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9"
          >
            <IconRefresh className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
