"use client";

import { useState, useMemo } from "react";
import { usePullRequestsRecent } from "@/hooks/use-metrics";
import { useTeamFilterParams } from "@/hooks/use-team-filter";
import { Button } from "@/components/ui/button";
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
import { IconCheck, IconAlertTriangle } from "@tabler/icons-react";

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
  sample: {
    total: number;
    merged: number;
    open: number;
    closed: number;
    withSize: number;
    withCycleTime: number;
    averageSize: number | null;
    averageCycleTime: number | null;
  };
  sizeDistribution: {
    small: number;
    medium: number;
    large: number;
    xlarge: number;
  };
};

// Helper function to calculate normalized scores (0-100)
const calculateScore = (value: number, min: number, max: number, inversed: boolean): number => {
  const score = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return Math.round(inversed ? 100 - score : score);
};

export function PRQualityDetails() {
  const filterParams = useTeamFilterParams();
  const params = new URLSearchParams(filterParams);
  params.set('limit', '100');
  const { data, error, isLoading: loading, refresh } = usePullRequestsRecent(params.toString());
  const [activeTab, setActiveTab] = useState("overview");

  const qualityData = useMemo<QualityData | null>(() => {
    const pullRequests = Array.isArray(data) ? data : data?.data ?? [];
    if (pullRequests.length === 0) return null;

    // Calculate quality metrics based on available real data
    const prsWithSize = pullRequests.filter(pr => typeof pr.linesAdded === 'number' && Number.isFinite(pr.linesAdded) && pr.linesAdded >= 0 && typeof pr.linesRemoved === 'number' && Number.isFinite(pr.linesRemoved) && pr.linesRemoved >= 0);
    
    // Calculate PR size distribution
    const small = prsWithSize.filter(pr => (pr.linesAdded! + pr.linesRemoved!) < 100).length;
    const medium = prsWithSize.filter(pr => (pr.linesAdded! + pr.linesRemoved!) >= 100 && (pr.linesAdded! + pr.linesRemoved!) < 300).length;
    const large = prsWithSize.filter(pr => (pr.linesAdded! + pr.linesRemoved!) >= 300 && (pr.linesAdded! + pr.linesRemoved!) < 1000).length;
    const xlarge = prsWithSize.filter(pr => (pr.linesAdded! + pr.linesRemoved!) >= 1000).length;
    
    // Calculate average values for various factors
    const avgPRSize = prsWithSize.length > 0 ? Math.round(prsWithSize.reduce((sum, pr) => sum + (pr.linesAdded! + pr.linesRemoved!), 0) / prsWithSize.length) : 0;
    const prsWithCycleTime = pullRequests.filter(pr => pr.status === 'merged' && typeof pr.cycleTime === 'number' && Number.isFinite(pr.cycleTime) && pr.cycleTime >= 0);
    const avgCycleTime = prsWithCycleTime.length > 0 ? Math.round(prsWithCycleTime.reduce((sum, pr) => sum + pr.cycleTime, 0) / prsWithCycleTime.length) : 0;
    const mergedPRs = pullRequests.filter(pr => pr.status === "merged").length;
    const mergeRate = parseFloat(((mergedPRs / pullRequests.length) * 100).toFixed(1));
    const categorizedPRs = pullRequests.filter(pr => pr.investmentArea && pr.investmentArea.toLowerCase() !== 'uncategorized').length;
    const categorizationRate = parseFloat(((categorizedPRs / pullRequests.length) * 100).toFixed(1));
    
    // Define quality factors based on real metrics
    const qualityFactors: QualityFactor[] = [
      {
        name: "PR Size",
        score: calculateScore(avgPRSize, 100, 1000, true), // Lower is better
        weight: prsWithSize.length ? 0.3 : 0,
        description: prsWithSize.length ? `Average PR size is ${avgPRSize} lines of code` : 'PR size data is unavailable; excluded from the score',
        recommendation: avgPRSize > 300 ? "Consider breaking down large PRs into smaller, focused changes" : "Good job keeping PRs at a manageable size!"
      },
      {
        name: "Delivery Speed",
        score: calculateScore(avgCycleTime, 24, 168, true), // Lower is better (hours)
        weight: prsWithCycleTime.length ? 0.25 : 0,
        description: prsWithCycleTime.length ? `Average cycle time is ${avgCycleTime} hours` : 'Merged PR cycle time is unavailable; excluded from the score',
        recommendation: avgCycleTime > 72 ? "Consider streamlining the review and merge process" : "Good delivery speed!"
      },
      {
        name: "Merge Success Rate",
        score: calculateScore(mergeRate, 0, 100, false), // Higher is better
        weight: 0.25,
        description: `${mergeRate}% of PRs in this sample are merged`,
        recommendation: 'Open PRs may still be in progress. Merge rate alone does not measure quality.'
      },
      {
        name: "Categorization Rate",
        score: calculateScore(categorizationRate, 0, 100, false), // Higher is better
        weight: 0.2,
        description: `${categorizationRate}% of PRs have an assigned category`,
        recommendation: categorizationRate < 80 ? "Improve PR categorization for better tracking" : "Good categorization coverage!"
      }
    ];
    
    // Calculate aggregate score
    const totalWeight = qualityFactors.reduce((sum, factor) => sum + factor.weight, 0);
    const aggregateScore = Math.round(qualityFactors.reduce((sum, factor) => sum + factor.score * factor.weight, 0) / totalWeight);
    
    return {
      aggregateScore,
      qualityFactors,
      sample: {
        total: pullRequests.length,
        merged: mergedPRs,
        open: pullRequests.filter(pr => pr.status === 'open').length,
        closed: pullRequests.filter(pr => pr.status === 'closed').length,
        withSize: prsWithSize.length,
        withCycleTime: prsWithCycleTime.length,
        averageSize: prsWithSize.length ? avgPRSize : null,
        averageCycleTime: prsWithCycleTime.length ? avgCycleTime : null,
      },
      sizeDistribution: {
        small,
        medium,
        large,
        xlarge
      }
    };
  }, [data]);

  // Get a color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  // Get badge styling with proper contrast
  const getBadgeStyle = (score: number) => {
    if (score >= 80) {
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
    }
    if (score >= 60) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800";
    }
    return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
  };

  // Get PR size distribution chart data
  const getSizeDistributionData = () => {
    if (!qualityData) return [];
    
    return [
      { name: "Small (<100 LOC)", value: qualityData.sizeDistribution.small, color: "#22c55e" },
      { name: "Medium (100–299 lines)", value: qualityData.sizeDistribution.medium, color: "#3b82f6" },
      { name: "Large (300–999 lines)", value: qualityData.sizeDistribution.large, color: "#eab308" },
      { name: "X-Large (1000+ LOC)", value: qualityData.sizeDistribution.xlarge, color: "#ef4444" },
    ];
  };

  if (error) {
    return (
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>PR Quality Analysis</CardTitle>
          <CardDescription>Failed to load quality data</CardDescription>
        </CardHeader>
        <CardContent>
          <p role="alert" className="text-sm text-destructive">{error instanceof Error ? error.message : 'Unable to load pull requests.'}</p>
          <Button className="mt-3" variant="outline" onClick={() => void refresh()}>Retry quality data</Button>
        </CardContent>
      </Card>
    );
  }

  if (!loading && !qualityData) {
    return (
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>PR Quality Analysis</CardTitle>
          <CardDescription>No pull requests available to analyze</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Quality analysis will appear when pull request activity is available from your connected repositories.</p>
        </CardContent>
      </Card>
    );
  }

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
          Measured activity from up to 100 recent pull requests matching your filters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="factors">Quality Factors</TabsTrigger>
            <TabsTrigger value="distributions">Distributions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Workflow heuristic score</CardTitle>
                  <CardDescription>A summary of workflow signals, not an assessment of code quality.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  {/* Circular Progress Indicator - Now Clickable */}
                  <button
                    type="button"
                    className="relative w-40 h-40 mb-6 cursor-pointer hover:scale-105 transition-transform rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    onClick={() => setActiveTab("factors")}
                    aria-label="View detailed quality factors"
                  >
                    <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
                      {/* Gradient Definitions */}
                      <defs>
                        <linearGradient id="progressGradientGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="progressGradientYellow" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                        <linearGradient id="progressGradientRed" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                      </defs>
                      
                      {/* Background circle */}
                      <circle
                        cx="80"
                        cy="80"
                        r="65"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        className="text-muted/10 dark:text-muted/20"
                      />
                      
                      {/* Progress circle with gradient */}
                      <circle
                        cx="80"
                        cy="80"
                        r="65"
                        stroke={`url(#progressGradient${
                          qualityData.aggregateScore >= 80 ? 'Green' : 
                          qualityData.aggregateScore >= 60 ? 'Yellow' : 'Red'
                        })`}
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 65}`}
                        strokeDashoffset={`${2 * Math.PI * 65 * (1 - qualityData.aggregateScore / 100)}`}
                        className="transition-all duration-1500 ease-out"
                        strokeLinecap="round"
                      />
                      
                      {/* Score markers */}
                      {[25, 50, 75].map((score) => (
                        <circle
                          key={score}
                          cx={80 + 65 * Math.cos((score / 100) * 2 * Math.PI - Math.PI / 2)}
                          cy={80 + 65 * Math.sin((score / 100) * 2 * Math.PI - Math.PI / 2)}
                          r="2"
                          fill="currentColor"
                          className="text-muted/40"
                        />
                      ))}
                    </svg>
                    
                    {/* Score text in center with improved positioning */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className={`text-3xl font-black ${getScoreColor(qualityData.aggregateScore)} leading-none`}>
                        {qualityData.aggregateScore}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase mt-1">
                        Workflow Score
                      </div>
                      <div className="text-[9px] text-muted-foreground/70">
                        out of 100
                      </div>
                    </div>
                  </button>
                  
                  {/* Info text */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Based on {qualityData.qualityFactors.filter(factor => factor.weight > 0).length} available workflow factors
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      Click the chart above to see detailed breakdown
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pull request sample</CardTitle>
                  <CardDescription>Up to 100 recent PRs matching the selected filters.</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between gap-3"><dt>PRs analyzed</dt><dd>{qualityData.sample.total}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Merged</dt><dd>{qualityData.sample.merged}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Open</dt><dd>{qualityData.sample.open}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Closed without merging</dt><dd>{qualityData.sample.closed}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Average changed lines</dt><dd>{qualityData.sample.averageSize ?? 'Unavailable'}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Average merged PR cycle time</dt><dd>{qualityData.sample.averageCycleTime === null ? 'Unavailable' : `${qualityData.sample.averageCycleTime} hours`}</dd></div>
                  </dl>
                  <p className="mt-4 text-xs text-muted-foreground">Size data: {qualityData.sample.withSize} of {qualityData.sample.total} PRs. Cycle time data: {qualityData.sample.withCycleTime} of {qualityData.sample.merged} merged PRs. Missing data is excluded from averages.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="factors">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">Heuristic definitions: average size scores 100 at 100 changed lines or fewer and 0 at 1,000 or more. Average merged PR cycle time scores 100 at 24 hours or less and 0 at 168 hours or more. Values between these bounds are scored linearly. Merge and categorization scores use their sample percentages. Missing factors are excluded and the remaining weights are normalized.</p>
              {qualityData.qualityFactors.map((factor, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{factor.name}</CardTitle>
                      <Badge variant="secondary" className={factor.weight ? getBadgeStyle(factor.score) : ''}>
                        {factor.weight ? `${factor.score}/100` : 'Unavailable'}
                      </Badge>
                    </div>
                    <CardDescription>{factor.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {factor.weight > 0 && <Progress value={factor.score} className="h-2 mb-2" />}
                    <div className="flex items-start gap-2 mt-4">
                      {factor.score >= 80 ? (
                        <IconCheck className="mt-1 text-green-500 shrink-0" size={16} />
                      ) : (
                        <IconAlertTriangle className="mt-1 text-yellow-500 shrink-0" size={16} />
                      )}
                      <div className="text-sm text-muted-foreground">
                        {factor.weight ? factor.recommendation : 'Collect this data to include this factor in the score.'}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Weight: {Math.round(factor.weight / qualityData.qualityFactors.reduce((sum, item) => sum + item.weight, 0) * 100)}% of available factors
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
                  <CardDescription>Based on {qualityData.sample.withSize} of {qualityData.sample.total} PRs with known additions and deletions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getSizeDistributionData()}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="40%"
                          outerRadius={60}
                          innerRadius={0}
                        >
                          {getSizeDistributionData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name) => [`${value} PRs`, name]}
                          labelFormatter={() => ''}
                        />
                        <Legend 
                          verticalAlign="bottom"
                          height={56}
                          wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Size definitions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm">
                      <p className="mb-2">Size is the sum of added and deleted lines:</p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>
                          Small: fewer than 100 lines ({qualityData.sizeDistribution.small} PRs)
                        </li>
                        <li>
                          Medium: 100–299 lines ({qualityData.sizeDistribution.medium} PRs)
                        </li>
                        <li>
                          Large: 300–999 lines ({qualityData.sizeDistribution.large} PRs)
                        </li>
                        <li>Extra large: 1,000 or more lines ({qualityData.sizeDistribution.xlarge} PRs)</li>
                      </ul>
                    </div>
                    
                    <div className="pt-2 text-sm text-muted-foreground border-t">
                      <p>These size bands describe this sample. They do not measure code quality or establish a relationship with review time.</p>
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
