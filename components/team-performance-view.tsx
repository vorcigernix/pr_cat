"use client"

import * as React from "react"
import { IconUsers, IconUser, IconCode, IconGitPullRequest, IconMessageCircle, IconTrendingUp, IconTrendingDown, IconEye, IconClock } from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Team = {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  members?: TeamMember[];
  member_count?: number;
};

type TeamMember = {
  id: number;
  team_id: number;
  user_id: string;
  role: 'member' | 'lead' | 'admin';
  joined_at: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

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



export function TeamPerformanceView() {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = React.useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null);
  const [teamMetrics, setTeamMetrics] = React.useState<TeamPerformanceMetrics | null>(null);
  const [organizations, setOrganizations] = React.useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [metricsLoading, setMetricsLoading] = React.useState(false);
  const [repositories, setRepositories] = React.useState<any[]>([]);

  // Fetch organizations and repositories on mount
  React.useEffect(() => {
    fetchOrganizations();
    fetchRepositories();
  }, []);

  // Fetch teams when organization changes
  React.useEffect(() => {
    if (selectedOrgId) {
      fetchTeams();
    }
  }, [selectedOrgId]);

  // Fetch team details and metrics when team changes
  React.useEffect(() => {
    if (selectedTeamId) {
      fetchTeamDetails();
      fetchTeamMetrics();
    }
  }, [selectedTeamId]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/organizations');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch organizations');
      }
      
      const data = await response.json();
      console.log('Fetched organizations:', data);
      
      setOrganizations(data);
      
      if (data.length > 0) {
        setSelectedOrgId(data[0].id);
      } else {
        setError('No organizations found. Please ensure you have access to at least one organization.');
        setLoading(false); // Stop loading if no organizations
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load organizations');
      setLoading(false); // Stop loading on error
    }
  };

  const fetchTeams = async () => {
    if (!selectedOrgId) {
      setLoading(false);
      return;
    }
    
    try {
      // Don't set loading here since fetchOrganizations already set it
      setError(null);
      
      console.log('Fetching teams for organization:', selectedOrgId);
      const response = await fetch(`/api/organizations/${selectedOrgId}/teams`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch teams (${response.status})`);
      }
      
      const data = await response.json();
      console.log('Fetched teams:', data);
      
      setTeams(data);
      
      // Auto-select first team if available
      if (data.length > 0 && !selectedTeamId) {
        setSelectedTeamId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      setError(error instanceof Error ? error.message : 'Failed to load teams. Please check your settings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepositories = async () => {
    try {
      const response = await fetch('/api/repositories');
      if (response.ok) {
        const data = await response.json();
        setRepositories(data.repositories || []);
      }
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
    }
  };

  const fetchTeamDetails = async () => {
    if (!selectedOrgId || !selectedTeamId) return;
    
    try {
      const response = await fetch(`/api/organizations/${selectedOrgId}/teams/${selectedTeamId}`);
      
      if (response.ok) {
        const data = await response.json();
        setSelectedTeam(data);
      }
    } catch (error) {
      console.error('Failed to fetch team details:', error);
    }
  };

  const fetchTeamMetrics = async () => {
    if (!selectedTeam || !selectedTeam.members) {
      setTeamMetrics(null);
      return;
    }
    
    try {
      setMetricsLoading(true);
      setError(null);
      
      // Get team member user IDs
      const teamMemberIds = selectedTeam.members.map(member => member.user_id);
      
      // Fetch performance metrics for all repositories 
      const response = await fetch('/api/metrics/team-performance');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch team metrics: ${response.status} ${response.statusText}`);
      }
      
      const data: TeamPerformanceMetrics = await response.json();
      
      // Filter metrics to only include team members
      const filteredTeamMembers = data.teamMembers.filter(member => 
        teamMemberIds.includes(member.userId)
      );
      
      // Calculate team-level metrics for this specific team
      const teamMetricsData: TeamPerformanceMetrics = {
        teamMembers: filteredTeamMembers,
        totalContributors: filteredTeamMembers.length,
        avgTeamCycleTime: filteredTeamMembers.length > 0 
          ? filteredTeamMembers.reduce((sum, member) => sum + member.avgCycleTime, 0) / filteredTeamMembers.length
          : 0,
        avgTeamPRSize: filteredTeamMembers.length > 0
          ? filteredTeamMembers.reduce((sum, member) => sum + member.avgPRSize, 0) / filteredTeamMembers.length  
          : 0,
        collaborationIndex: filteredTeamMembers.length > 0
          ? filteredTeamMembers.reduce((sum, member) => sum + member.prsReviewed, 0) / filteredTeamMembers.reduce((sum, member) => sum + member.prsCreated, 0) || 0
          : 0,
        reviewCoverage: data.reviewCoverage // Use organization-wide review coverage for context
      };
      
      setTeamMetrics(teamMetricsData);
    } catch (error) {
      console.error('Failed to fetch team metrics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load team performance data');
    } finally {
      setMetricsLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'lead':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return '👑';
      case 'lead':
        return '⭐';
      default:
        return '👤';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUsers className="h-5 w-5" />
            Teams
          </CardTitle>
          <CardDescription>Manage and view performance metrics for your teams</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <IconUsers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No teams have been created yet for this organization
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Teams are groups of people working together. Go to Settings → Teams to create your first team and add members.
            </p>
            <Button
              onClick={() => window.location.href = '/dashboard/settings'}
            >
              Go to Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconUsers className="h-5 w-5" />
                Team Performance
              </CardTitle>
              <CardDescription>
                View performance metrics and contributions for your teams
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {organizations.length > 1 && (
                <Select
                  value={selectedOrgId?.toString()}
                  onValueChange={(value) => setSelectedOrgId(parseInt(value))}
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
              )}
              <Select
                value={selectedTeamId?.toString()}
                onValueChange={(value) => setSelectedTeamId(parseInt(value))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      <div className="flex items-center gap-2">
                        {team.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                        )}
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Team Performance Metrics */}
      {selectedTeam && teamMetrics && (
        <>
          {/* Team Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Contributors</CardTitle>
                <IconUser className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamMetrics.totalContributors}</div>
                <p className="text-xs text-muted-foreground">
                  {selectedTeam.name} team members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Cycle Time</CardTitle>
                <IconClock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(teamMetrics.avgTeamCycleTime * 10) / 10}h</div>
                <p className="text-xs text-muted-foreground">From creation to merge</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collaboration Index</CardTitle>
                <IconEye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(teamMetrics.collaborationIndex * 10) / 10}</div>
                <p className="text-xs text-muted-foreground">Reviews per PR</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Org Review Coverage</CardTitle>
                <IconGitPullRequest className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamMetrics.reviewCoverage}%</div>
                <p className="text-xs text-muted-foreground">Organization-wide</p>
              </CardContent>
            </Card>
          </div>

          {/* Individual Contributors */}
          <Card>
            <CardHeader>
              <CardTitle>{selectedTeam.name} Contributors</CardTitle>
              <CardDescription>
                Performance metrics for {selectedTeam.name} team members based on their contributions across all repositories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : teamMetrics.teamMembers.length === 0 ? (
                <div className="text-center py-8">
                  <IconUsers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No activity found for this team's members in the last 30 days.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamMetrics.teamMembers.map((member, index) => (
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
              )}
              
              {/* Team Insights */}
              {selectedTeam && teamMetrics.teamMembers.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Team Insights</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700">
                        <strong>Cross-Repository Performance:</strong> This team's metrics include contributions 
                        across all repositories in your organization, providing a comprehensive view of team productivity.
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-700">
                        <strong>Team Collaboration:</strong> These metrics show how well team members collaborate 
                        with each other and the broader organization through code reviews and contributions.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Team Overview when no metrics available */}
      {selectedTeam && !teamMetrics && !metricsLoading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selectedTeam.color && (
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: selectedTeam.color }}
                    />
                  )}
                  {selectedTeam.name}
                </CardTitle>
                {selectedTeam.description && (
                  <CardDescription>{selectedTeam.description}</CardDescription>
                )}
              </div>
              <Badge variant="outline">
                {selectedTeam.members?.length || 0} members
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Team Members</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedTeam.members?.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Avatar>
                      <AvatarImage src={member.user?.image || undefined} />
                      <AvatarFallback>
                        {member.user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{member.user?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                    </div>
                    <Badge variant={getRoleColor(member.role)}>
                      {getRoleIcon(member.role)} {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-800 text-sm">
                  No performance data available for this team yet. Team members need to create pull requests 
                  and reviews to generate performance metrics.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}