"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from "recharts";
import { IconCheck, IconX, IconAlertTriangle } from "@tabler/icons-react";

type PullRequest = {
  id: number;
  title: string;
  number: number;
  developer: {
    id: number;
    name: string;
  };
  repository: {
    id: number;
    name: string;
  };
  status: string;
  linesAdded: number;
  linesRemoved: number;
  files: number;
  commentCount: number;
  approvalCount: number;
  reviewThoroughness: number;
  qualityScore: number;
};

type QualityFactor = {
  name: string;
  score: number;
  weight: number;
  description: string;
  recommendation: string;
};

type QualityData = {
  aggregateScore: number;
  qualityFactors: QualityFactor[];
  qualityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  sizeDistribution: {
    small: number;
    medium: number;
    large: number;
    xlarge: number;
  };
};

export function PRQualityDetails() {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [qualityData, setQualityData] = useState<QualityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // In a real app, this would be an API call
        const prsData = await import("@/app/dashboard/pull-requests.json");
        setPullRequests(prsData.default);
      } catch (error) {
        console.error("Failed to load pull request data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const analyzeQualityData = useCallback(() => {
    // Calculate quality distribution
    const highQuality = pullRequests.filter(pr => pr.qualityScore >= 80).length;
    const mediumQuality = pullRequests.filter(pr => pr.qualityScore >= 60 && pr.qualityScore < 80).length;
    const lowQuality = pullRequests.filter(pr => pr.qualityScore < 60).length;
    
    // Calculate PR size distribution
    const small = pullRequests.filter(pr => (pr.linesAdded + pr.linesRemoved) < 100).length;
    const medium = pullRequests.filter(pr => (pr.linesAdded + pr.linesRemoved) >= 100 && (pr.linesAdded + pr.linesRemoved) < 300).length;
    const large = pullRequests.filter(pr => (pr.linesAdded + pr.linesRemoved) >= 300 && (pr.linesAdded + pr.linesRemoved) < 1000).length;
    const xlarge = pullRequests.filter(pr => (pr.linesAdded + pr.linesRemoved) >= 1000).length;
    
    // Calculate aggregate quality score
    const avgQualityScore = Math.round(pullRequests.reduce((sum, pr) => sum + pr.qualityScore, 0) / pullRequests.length);
    
    // Get average values for various factors
    const avgPRSize = Math.round(pullRequests.reduce((sum, pr) => sum + (pr.linesAdded + pr.linesRemoved), 0) / pullRequests.length);
    const avgReviewThoroughness = parseFloat((pullRequests.reduce((sum, pr) => sum + pr.reviewThoroughness, 0) / pullRequests.length).toFixed(2));
    const avgCommentCount = parseFloat((pullRequests.reduce((sum, pr) => sum + pr.commentCount, 0) / pullRequests.length).toFixed(1));
    const avgApprovalRate = parseFloat(((pullRequests.filter(pr => pr.status === "merged").length / pullRequests.length) * 100).toFixed(1));
    
    // Define quality factors
    const qualityFactors: QualityFactor[] = [
      {
        name: "PR Size",
        score: calculateScore(avgPRSize, 1000, 100, true), // Lower is better
        weight: 0.3,
        description: `Average PR size is ${avgPRSize} lines of code`,
        recommendation: avgPRSize > 300 ? "Consider breaking down large PRs into smaller, focused changes" : "Good job keeping PRs at a manageable size!"
      },
      {
        name: "Review Thoroughness",
        score: calculateScore(avgReviewThoroughness, 0, 10, false), // Higher is better
        weight: 0.25,
        description: `Average review thoroughness is ${avgReviewThoroughness} comments per 100 LOC`,
        recommendation: avgReviewThoroughness < 2 ? "Encourage more detailed code reviews with specific feedback" : "Good review engagement from the team!"
      },
      {
        name: "Comment Quality",
        score: calculateScore(avgCommentCount, 0, 15, false), // Higher is better
        weight: 0.2,
        description: `Average of ${avgCommentCount} comments per PR`,
        recommendation: avgCommentCount < 5 ? "Consider implementing a minimum comment requirement for reviews" : "Good discussion happening during reviews!"
      },
      {
        name: "Approval Rate",
        score: calculateScore(avgApprovalRate, 0, 100, false), // Higher is better
        weight: 0.25,
        description: `${avgApprovalRate}% of PRs are approved and merged`,
        recommendation: avgApprovalRate < 70 ? "High rejection rate may indicate issues with PR preparation or requirements clarity" : "Healthy approval rate indicates good quality control!"
      }
    ];
    
    setQualityData({
      aggregateScore: avgQualityScore,
      qualityFactors,
      qualityDistribution: {
        high: highQuality,
        medium: mediumQuality,
        low: lowQuality
      },
      sizeDistribution: {
        small,
        medium,
        large,
        xlarge
      }
    });
  }, [pullRequests]);

  useEffect(() => {
    if (pullRequests.length > 0) {
      analyzeQualityData();
    }
  }, [pullRequests, analyzeQualityData]);

  // Helper function to calculate normalized scores (0-100)
  const calculateScore = (value: number, min: number, max: number, inversed: boolean): number => {
    let score;
    if (inversed) {
      // For metrics where lower is better (like PR size)
      score = 100 - Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    } else {
      // For metrics where higher is better (like review thoroughness)
      score = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    }
    return Math.round(score);
  };

  // Get a color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  // Get quality distribution chart data
  const getQualityDistributionData = () => {
    if (!qualityData) return [];
    
    return [
      { name: "High Quality", value: qualityData.qualityDistribution.high, color: "#22c55e" },
      { name: "Medium Quality", value: qualityData.qualityDistribution.medium, color: "#eab308" },
      { name: "Low Quality", value: qualityData.qualityDistribution.low, color: "#ef4444" },
    ];
  };
  
  // Get PR size distribution chart data
  const getSizeDistributionData = () => {
    if (!qualityData) return [];
    
    return [
      { name: "Small (<100 LOC)", value: qualityData.sizeDistribution.small, color: "#22c55e" },
      { name: "Medium (100-300 LOC)", value: qualityData.sizeDistribution.medium, color: "#3b82f6" },
      { name: "Large (300-1000 LOC)", value: qualityData.sizeDistribution.large, color: "#eab308" },
      { name: "X-Large (1000+ LOC)", value: qualityData.sizeDistribution.xlarge, color: "#ef4444" },
    ];
  };

  if (loading || !qualityData) {
    return (
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>PR Quality Analysis</CardTitle>
          <CardDescription>Loading quality data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <CardTitle>PR Quality Analysis</CardTitle>
        <CardDescription>
          Detailed breakdown of quality factors across pull requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="factors">Quality Factors</TabsTrigger>
            <TabsTrigger value="distributions">Distributions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Overall Quality Score</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                  <div className={`text-5xl font-bold ${getScoreColor(qualityData.aggregateScore)}`}>
                    {qualityData.aggregateScore}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {qualityData.aggregateScore >= 80 ? (
                      <span className="flex items-center gap-1 text-green-500">
                        <IconCheck size={16} />
                        <span>Excellent quality practices</span>
                      </span>
                    ) : qualityData.aggregateScore >= 60 ? (
                      <span className="flex items-center gap-1 text-yellow-500">
                        <IconAlertTriangle size={16} />
                        <span>Room for improvement</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500">
                        <IconX size={16} />
                        <span>Quality concerns detected</span>
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quality Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getQualityDistributionData()}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {getQualityDistributionData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="factors">
            <div className="space-y-6">
              {qualityData.qualityFactors.map((factor, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{factor.name}</CardTitle>
                      <Badge className={`${getScoreColor(factor.score)}`}>
                        {factor.score}/100
                      </Badge>
                    </div>
                    <CardDescription>{factor.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={factor.score} className="h-2 mb-2" />
                    <div className="flex items-start gap-2 mt-4">
                      {factor.score >= 80 ? (
                        <IconCheck className="mt-1 text-green-500 shrink-0" size={16} />
                      ) : (
                        <IconAlertTriangle className="mt-1 text-yellow-500 shrink-0" size={16} />
                      )}
                      <div className="text-sm text-muted-foreground">
                        {factor.recommendation}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Weight: {factor.weight * 100}% of total score
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="distributions">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">PR Size Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getSizeDistributionData()}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {getSizeDistributionData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Size vs. Quality Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm">
                      <p className="mb-2">Key observations:</p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>
                          Small PRs ({qualityData.sizeDistribution.small} total) have an average quality score of {
                            Math.round(
                              pullRequests
                                .filter(pr => (pr.linesAdded + pr.linesRemoved) < 100)
                                .reduce((sum, pr) => sum + pr.qualityScore, 0) / 
                                Math.max(1, qualityData.sizeDistribution.small)
                            )
                          }
                        </li>
                        <li>
                          Large PRs ({qualityData.sizeDistribution.large + qualityData.sizeDistribution.xlarge} total) have an average quality score of {
                            Math.round(
                              pullRequests
                                .filter(pr => (pr.linesAdded + pr.linesRemoved) >= 300)
                                .reduce((sum, pr) => sum + pr.qualityScore, 0) / 
                                Math.max(1, qualityData.sizeDistribution.large + qualityData.sizeDistribution.xlarge)
                            )
                          }
                        </li>
                        <li>
                          {qualityData.sizeDistribution.small > (qualityData.sizeDistribution.large + qualityData.sizeDistribution.xlarge) 
                            ? "Team generally keeps PRs at a manageable size" 
                            : "Team tends to create larger PRs, which may affect review quality"}
                        </li>
                      </ul>
                    </div>
                    
                    <div className="pt-2 text-sm text-muted-foreground border-t">
                      <p className="font-medium mb-1">Recommendation:</p>
                      {qualityData.sizeDistribution.large + qualityData.sizeDistribution.xlarge > qualityData.sizeDistribution.small 
                        ? "Consider implementing PR size limits to encourage smaller, more focused changes that are easier to review."
                        : "Continue maintaining reasonable PR sizes to ensure high-quality reviews and faster cycle times."}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 