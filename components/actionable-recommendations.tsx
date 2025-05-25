"use client"

import * as React from "react"
import { IconExternalLink, IconAlertTriangle, IconClock, IconUsers, IconTrendingUp, IconCheck, IconArrowUpRight } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
        return <IconTrendingUp className="h-4 w-4" />;
      case 'quality':
        return <IconCheck className="h-4 w-4" />;
      case 'collaboration':
        return <IconUsers className="h-4 w-4" />;
      case 'process':
        return <IconClock className="h-4 w-4" />;
      default:
        return <IconAlertTriangle className="h-4 w-4" />;
    }
  };

  const getImpactGradient = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'from-blue-100 via-blue-200/50 to-blue-50/30 dark:from-blue-950/60 dark:via-blue-800/10 dark:to-blue-900/5';
      case 'medium':
        return 'from-cyan-100 via-cyan-200/50 to-cyan-50/30 dark:from-cyan-950/60 dark:via-cyan-800/10 dark:to-cyan-900/5';
      case 'low':
        return 'from-green-100 via-green-200/50 to-green-50/30 dark:from-green-950/60 dark:via-green-800/10 dark:to-green-900/5';
      default:
        return 'from-gray-100 to-gray-50/30 dark:from-gray-950/60 dark:to-gray-900/10';
    }
  };

  const groupRecommendationsByPriority = (recs: Recommendation[]) => {
    return {
      high: recs.filter(r => r.priority === 'high'),
      medium: recs.filter(r => r.priority === 'medium'),
      low: recs.filter(r => r.priority === 'low')
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Insights</CardTitle>
          <CardDescription>Loading optimization opportunities...</CardDescription>
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
          <CardTitle>Workflow Insights</CardTitle>
          <CardDescription>Unable to load recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            size="sm"
            className="mt-4"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || recommendations.recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Insights</CardTitle>
          <CardDescription>Your development workflow is running smoothly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mb-4 mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <IconCheck className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">All Systems Running Well</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              No significant optimization opportunities identified. Your team's development workflow is performing efficiently.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedRecs = groupRecommendationsByPriority(recommendations.recommendations);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Workflow Insights</CardTitle>
            <CardDescription>
              Opportunities to enhance your development flow
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {recommendations.summary.totalRecommendations} insights
            </p>
            <p className="text-xs text-muted-foreground">
              Potential impact: {recommendations.summary.estimatedImpact}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="high" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="high" className="relative">
              High Impact Opportunities
              {groupedRecs.high.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {groupedRecs.high.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="medium" className="relative">
              Quick Wins Available
              {groupedRecs.medium.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {groupedRecs.medium.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="low" className="relative">
              Minor Improvements
              {groupedRecs.low.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {groupedRecs.low.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="high" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedRecs.high.map((rec) => (
                <Card 
                  key={rec.id} 
                  className={`bg-gradient-to-tl ${getImpactGradient(rec.priority)} border-blue-200/60 dark:border-blue-800/30`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5 text-blue-600 dark:text-blue-400">
                        {getTypeIcon(rec.type)}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base font-semibold">{rec.title}</CardTitle>
                        <CardDescription className="mt-1 text-sm">{rec.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3">
                      <p className="text-sm font-medium mb-1">Expected Impact</p>
                      <p className="text-sm text-muted-foreground">{rec.impact}</p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span><strong>Current:</strong> {rec.metrics.currentValue}</span>
                        <IconArrowUpRight className="h-3 w-3 text-muted-foreground" />
                        <span><strong>Target:</strong> {rec.metrics.targetValue}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {rec.timeFrame}
                      </Badge>
                      <Button size="sm" variant="outline" className="text-xs">
                        <IconExternalLink className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {groupedRecs.high.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <IconCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No high-impact opportunities identified - great work!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="medium" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedRecs.medium.map((rec) => (
                <Card 
                  key={rec.id} 
                  className={`bg-gradient-to-tl ${getImpactGradient(rec.priority)} border-cyan-200/60 dark:border-cyan-800/30`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5 text-cyan-600 dark:text-cyan-400">
                        {getTypeIcon(rec.type)}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base font-semibold">{rec.title}</CardTitle>
                        <CardDescription className="mt-1 text-sm">{rec.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3">
                      <p className="text-sm font-medium mb-1">Expected Impact</p>
                      <p className="text-sm text-muted-foreground">{rec.impact}</p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span><strong>Current:</strong> {rec.metrics.currentValue}</span>
                        <IconArrowUpRight className="h-3 w-3 text-muted-foreground" />
                        <span><strong>Target:</strong> {rec.metrics.targetValue}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {rec.timeFrame}
                      </Badge>
                      <Button size="sm" variant="outline" className="text-xs">
                        <IconExternalLink className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {groupedRecs.medium.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <IconCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No medium-impact opportunities identified</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="low" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedRecs.low.map((rec) => (
                <Card 
                  key={rec.id} 
                  className={`bg-gradient-to-tl ${getImpactGradient(rec.priority)} border-green-200/60 dark:border-green-800/30`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5 text-green-600 dark:text-green-400">
                        {getTypeIcon(rec.type)}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base font-semibold">{rec.title}</CardTitle>
                        <CardDescription className="mt-1 text-sm">{rec.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3">
                      <p className="text-sm font-medium mb-1">Expected Impact</p>
                      <p className="text-sm text-muted-foreground">{rec.impact}</p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span><strong>Current:</strong> {rec.metrics.currentValue}</span>
                        <IconArrowUpRight className="h-3 w-3 text-muted-foreground" />
                        <span><strong>Target:</strong> {rec.metrics.targetValue}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {rec.timeFrame}
                      </Badge>
                      <Button size="sm" variant="outline" className="text-xs">
                        <IconExternalLink className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {groupedRecs.low.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <IconCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No low-impact opportunities identified</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 