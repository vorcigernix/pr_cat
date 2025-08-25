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
import { 
  IconAlertCircle, 
  IconCheck, 
  IconBulb
} from "@tabler/icons-react";

type Recommendation = {
  id: string;
  type: 'performance' | 'quality' | 'collaboration' | 'process';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  actionItems: string[];
  metrics: {
    currentValue: number;
    targetValue: number;
    improvementPotential: string;
  };
  affectedRepositories?: string[];
  timeFrame: string;
};

type RecommendationsResponse = {
  recommendations: Recommendation[];
  summary: {
    totalRecommendations: number;
    highPriorityCount: number;
    estimatedImpact: string;
    focusAreas: string[];
  };
};

export function RecommendationsInsights() {
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/metrics/recommendations');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch recommendations: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setRecommendations(data);
      } catch (error) {
        console.error("Failed to load recommendations:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getImpactBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-rose-500 text-white hover:bg-rose-600">High Impact Opportunity</Badge>;
      case "medium":
        return <Badge className="bg-indigo-400 text-white hover:bg-indigo-500">Quick Win Available</Badge>;
      case "low":
        return <Badge className="bg-emerald-400 text-white hover:bg-emerald-500">Minor Improvement</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "performance":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Performance</Badge>;
      case "quality":
        return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">Quality</Badge>;
      case "collaboration":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">Collaboration</Badge>;
      case "process":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">Process</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Insights & Recommendations</CardTitle>
          <CardDescription>Loading team insights...</CardDescription>
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
          <CardTitle>Teams Insights & Recommendations</CardTitle>
          <CardDescription className="text-red-500">Error loading insights</CardDescription>
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

  if (!recommendations || recommendations.recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Insights & Recommendations</CardTitle>
          <CardDescription>No insights available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mb-4 mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <IconCheck className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Great Work!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your teams workflow is performing efficiently. No critical recommendations at this time.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconBulb size={24} className="text-amber-400" />
          <CardTitle>Improvement Quests</CardTitle>
        </div>
        <CardDescription>
          Opportunities to level up your teams collaboration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.recommendations.map((recommendation) => (
            <Card 
              key={recommendation.id} 
              className={`border-l-4 ${
                recommendation.priority === 'high' ? 'border-l-rose-400' : recommendation.priority === 'medium' ? 'border-l-indigo-400' : 'border-l-emerald-400'
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {recommendation.priority === 'high' ? (
                      <IconAlertCircle size={18} className="text-rose-400" />
                    ) : recommendation.priority === 'medium' ? (
                      <IconAlertCircle size={18} className="text-indigo-400" />
                    ) : (
                      <IconCheck size={18} className="text-emerald-400" />
                    )}
                    <CardTitle className="text-base">
                      {recommendation.title}
                    </CardTitle>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getImpactBadge(recommendation.priority)}
                    {getCategoryBadge(recommendation.type)}
                  </div>
                </div>
                <CardDescription>
                  {recommendation.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-2">
                  <span className="text-xs text-muted-foreground">Affected Metrics: </span>
                  <span className="text-xs">{recommendation.metrics.currentValue.toFixed(2)} / {recommendation.metrics.targetValue.toFixed(2)}</span>
                </div>
                
                <div className="mt-2">
                  <div className="text-sm font-medium mb-1">Action Items:</div>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {recommendation.actionItems.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 