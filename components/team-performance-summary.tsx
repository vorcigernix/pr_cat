"use client"

import * as React from "react"
import { useTeamFilter } from "@/hooks/use-team-filter"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  IconUsers, 
  IconUser, 
  IconClock, 
  IconEye, 
  IconGitPullRequest,
  IconTrendingUp,
  IconTrendingDown,
  IconInfoCircle
} from "@tabler/icons-react"

type TeamMemberStats = {
  userId: string;
  name: string;
  prsCreated: number;
  prsReviewed: number;
  avgCycleTime: number;
  avgPRSize: number;
  reviewThoroughness: number;
  contributionScore: number;
};

type TeamPerformanceMetrics = {
  teamMembers: TeamMemberStats[];
  totalContributors: number;
  avgTeamCycleTime: number;
  avgTeamPRSize: number;
  collaborationIndex: number;
  reviewCoverage: number;
};

interface TeamPerformanceSummaryProps {
  className?: string;
}

export function TeamPerformanceSummary({ className = "" }: TeamPerformanceSummaryProps) {
  const { selectedTeam, selectedOrganization, timeRange } = useTeamFilter();
  const [teamMetrics, setTeamMetrics] = React.useState<TeamPerformanceMetrics | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch team metrics when team or time range changes
  React.useEffect(() => {
    if (selectedOrganization) {
      fetchTeamMetrics();
    }
  }, [selectedTeam, selectedOrganization, timeRange]);

  const fetchTeamMetrics = async () => {
    if (!selectedOrganization) {
      setTeamMetrics(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch team performance metrics
      const params = new URLSearchParams({
        organizationId: selectedOrganization.id.toString(),
        timeRange,
      });

      if (selectedTeam) {
        params.append('teamId', selectedTeam.id.toString());
      }

      const response = await fetch(`/api/metrics/team-performance?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch team metrics: ${response.status} ${response.statusText}`);
      }

      const data: TeamPerformanceMetrics = await response.json();
      
      // If a specific team is selected, filter to only team members
      if (selectedTeam) {
        // We would need team member user IDs for filtering
        // For now, we'll assume the API handles team filtering
        setTeamMetrics(data);
      } else {
        // Organization-wide metrics
        setTeamMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch team metrics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load team performance data');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedOrganization) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert>
            <IconInfoCircle className="h-4 w-4" />
            <AlertDescription>
              Select an organization to view team performance metrics.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
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
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!teamMetrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUsers className="h-5 w-5" />
            {selectedTeam ? `${selectedTeam.name} Performance` : "Team Performance"}
          </CardTitle>
          <CardDescription>
            No performance data available for the selected {timeRange} period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <IconUsers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No activity found for the selected time period.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTimeRangeDisplay = () => {
    switch (timeRange) {
      case '7d': return 'Last Week';
      case '14d': return 'Last 2 Weeks';
      case '30d': return 'Last Month';
      case '90d': return 'Last Quarter';
      default: return timeRange;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconUsers className="h-5 w-5" />
          {selectedTeam ? `${selectedTeam.name} Performance` : "Organization Performance"}
        </CardTitle>
        <CardDescription>
          Team retrospective metrics for {getTimeRangeDisplay().toLowerCase()}
          {selectedTeam && ` • ${selectedTeam.member_count || 'Unknown'} members`}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Contributors</p>
                <p className="text-2xl font-bold">{teamMetrics.totalContributors}</p>
              </div>
              <IconUser className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Cycle Time</p>
                <p className="text-2xl font-bold">{Math.round(teamMetrics.avgTeamCycleTime * 10) / 10}h</p>
              </div>
              <IconClock className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Collaboration Index</p>
                <p className="text-2xl font-bold">{Math.round(teamMetrics.collaborationIndex * 10) / 10}</p>
              </div>
              <IconEye className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Review Coverage</p>
                <p className="text-2xl font-bold">{teamMetrics.reviewCoverage}%</p>
              </div>
              <IconGitPullRequest className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Top Contributors */}
        {teamMetrics.teamMembers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Top Contributors ({getTimeRangeDisplay()})
            </h3>
            {teamMetrics.teamMembers.slice(0, 3).map((member, index) => (
              <div key={member.userId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                      {index + 1}
                    </Badge>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://avatars.githubusercontent.com/u/${member.userId}?v=4`} />
                      <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Score: {member.contributionScore}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-xs">
                  <div className="text-center">
                    <p className="font-medium">{member.prsCreated}</p>
                    <p className="text-muted-foreground">PRs</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{member.prsReviewed}</p>
                    <p className="text-muted-foreground">Reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{member.avgCycleTime}h</p>
                    <p className="text-muted-foreground">Cycle</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center space-x-1">
                      <p className="font-medium">{member.reviewThoroughness}%</p>
                      {member.reviewThoroughness > 100 ? (
                        <IconTrendingUp className="h-3 w-3 text-green-500" />
                      ) : member.reviewThoroughness < 50 ? (
                        <IconTrendingDown className="h-3 w-3 text-orange-500" />
                      ) : null}
                    </div>
                    <p className="text-muted-foreground">Review</p>
                  </div>
                </div>
              </div>
            ))}
            
            {teamMetrics.teamMembers.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                And {teamMetrics.teamMembers.length - 3} more contributors...
              </p>
            )}
          </div>
        )}

        {/* Team Retrospective Insights */}
        {selectedTeam && (
          <Card className="@container/card mt-6 bg-gradient-to-t from-gray-50/30 to-white dark:from-card/10 dark:to-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Team Retrospective Insights</CardTitle>
              <CardDescription>
                {getTimeRangeDisplay()} performance analysis for retrospective discussions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2"></div>
                <div>
                  <p className="font-medium mb-1">Focus Area</p>
                  <p className="text-muted-foreground">
                    This team's {getTimeRangeDisplay().toLowerCase()} performance shows 
                    {teamMetrics.avgTeamCycleTime > 48 ? " opportunities to improve delivery speed" : " efficient delivery cycles"}.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2"></div>
                <div>
                  <p className="font-medium mb-1">Collaboration</p>
                  <p className="text-muted-foreground">
                    The team's collaboration index of {Math.round(teamMetrics.collaborationIndex * 10) / 10} 
                    {teamMetrics.collaborationIndex > 1.5 ? " indicates strong peer review practices" : " suggests more cross-team reviews could help"}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
