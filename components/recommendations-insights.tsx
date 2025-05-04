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
import { IconBulb, IconCheck, IconAlertCircle, IconArrowUpRight } from "@tabler/icons-react";

type Recommendation = {
  id: number;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: "cycle-time" | "quality" | "collaboration" | "workflow";
  metrics: string[];
  actionItems: string[];
  implemented: boolean;
};

type MetricsData = {
  metricsSummary: {
    codingTime: { value: number; change: number; trend: string };
    prSize: { value: number; change: number; trend: string };
    cycleTime: { value: number; change: number; trend: string };
    reviewTime: { value: number; change: number; trend: string };
  };
  pullRequests: Array<{ qualityScore: number }>;
  timeSeriesData: Array<{ 
    date: string; 
    prThroughput: number; 
    cycleTime: number; 
    reviewTime: number; 
    codingHours: number 
  }>;
};

export function RecommendationsInsights() {
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // In a real app, this would be an API call
        const data = await import("@/app/dashboard/all-data.json");
        setMetricsData(data.default);
      } catch (error) {
        console.error("Failed to load metrics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (metricsData) {
      generateRecommendations();
    }
  }, [metricsData]);

  const generateRecommendations = () => {
    if (!metricsData) return;

    const { metricsSummary, pullRequests, timeSeriesData } = metricsData;
    const recommendations: Recommendation[] = [];

    // Sample recommendations based on PR size
    if (metricsSummary.prSize.value > 300) {
      recommendations.push({
        id: 1,
        title: "Reduce PR size to improve review quality",
        description: "Pull requests are averaging " + metricsSummary.prSize.value + " lines of code, which can lead to longer review times and reduced quality.",
        impact: "high",
        category: "quality",
        metrics: ["PR Size", "Review Time"],
        actionItems: [
          "Target PRs under 200 lines of code",
          "Break large features into smaller, focused changes",
          "Consider using feature flags for incremental delivery"
        ],
        implemented: false
      });
    }

    // Recommendation based on cycle time
    if (metricsSummary.cycleTime.value > 30) {
      recommendations.push({
        id: 2,
        title: "Reduce cycle time to ship faster",
        description: "Your average cycle time is " + metricsSummary.cycleTime.value + " hours. Reducing this will help deliver features more quickly.",
        impact: "high",
        category: "cycle-time",
        metrics: ["Cycle Time", "Review Time"],
        actionItems: [
          "Set up automatic deployment pipelines",
          "Implement test automation to reduce manual testing",
          "Establish SLAs for PR reviews (24 hours maximum)"
        ],
        implemented: false
      });
    }

    // Recommendation based on review time
    if (metricsSummary.reviewTime.value > 10) {
      recommendations.push({
        id: 3,
        title: "Speed up code reviews",
        description: "Reviews are taking an average of " + metricsSummary.reviewTime.value + " hours to complete, creating a bottleneck.",
        impact: "medium",
        category: "workflow",
        metrics: ["Review Time"],
        actionItems: [
          "Implement a review rotation schedule",
          "Set up automated code reviews for common issues",
          "Add notifications for pending reviews over 24 hours"
        ],
        implemented: false
      });
    }

    // Find large variation in coding time
    const codingTimes = timeSeriesData.map((day) => day.codingHours);
    const avgCodingTime = codingTimes.reduce((sum: number, time: number) => sum + time, 0) / codingTimes.length;
    const variationExists = codingTimes.some((time: number) => Math.abs(time - avgCodingTime) / avgCodingTime > 0.3);

    if (variationExists) {
      recommendations.push({
        id: 4,
        title: "Balance workload across the team",
        description: "There's significant variation in coding time across team members or days, indicating potential burnout risk or uneven workload.",
        impact: "medium",
        category: "collaboration",
        metrics: ["Coding Time"],
        actionItems: [
          "Review sprint planning process",
          "Implement paired programming for knowledge sharing",
          "Monitor for consistent overtime patterns"
        ],
        implemented: false
      });
    }

    // Find quality issues
    const lowQualityPRs = pullRequests.filter((pr) => pr.qualityScore < 60).length;
    const totalPRs = pullRequests.length;
    
    if (lowQualityPRs / totalPRs > 0.2) { // If more than 20% of PRs have low quality
      recommendations.push({
        id: 5,
        title: "Improve PR quality with better automation",
        description: `${Math.round(lowQualityPRs / totalPRs * 100)}% of PRs have low quality scores. This may indicate issues with testing or documentation.`,
        impact: "high",
        category: "quality",
        metrics: ["Quality Score"],
        actionItems: [
          "Add required test coverage checks",
          "Implement pre-commit hooks for linting and formatting",
          "Create PR templates to encourage documentation"
        ],
        implemented: false
      });
    }

    // Add some sample "implemented" recommendations for UI demonstration
    recommendations.push({
      id: 6,
      title: "Standardize PR templates across repositories",
      description: "Implemented PR templates have improved documentation and reduced back-and-forth in reviews.",
      impact: "medium",
      category: "workflow",
      metrics: ["Review Time", "Cycle Time"],
      actionItems: [
        "Create standardized PR templates",
        "Add required sections for test plan and screenshots",
        "Include a checklist for common review items"
      ],
      implemented: true
    });

    // Sort by impact (high first) and then by implemented status (not implemented first)
    recommendations.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      if (a.implemented !== b.implemented) {
        return a.implemented ? 1 : -1;
      }
      return impactOrder[a.impact] - impactOrder[b.impact];
    });

    setRecommendations(recommendations);
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case "high":
        return <Badge className="bg-red-500">High Impact</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500">Medium Impact</Badge>;
      case "low":
        return <Badge className="bg-blue-500">Low Impact</Badge>;
      default:
        return null;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "cycle-time":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Cycle Time</Badge>;
      case "quality":
        return <Badge variant="outline" className="border-green-500 text-green-500">Quality</Badge>;
      case "collaboration":
        return <Badge variant="outline" className="border-purple-500 text-purple-500">Collaboration</Badge>;
      case "workflow":
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Workflow</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>Recommendations & Insights</CardTitle>
          <CardDescription>Loading recommendations...</CardDescription>
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
        <div className="flex items-center gap-2">
          <IconBulb size={24} className="text-yellow-500" />
          <CardTitle>Recommendations & Insights</CardTitle>
        </div>
        <CardDescription>
          Actionable recommendations based on your team's metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <IconCheck size={48} className="text-green-500 mb-2" />
              <p className="text-lg font-medium">All recommended actions have been implemented!</p>
              <p className="text-muted-foreground">Your team is following best practices based on current metrics.</p>
            </div>
          ) : (
            recommendations.map((recommendation) => (
              <Card 
                key={recommendation.id} 
                className={`border-l-4 ${
                  recommendation.implemented ? 'border-l-green-500' : 'border-l-yellow-500'
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {recommendation.implemented ? (
                        <IconCheck size={18} className="text-green-500" />
                      ) : (
                        <IconAlertCircle size={18} className="text-yellow-500" />
                      )}
                      <CardTitle className="text-base">
                        {recommendation.title}
                      </CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getImpactBadge(recommendation.impact)}
                      {getCategoryBadge(recommendation.category)}
                    </div>
                  </div>
                  <CardDescription>
                    {recommendation.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-2">
                    <span className="text-xs text-muted-foreground">Affected Metrics: </span>
                    <span className="text-xs">{recommendation.metrics.join(", ")}</span>
                  </div>
                  
                  {!recommendation.implemented && (
                    <div className="mt-2">
                      <div className="text-sm font-medium mb-1">Action Items:</div>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {recommendation.actionItems.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {recommendation.implemented && (
                    <div className="flex items-center gap-1 text-green-600 text-sm mt-2">
                      <IconCheck size={16} />
                      <span>Implemented</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
} 