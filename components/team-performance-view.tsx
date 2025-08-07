"use client"

import * as React from "react"
import { IconUsers, IconUser, IconCode, IconGitPullRequest, IconMessageCircle } from "@tabler/icons-react"
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

type MemberMetrics = {
  userId: string;
  name: string;
  email: string;
  image?: string;
  prsCreated: number;
  prsReviewed: number;
  commentsGiven: number;
  avgTimeToMerge: number;
  codeChurn: number;
};

export function TeamPerformanceView() {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = React.useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null);
  const [memberMetrics, setMemberMetrics] = React.useState<MemberMetrics[]>([]);
  const [organizations, setOrganizations] = React.useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [metricsLoading, setMetricsLoading] = React.useState(false);

  // Fetch organizations on mount
  React.useEffect(() => {
    fetchOrganizations();
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
    if (!selectedTeam || !selectedTeam.members) return;
    
    try {
      setMetricsLoading(true);
      
      // For now, we'll generate mock metrics for team members
      // In a real implementation, this would fetch actual PR/commit data
      const metrics: MemberMetrics[] = selectedTeam.members.map(member => ({
        userId: member.user_id,
        name: member.user?.name || 'Unknown',
        email: member.user?.email || '',
        image: member.user?.image || undefined,
        prsCreated: Math.floor(Math.random() * 20) + 5,
        prsReviewed: Math.floor(Math.random() * 30) + 10,
        commentsGiven: Math.floor(Math.random() * 50) + 20,
        avgTimeToMerge: Math.floor(Math.random() * 48) + 12,
        codeChurn: Math.floor(Math.random() * 30) + 10,
      }));
      
      setMemberMetrics(metrics);
    } catch (error) {
      console.error('Failed to fetch team metrics:', error);
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
                View metrics and performance data for your teams
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

      {/* Team Overview */}
      {selectedTeam && (
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
            {/* Team Members */}
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {selectedTeam && memberMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Individual contribution metrics for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metricsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Member</th>
                        <th className="text-center p-2">
                          <div className="flex flex-col items-center">
                            <IconGitPullRequest className="h-4 w-4 mb-1" />
                            <span className="text-xs">PRs Created</span>
                          </div>
                        </th>
                        <th className="text-center p-2">
                          <div className="flex flex-col items-center">
                            <IconCode className="h-4 w-4 mb-1" />
                            <span className="text-xs">PRs Reviewed</span>
                          </div>
                        </th>
                        <th className="text-center p-2">
                          <div className="flex flex-col items-center">
                            <IconMessageCircle className="h-4 w-4 mb-1" />
                            <span className="text-xs">Comments</span>
                          </div>
                        </th>
                        <th className="text-center p-2">
                          <div className="flex flex-col items-center">
                            <span className="text-xs">Avg Time to Merge</span>
                          </div>
                        </th>
                        <th className="text-center p-2">
                          <div className="flex flex-col items-center">
                            <span className="text-xs">Code Churn</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberMetrics.map(member => (
                        <tr key={member.userId} className="border-b">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.image} />
                                <AvatarFallback>
                                  {member.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center p-2">
                            <Badge variant="outline">{member.prsCreated}</Badge>
                          </td>
                          <td className="text-center p-2">
                            <Badge variant="outline">{member.prsReviewed}</Badge>
                          </td>
                          <td className="text-center p-2">
                            <Badge variant="outline">{member.commentsGiven}</Badge>
                          </td>
                          <td className="text-center p-2">
                            <span className="text-sm">{member.avgTimeToMerge}h</span>
                          </td>
                          <td className="text-center p-2">
                            <span className="text-sm">{member.codeChurn}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {selectedTeam && memberMetrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total PRs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {memberMetrics.reduce((sum, m) => sum + m.prsCreated, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Created this month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {memberMetrics.reduce((sum, m) => sum + m.prsReviewed, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total reviews given</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Merge Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(memberMetrics.reduce((sum, m) => sum + m.avgTimeToMerge, 0) / memberMetrics.length)}h
              </div>
              <p className="text-xs text-muted-foreground">Hours to merge</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Team Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {memberMetrics.reduce((sum, m) => sum + m.commentsGiven, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total comments</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}