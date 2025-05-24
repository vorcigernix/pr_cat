"use client";

import * as React from "react";
import { IconTrendingUp, IconTrendingDown, IconMinus, IconAlertTriangle, IconCheck, IconGitBranch } from "@tabler/icons-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type RepositoryInsight = {
  repositoryId: number;
  name: string;
  fullName: string;
  isTracked: boolean;
  hasData: boolean;
  metrics: {
    totalPRs: number;
    openPRs: number;
    avgCycleTime: number;
    avgPRSize: number;
    categorizationRate: number;
    activityScore: number;
    contributorCount: number;
    reviewCoverage: number;
    healthScore: number;
  };
  trends: {
    prVelocityTrend: 'up' | 'down' | 'stable';
    cycleTimeTrend: 'up' | 'down' | 'stable';
    qualityTrend: 'up' | 'down' | 'stable';
  };
};

type RepositoryInsightsResponse = {
  repositories: RepositoryInsight[];
  topPerformers: RepositoryInsight[];
  needsAttention: RepositoryInsight[];
  organizationAverages: {
    avgCycleTime: number;
    avgPRSize: number;
    avgCategorizationRate: number;
    avgHealthScore: number;
  };
};

export function RepositoryInsights() {
  const [insights, setInsights] = React.useState<RepositoryInsightsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/metrics/repository-insights');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch repository insights: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setInsights(data);
      } catch (error) {
        console.error("Failed to load repository insights:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <IconTrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <IconTrendingDown className="h-3 w-3 text-red-500" />;
      case 'stable':
        return <IconMinus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getHealthScoreBadge = (score: number) => {
    if (score >= 80) return <Badge variant="outline" className="text-green-600 border-green-200">Excellent</Badge>;
    if (score >= 60) return <Badge variant="outline" className="text-yellow-600 border-yellow-200">Good</Badge>;
    return <Badge variant="outline" className="text-red-600 border-red-200">Needs Attention</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repository Insights</CardTitle>
          <CardDescription>Loading repository analysis...</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="animate-pulse w-full space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repository Insights</CardTitle>
          <CardDescription>Error loading insights</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.repositories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repository Insights</CardTitle>
          <CardDescription>No repository data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No repositories found or no activity in the last 30 days.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Averages */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Averages</CardTitle>
          <CardDescription>Baseline metrics across all repositories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{insights.organizationAverages.avgHealthScore}</p>
              <p className="text-sm text-muted-foreground">Health Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{insights.organizationAverages.avgCycleTime}h</p>
              <p className="text-sm text-muted-foreground">Cycle Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{insights.organizationAverages.avgPRSize}</p>
              <p className="text-sm text-muted-foreground">PR Size</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{insights.organizationAverages.avgCategorizationRate}%</p>
              <p className="text-sm text-muted-foreground">Categorization</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers and Needs Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <IconCheck className="h-5 w-5 text-green-500" />
              <span>Top Performers</span>
            </CardTitle>
            <CardDescription>Repositories with excellent health scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.topPerformers.map((repo) => (
                <div key={repo.repositoryId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <IconGitBranch className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{repo.name}</p>
                      <p className="text-xs text-muted-foreground">{repo.metrics.totalPRs} PRs • {repo.metrics.contributorCount} contributors</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${getHealthScoreColor(repo.metrics.healthScore)}`}>
                      {repo.metrics.healthScore}
                    </span>
                    {getHealthScoreBadge(repo.metrics.healthScore)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <IconAlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Needs Attention</span>
            </CardTitle>
            <CardDescription>Repositories with improvement opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.needsAttention.length === 0 ? (
                <p className="text-sm text-muted-foreground">All repositories are performing well!</p>
              ) : (
                insights.needsAttention.map((repo) => (
                  <div key={repo.repositoryId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <IconGitBranch className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{repo.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {repo.metrics.reviewCoverage < 50 ? 'Low review coverage' : 'Low health score'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getHealthScoreColor(repo.metrics.healthScore)}`}>
                        {repo.metrics.healthScore}
                      </span>
                      {getHealthScoreBadge(repo.metrics.healthScore)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Repositories */}
      <Card>
        <CardHeader>
          <CardTitle>All Repositories</CardTitle>
          <CardDescription>Detailed metrics and trends for each repository</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.repositories.map((repo) => (
              <div 
                key={repo.repositoryId} 
                className={`p-4 border rounded-lg space-y-3 ${!repo.hasData ? 'opacity-50' : ''}`}
              >
                {/* Repository Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <IconGitBranch className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">{repo.name}</h3>
                      <p className="text-sm text-muted-foreground">{repo.fullName}</p>
                    </div>
                    {!repo.isTracked && (
                      <Badge variant="outline" className="text-muted-foreground">Not Tracked</Badge>
                    )}
                    {!repo.hasData && (
                      <Badge variant="outline" className="text-muted-foreground">No Activity</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      {repo.hasData ? (
                        <>
                          <p className={`text-lg font-bold ${getHealthScoreColor(repo.metrics.healthScore)}`}>
                            {repo.metrics.healthScore}
                          </p>
                          <p className="text-xs text-muted-foreground">Health Score</p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-bold text-muted-foreground">
                            --
                          </p>
                          <p className="text-xs text-muted-foreground">No Data</p>
                        </>
                      )}
                    </div>
                    {repo.hasData ? (
                      getHealthScoreBadge(repo.metrics.healthScore)
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">No Data</Badge>
                    )}
                  </div>
                </div>

                {/* Health Score Progress */}
                {repo.hasData ? (
                  <Progress value={repo.metrics.healthScore} className="h-2" />
                ) : (
                  <Progress value={0} className="h-2 opacity-30" />
                )}

                {/* Metrics Grid */}
                {repo.hasData ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-medium">{repo.metrics.totalPRs}</p>
                      <p className="text-xs text-muted-foreground">Total PRs</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{repo.metrics.openPRs}</p>
                      <p className="text-xs text-muted-foreground">Open PRs</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{repo.metrics.avgCycleTime}h</p>
                      <p className="text-xs text-muted-foreground">Cycle Time</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{repo.metrics.avgPRSize}</p>
                      <p className="text-xs text-muted-foreground">PR Size</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{repo.metrics.reviewCoverage}%</p>
                      <p className="text-xs text-muted-foreground">Review Coverage</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{repo.metrics.contributorCount}</p>
                      <p className="text-xs text-muted-foreground">Contributors</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <p className="text-sm">No pull request activity in the last 30 days</p>
                  </div>
                )}

                {/* Trends */}
                {repo.hasData && (
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(repo.trends.prVelocityTrend)}
                      <span className="text-muted-foreground">PR Velocity</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(repo.trends.cycleTimeTrend)}
                      <span className="text-muted-foreground">Cycle Time</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(repo.trends.qualityTrend)}
                      <span className="text-muted-foreground">Quality</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 