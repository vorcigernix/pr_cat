"use client"

import * as React from "react"
import { IconExternalLink, IconAlertTriangle, IconClock, IconUsers, IconTrendingUp } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

export function ActionableRecommendations() {
  const [recommendations, setRecommendations] = React.useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance':
        return <IconTrendingUp className="h-4 w-4 text-blue-500" />;
      case 'quality':
        return <IconAlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'collaboration':
        return <IconUsers className="h-4 w-4 text-green-500" />;
      case 'process':
        return <IconClock className="h-4 w-4 text-purple-500" />;
      default:
        return <IconAlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actionable Recommendations</CardTitle>
          <CardDescription>Loading optimization insights...</CardDescription>
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
          <CardTitle>Actionable Recommendations</CardTitle>
          <CardDescription>Error loading recommendations</CardDescription>
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
          <CardTitle>Actionable Recommendations</CardTitle>
          <CardDescription>Your workflows are well optimized!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <IconTrendingUp className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-green-700 mb-2">Excellent Performance!</p>
            <p className="text-muted-foreground">
              No significant optimization opportunities identified. Your team's workflows are running smoothly.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Actionable Recommendations</CardTitle>
            <CardDescription>
              AI-generated insights to optimize your development workflow
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {recommendations.summary.totalRecommendations} recommendations
            </p>
            <p className="text-sm font-medium">
              Impact: {recommendations.summary.estimatedImpact}
            </p>
          </div>
        </div>
        
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {recommendations.summary.highPriorityCount > 0 && (
            <Badge variant="outline" className="text-red-600 border-red-200">
              {recommendations.summary.highPriorityCount} High Priority
            </Badge>
          )}
          {recommendations.summary.focusAreas.map((area) => (
            <Badge key={area} variant="outline" className="capitalize">
              {area}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.recommendations.map((rec) => (
            <Card key={rec.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getTypeIcon(rec.type)}
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold">{rec.title}</CardTitle>
                      <CardDescription className="mt-1">{rec.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`text-xs ${getPriorityColor(rec.priority)}`}>
                      {rec.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {rec.timeFrame}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {/* Impact */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800 mb-1">Expected Impact</p>
                  <p className="text-sm text-blue-700">{rec.impact}</p>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="font-medium">Current:</span> {rec.metrics.currentValue}
                    </div>
                    <div>
                      <span className="font-medium">Target:</span> {rec.metrics.targetValue}
                    </div>
                    <div>
                      <span className="font-medium">Improvement:</span> {rec.metrics.improvementPotential}
                    </div>
                  </div>
                </div>

                {/* Action Items */}
                <div>
                  <p className="text-sm font-medium mb-2">Action Items</p>
                  <ul className="space-y-1">
                    {rec.actionItems.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <span className="font-medium text-blue-600 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Call to Action */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    Type: <span className="capitalize">{rec.type}</span>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs">
                    <IconExternalLink className="h-3 w-3 mr-1" />
                    Learn More
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        {recommendations.summary.highPriorityCount > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">High Priority Actions</h4>
            <p className="text-sm text-red-700 mb-3">
              {recommendations.summary.highPriorityCount} critical improvement{recommendations.summary.highPriorityCount === 1 ? '' : 's'} identified. 
              Taking action on these will have immediate impact on your team's productivity.
            </p>
            <Button size="sm" className="bg-red-600 hover:bg-red-700">
              Start with High Priority Items
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 