"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { IconBrandGithub, IconGitPullRequest, IconAlertTriangle } from "@tabler/icons-react";

type Repository = {
  id: number;
  name: string;
  fullName: string;
  language: string;
  isPrivate: boolean;
  stars: number;
  createdAt: string;
};

type RepositoryMetrics = {
  id: number;
  name: string;
  prCount: number;
  totalCycleTime: number;
  avgCycleTime: number;
  avgPRSize: number;
  healthScore: number;
  mergedPRs: number;
  openPRs: number;
  closedPRs: number;
  bottlenecks: {
    reviewWait: number;
    deployWait: number;
  };
};

export function RepositoryInsights() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [pullRequests, setPullRequests] = useState<any[]>([]);
  const [repoMetrics, setRepoMetrics] = useState<RepositoryMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // In a real app, these would be API calls
        const reposData = await import("@/app/dashboard/repositories.json");
        const prsData = await import("@/app/dashboard/pull-requests.json");
        
        setRepositories(reposData.default);
        setPullRequests(prsData.default);
      } catch (error) {
        console.error("Failed to load repository data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (repositories.length > 0 && pullRequests.length > 0) {
      calculateRepoMetrics();
    }
  }, [repositories, pullRequests]);

  const calculateRepoMetrics = () => {
    const metrics = repositories.map(repo => {
      // Filter PRs for this repository
      const repoPRs = pullRequests.filter(pr => pr.repository.id === repo.id);
      
      if (repoPRs.length === 0) {
        return {
          id: repo.id,
          name: repo.name,
          prCount: 0,
          totalCycleTime: 0,
          avgCycleTime: 0,
          avgPRSize: 0,
          healthScore: 0,
          mergedPRs: 0,
          openPRs: 0,
          closedPRs: 0,
          bottlenecks: {
            reviewWait: 0,
            deployWait: 0
          }
        };
      }
      
      // Count PRs by status
      const mergedPRs = repoPRs.filter(pr => pr.status === "merged").length;
      const openPRs = repoPRs.filter(pr => pr.status === "open").length;
      const closedPRs = repoPRs.filter(pr => pr.status === "closed").length;
      
      // Calculate metrics from merged PRs only
      const mergedPRsData = repoPRs.filter(pr => pr.status === "merged");
      
      const totalCycleTime = mergedPRsData.reduce((sum, pr) => sum + pr.cycleTime, 0);
      const avgCycleTime = mergedPRsData.length ? totalCycleTime / mergedPRsData.length : 0;
      const avgPRSize = mergedPRsData.length
        ? mergedPRsData.reduce((sum, pr) => sum + (pr.linesAdded + pr.linesRemoved), 0) / mergedPRsData.length
        : 0;
      
      // Calculate bottlenecks
      const avgReviewWait = mergedPRsData.length
        ? mergedPRsData.reduce((sum, pr) => sum + (new Date(pr.reviewStartedAt).getTime() - new Date(pr.createdAt).getTime()), 0) 
          / mergedPRsData.length / (1000 * 60 * 60) // Convert to hours
        : 0;
        
      const avgDeployWait = mergedPRsData.length
        ? mergedPRsData.reduce((sum, pr) => sum + (new Date(pr.deployedAt).getTime() - new Date(pr.mergedAt).getTime()), 0)
          / mergedPRsData.length / (1000 * 60 * 60) // Convert to hours
        : 0;
      
      // Calculate health score (0-100)
      // Factors: PR throughput, cycle time, PR size
      const healthScore = mergedPRsData.length
        ? Math.min(100, Math.round(
            (mergedPRsData.length * 5) + // More PRs is better (up to 20)
            (Math.min(20, 40 - avgCycleTime)) + // Lower cycle time is better
            (Math.min(20, 300 / Math.max(50, avgPRSize))) + // Smaller PRs are better
            (Math.min(20, 15 / Math.max(1, avgReviewWait))) + // Faster reviews are better
            (Math.min(20, 10 / Math.max(1, avgDeployWait))) // Faster deployments are better
          ))
        : 0;
      
      return {
        id: repo.id,
        name: repo.name,
        prCount: repoPRs.length,
        totalCycleTime: parseFloat(totalCycleTime.toFixed(1)),
        avgCycleTime: parseFloat(avgCycleTime.toFixed(1)),
        avgPRSize: Math.round(avgPRSize),
        healthScore,
        mergedPRs,
        openPRs,
        closedPRs,
        bottlenecks: {
          reviewWait: parseFloat(avgReviewWait.toFixed(1)),
          deployWait: parseFloat(avgDeployWait.toFixed(1))
        }
      };
    });
    
    // Sort by health score (highest first)
    metrics.sort((a, b) => b.healthScore - a.healthScore);
    
    setRepoMetrics(metrics);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getPRStatusChartData = (repo: RepositoryMetrics) => {
    return [
      { name: "Merged", value: repo.mergedPRs, color: "#22c55e" },
      { name: "Open", value: repo.openPRs, color: "#3b82f6" },
      { name: "Closed", value: repo.closedPRs, color: "#ef4444" },
    ];
  };

  const getBottleneckData = (repos: RepositoryMetrics[]) => {
    // Only show top 4 repos
    const topRepos = repos.slice(0, 4);
    
    return [
      {
        name: "Review Wait Time (hrs)",
        data: topRepos.map(repo => ({
          name: repo.name,
          value: repo.bottlenecks.reviewWait
        }))
      },
      {
        name: "Deploy Wait Time (hrs)",
        data: topRepos.map(repo => ({
          name: repo.name,
          value: repo.bottlenecks.deployWait
        }))
      }
    ];
  };

  if (loading) {
    return (
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>Repository Insights</CardTitle>
          <CardDescription>Loading repository data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] animate-pulse bg-muted"></div>
        </CardContent>
      </Card>
    );
  }

  // Get bottleneck data for visualization
  const bottleneckData = getBottleneckData(repoMetrics);

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <CardTitle>Repository Insights</CardTitle>
        <CardDescription>Performance metrics across repositories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {repoMetrics.slice(0, 4).map(repo => (
            <Card key={repo.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <IconBrandGithub size={20} />
                    <CardTitle className="text-base">{repo.name}</CardTitle>
                  </div>
                  <CardDescription>{repositories.find(r => r.id === repo.id)?.language}</CardDescription>
                </div>
                <Badge className={getHealthScoreColor(repo.healthScore)}>
                  Health: {repo.healthScore}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <IconGitPullRequest size={16} />
                      <span className="text-sm font-medium">Pull Requests</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total</div>
                        <div className="text-xl font-semibold">{repo.prCount}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg. Cycle</div>
                        <div className="text-xl font-semibold">{repo.avgCycleTime} hrs</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getPRStatusChartData(repo)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={30}
                          fill="#8884d8"
                        >
                          {getPRStatusChartData(repo).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <IconAlertTriangle size={16} />
                    <span className="text-sm font-medium">Bottlenecks</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Review Wait</span>
                        <span>{repo.bottlenecks.reviewWait} hrs</span>
                      </div>
                      <Progress value={Math.min(100, (repo.bottlenecks.reviewWait / 24) * 100)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Deploy Wait</span>
                        <span>{repo.bottlenecks.deployWait} hrs</span>
                      </div>
                      <Progress value={Math.min(100, (repo.bottlenecks.deployWait / 12) * 100)} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Bottleneck Analysis Section */}
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-semibold">Workflow Bottlenecks</h3>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Wait Times Across Repositories</CardTitle>
              <CardDescription>
                Identifying stages where work gets delayed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p>Wait times represent periods when work is not actively progressing. Lower is better.</p>
              </div>
              
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                {bottleneckData.map(metric => (
                  <Card key={metric.name}>
                    <CardHeader>
                      <CardTitle className="text-sm">{metric.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {metric.data.map(item => (
                        <div key={item.name} className="mb-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{item.name}</span>
                            <span className="text-sm font-medium">{item.value} hrs</span>
                          </div>
                          <Progress 
                            value={Math.min(100, (item.value / (metric.name.includes("Review") ? 24 : 12)) * 100)} 
                            className="h-2" 
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
} 