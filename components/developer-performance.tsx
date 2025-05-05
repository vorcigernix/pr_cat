"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

type Developer = {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role: string;
  experience: string;
  averageCodingTime: number;
};

type DeveloperMetrics = {
  id: number;
  name: string;
  prCount: number;
  avgCycleTime: number;
  avgReviewTime: number;
  avgPRSize: number;
  avgQualityScore: number;
};

// Add a PullRequest type definition
type PullRequest = {
  id: number;
  developer: { id: number; name: string };
  status: string;
  cycleTime: number;
  reviewTime: number;
  linesAdded: number;
  linesRemoved: number;
  qualityScore: number;
};

export function DeveloperPerformance() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [selectedDeveloper, setSelectedDeveloper] = useState<string>("all");
  const [developerMetrics, setDeveloperMetrics] = useState<DeveloperMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // In a real app, these would be API calls
        const developersData = await import("@/app/dashboard/developers.json");
        const pullRequestsData = await import("@/app/dashboard/pull-requests.json");
        
        setDevelopers(developersData.default);
        setPullRequests(pullRequestsData.default);
      } catch (error) {
        console.error("Failed to load developer data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const calculateDeveloperMetrics = useCallback(() => {
    // Calculate metrics for each developer
    const metrics = developers.map(developer => {
      // Filter PRs by this developer
      const devPRs = pullRequests.filter(pr => 
        pr.developer.id === developer.id && pr.status === "merged"
      );
      
      if (devPRs.length === 0) {
        return {
          id: developer.id,
          name: developer.name,
          prCount: 0,
          avgCycleTime: 0,
          avgReviewTime: 0,
          avgPRSize: 0,
          avgQualityScore: 0
        };
      }
      
      // Calculate averages
      const avgCycleTime = devPRs.reduce((sum, pr) => sum + pr.cycleTime, 0) / devPRs.length;
      const avgReviewTime = devPRs.reduce((sum, pr) => sum + pr.reviewTime, 0) / devPRs.length;
      const avgPRSize = devPRs.reduce((sum, pr) => sum + (pr.linesAdded + pr.linesRemoved), 0) / devPRs.length;
      const avgQualityScore = devPRs.reduce((sum, pr) => sum + pr.qualityScore, 0) / devPRs.length;
      
      return {
        id: developer.id,
        name: developer.name,
        prCount: devPRs.length,
        avgCycleTime: parseFloat(avgCycleTime.toFixed(1)),
        avgReviewTime: parseFloat(avgReviewTime.toFixed(1)),
        avgPRSize: Math.round(avgPRSize),
        avgQualityScore: Math.round(avgQualityScore)
      };
    });
    
    // Sort by PR count (most active developers first)
    metrics.sort((a, b) => b.prCount - a.prCount);
    
    setDeveloperMetrics(metrics);
  }, [developers, pullRequests]);

  useEffect(() => {
    if (developers.length > 0 && pullRequests.length > 0) {
      calculateDeveloperMetrics();
    }
  }, [developers, pullRequests, calculateDeveloperMetrics]);

  const getComparisonData = () => {
    // Get data for charting - compare all devs or filtered by selection
    let dataToChart = developerMetrics;
    
    if (selectedDeveloper !== "all") {
      const devId = parseInt(selectedDeveloper);
      dataToChart = developerMetrics.filter(dm => dm.id === devId);
    }
    
    // Limit to top 5 developers if showing all
    if (selectedDeveloper === "all") {
      dataToChart = dataToChart.slice(0, 5);
    }
    
    // Format data for the bar chart
    return [
      {
        name: "Cycle Time (hrs)",
        data: dataToChart.map(dm => ({
          name: dm.name.split(' ')[0],
          value: dm.avgCycleTime
        }))
      },
      {
        name: "Review Time (hrs)",
        data: dataToChart.map(dm => ({
          name: dm.name.split(' ')[0],
          value: dm.avgReviewTime
        }))
      },
      {
        name: "Quality Score",
        data: dataToChart.map(dm => ({
          name: dm.name.split(' ')[0],
          value: dm.avgQualityScore
        }))
      }
    ];
  };

  if (loading) {
    return (
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>Developer Performance</CardTitle>
          <CardDescription>Loading developer data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] animate-pulse bg-muted"></div>
        </CardContent>
      </Card>
    );
  }

  const comparisonData = getComparisonData();

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Developer Performance</CardTitle>
          <CardDescription>Comparative metrics across team members</CardDescription>
        </div>
        <Select
          value={selectedDeveloper}
          onValueChange={setSelectedDeveloper}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select developer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Developers</SelectItem>
            {developers.map(dev => (
              <SelectItem key={dev.id} value={dev.id.toString()}>
                {dev.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Developer Cards */}
          {selectedDeveloper === "all" ? (
            developerMetrics.slice(0, 3).map(dev => (
              <Card key={dev.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                      src={developers.find(d => d.id === dev.id)?.avatar} 
                      alt={dev.name} 
                    />
                    <AvatarFallback>{dev.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{dev.name}</CardTitle>
                    <CardDescription>{developers.find(d => d.id === dev.id)?.role}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">PRs Merged</div>
                      <div className="text-xl font-semibold">{dev.prCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg. Cycle Time</div>
                      <div className="text-xl font-semibold">{dev.avgCycleTime} hrs</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">PR Quality</div>
                      <div className="text-xl font-semibold">
                        <Badge className={
                          dev.avgQualityScore >= 80 ? "bg-green-500" : 
                          dev.avgQualityScore >= 60 ? "bg-yellow-500" : 
                          "bg-red-500"
                        }>
                          {dev.avgQualityScore}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">PR Size</div>
                      <div className="text-xl font-semibold">{dev.avgPRSize} LOC</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // Show detailed view of selected developer
            developerMetrics
              .filter(dm => dm.id === parseInt(selectedDeveloper))
              .map(dev => (
                <Card key={dev.id} className="col-span-full">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={developers.find(d => d.id === dev.id)?.avatar} 
                        alt={dev.name} 
                      />
                      <AvatarFallback>{dev.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl">{dev.name}</CardTitle>
                      <CardDescription className="text-base">
                        {developers.find(d => d.id === dev.id)?.role} • {developers.find(d => d.id === dev.id)?.experience}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                      <div>
                        <div className="text-muted-foreground">PRs Merged</div>
                        <div className="text-2xl font-semibold">{dev.prCount}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg. Cycle Time</div>
                        <div className="text-2xl font-semibold">{dev.avgCycleTime} hrs</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">PR Quality</div>
                        <div className="text-2xl font-semibold">
                          <Badge className={
                            dev.avgQualityScore >= 80 ? "bg-green-500" : 
                            dev.avgQualityScore >= 60 ? "bg-yellow-500" : 
                            "bg-red-500"
                          }>
                            {dev.avgQualityScore}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">PR Size</div>
                        <div className="text-2xl font-semibold">{dev.avgPRSize} LOC</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>

        {/* Comparison Charts */}
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-semibold">Comparative Metrics</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {comparisonData.map(metric => (
              <Card key={metric.name}>
                <CardHeader>
                  <CardTitle className="text-base">{metric.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={metric.data}
                        margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar 
                          dataKey="value" 
                          fill={
                            metric.name === "Cycle Time (hrs)" ? "var(--chart-2)" :
                            metric.name === "Review Time (hrs)" ? "var(--chart-3)" :
                            "var(--chart-4)"
                          } 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 