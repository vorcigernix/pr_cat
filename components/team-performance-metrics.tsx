"use client"

import * as React from "react"
import { IconTrendingUp, IconTrendingDown, IconUser, IconGitPullRequest, IconEye, IconClock } from "@tabler/icons-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TeamSelector } from "@/components/team-selector"

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

export function TeamPerformanceMetrics() {
  const [metrics, setMetrics] = React.useState<TeamPerformanceMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchData();
  }, [selectedTeamId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build API URL with team filter
      let url = '/api/metrics/team-performance';
      if (selectedTeamId) {
        // Get team repositories
        const savedTeams = localStorage.getItem('prcat-teams');
        if (savedTeams) {
          const teams = JSON.parse(savedTeams);
          const team = teams.find((t: any) => t.id === selectedTeamId);
          if (team && team.repositories.length > 0) {
            url += `?repositories=${team.repositories.join(',')}`;
          }
        }
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch team metrics: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error("Failed to load team performance data:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = () => {
    if (!selectedTeamId) return "Organization";
    
    const savedTeams = localStorage.getItem('prcat-teams');
    if (savedTeams) {
      const teams = JSON.parse(savedTeams);
      const team = teams.find((t: any) => t.id === selectedTeamId);
      return team?.name || "Unknown Team";
    }
    return "Unknown Team";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <TeamSelector selectedTeamId={selectedTeamId} onTeamSelect={setSelectedTeamId} />
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>Loading team metrics...</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center">
            <div className="animate-pulse w-full space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <TeamSelector selectedTeamId={selectedTeamId} onTeamSelect={setSelectedTeamId} />
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>Error loading metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
            <button 
              onClick={() => fetchData()} 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics || metrics.teamMembers.length === 0) {
    return (
      <div className="space-y-6">
        <TeamSelector selectedTeamId={selectedTeamId} onTeamSelect={setSelectedTeamId} />
        <Card>
          <CardHeader>
            <CardTitle>{getTeamName()} Performance</CardTitle>
            <CardDescription>No team data available</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {selectedTeamId 
                ? "No activity found for this team's repositories in the last 30 days."
                : "No team activity found in the last 30 days."
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Selector */}
      <TeamSelector selectedTeamId={selectedTeamId} onTeamSelect={setSelectedTeamId} />
      
      {/* Team Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contributors</CardTitle>
            <IconUser className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalContributors}</div>
            <p className="text-xs text-muted-foreground">
              {selectedTeamId ? `${getTeamName()} members` : "Organization-wide"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cycle Time</CardTitle>
            <IconClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgTeamCycleTime}h</div>
            <p className="text-xs text-muted-foreground">From creation to merge</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collaboration Index</CardTitle>
            <IconEye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.collaborationIndex}</div>
            <p className="text-xs text-muted-foreground">Reviews per PR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Review Coverage</CardTitle>
            <IconGitPullRequest className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.reviewCoverage}%</div>
            <p className="text-xs text-muted-foreground">PRs with reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Contributors */}
      <Card>
        <CardHeader>
          <CardTitle>{getTeamName()} Contributors</CardTitle>
          <CardDescription>
            {selectedTeamId 
              ? `Performance metrics for ${getTeamName()} members based on their repository contributions`
              : "Performance metrics for all organization contributors"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.teamMembers.slice(0, 10).map((member, index) => (
              <div key={member.userId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://avatars.githubusercontent.com/u/${member.userId}?v=4`} />
                      <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Contribution Score: {member.contributionScore}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <p className="font-medium">{member.prsCreated}</p>
                    <p className="text-xs text-muted-foreground">PRs Created</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="font-medium">{member.prsReviewed}</p>
                    <p className="text-xs text-muted-foreground">Reviews Given</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="font-medium">{member.avgCycleTime}h</p>
                    <p className="text-xs text-muted-foreground">Avg Cycle Time</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="font-medium">{member.avgPRSize}</p>
                    <p className="text-xs text-muted-foreground">Avg PR Size</p>
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
                    <p className="text-xs text-muted-foreground">Review Ratio</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Team Insights */}
          {selectedTeamId && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Team Insights</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">
                    <strong>Repository Focus:</strong> This team's metrics are calculated based on their owned repositories, 
                    providing insights specific to their codebase and workflows.
                  </p>
                </div>
                <div>
                  <p className="text-blue-700">
                    <strong>Cross-team Contributions:</strong> Contributors may work across teams. 
                    These metrics show their performance specifically within this team's repository scope.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 