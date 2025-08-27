"use client"

import * as React from "react"
import { useTeamFilter, type TimeRange } from "@/hooks/use-team-filter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  IconUsers, 
  IconCalendar, 
  IconBuilding, 
  IconRefresh,
  IconInfoCircle
} from "@tabler/icons-react"

interface TeamDashboardControlsProps {
  title?: string;
  description?: string;
  showOrganizationSelector?: boolean;
  className?: string;
}

// Retrospective-focused time range options
const timeRangeOptions = [
  { value: "7d" as TimeRange, label: "Last Week", description: "7 days - Sprint retrospective" },
  { value: "14d" as TimeRange, label: "Last 2 Weeks", description: "14 days - Bi-weekly retrospective" },
  { value: "30d" as TimeRange, label: "Last Month", description: "30 days - Monthly overview" },
  { value: "90d" as TimeRange, label: "Last Quarter", description: "90 days - Quarterly trends" },
];

export function TeamDashboardControls({
  title = "Team Dashboard",
  description = "View team performance and retrospective data",
  showOrganizationSelector = true,
  className = "",
}: TeamDashboardControlsProps) {
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
      const teamMemberText = selectedTeam.member_count 
        ? `${selectedTeam.member_count} members` 
        : "members unknown";
      return {
        name: selectedTeam.name,
        info: teamMemberText,
        color: selectedTeam.color,
      };
    }
    return {
      name: "Organization-wide",
      info: "All teams",
      color: null,
    };
  };

  const selectedTimeRange = timeRangeOptions.find(option => option.value === timeRange);
  const teamInfo = getTeamDisplayInfo();

  if (loading && !organizations.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert>
            <IconInfoCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-4"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? "Refreshing..." : "Retry"}
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconUsers className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <IconRefresh className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-end">
          {/* Organization Selector */}
          {showOrganizationSelector && organizations.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <IconBuilding className="h-4 w-4" />
                Organization
              </label>
              <Select
                value={selectedOrganization?.id.toString()}
                onValueChange={(value) => {
                  const org = organizations.find(o => o.id.toString() === value);
                  setSelectedOrganization(org || null);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Team Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <IconUsers className="h-4 w-4" />
              Team Focus
            </label>
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
              <SelectTrigger className="w-[200px]">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {teamInfo.color && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: teamInfo.color }}
                      />
                    )}
                    <span className="truncate">{teamInfo.name}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center justify-between w-full">
                    <span>Organization-wide</span>
                    <Badge variant="secondary" className="ml-2">All teams</Badge>
                  </div>
                </SelectItem>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {team.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                        )}
                        <span className="truncate">{team.name}</span>
                      </div>
                      {team.member_count && (
                        <Badge variant="outline" className="ml-2">
                          {team.member_count}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Range Selector for Retrospectives */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <IconCalendar className="h-4 w-4" />
              Retrospective Period
            </label>
            <Select
              value={timeRange}
              onValueChange={(value: TimeRange) => setTimeRange(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue>
                  <span>{selectedTimeRange?.label || "Select period"}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current Selection Summary */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <IconUsers className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Focus:</span>
              <span>{teamInfo.name}</span>
              {teamInfo.info !== teamInfo.name && (
                <Badge variant="outline" className="text-xs">
                  {teamInfo.info}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <IconCalendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Period:</span>
              <span>{selectedTimeRange?.label || timeRange}</span>
            </div>
          </div>
        </div>

        {/* Team Management Hint */}
        {teams.length === 0 && selectedOrganization && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <IconInfoCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">No teams configured yet</p>
                <p className="mt-1">
                  Create teams in Settings to enable team-focused retrospectives and performance tracking.
                  <Button
                    variant="link"
                    className="h-auto p-0 ml-1 text-blue-700"
                    onClick={() => window.location.href = '/dashboard/settings'}
                  >
                    Go to Settings →
                  </Button>
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
