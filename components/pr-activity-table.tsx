"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconCalendar, IconCheck, IconClock } from "@tabler/icons-react";

type PullRequest = {
  id: number;
  title: string;
  number: number;
  developer: {
    id: number | string;
    name: string;
  };
  repository: {
    id: number;
    name: string;
  };
  status: string;
  createdAt: string;
  mergedAt: string;
  cycleTime: number;
  investmentArea?: string;
  linesAdded?: number;
  linesRemoved?: number;
  files?: number;
};

export function PRActivityTable() {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch real PR data from our API
        const response = await fetch('/api/pull-requests/recent');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch pull requests: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setPullRequests(data);
      } catch (error) {
        console.error("Failed to load pull request data:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  function formatDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "merged":
        return <Badge className="bg-green-700 text-white hover:bg-green-800">Merged</Badge>;
      case "open":
        return <Badge className="bg-blue-700 text-white hover:bg-blue-800">Open</Badge>;
      case "closed":
        return <Badge className="bg-gray-700 text-white hover:bg-gray-800">Closed</Badge>;
      default:
        return <Badge className="bg-gray-700 text-white hover:bg-gray-800">{status}</Badge>;
    }
  }

  function getInvestmentAreaBadge(area: string | undefined) {
    if (!area) return null;
    
    switch (area.toLowerCase()) {
      case "bug fixes":
      case "bug fix":
      case "bugs":
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900">{area}</Badge>;
      case "new features":
      case "feature":
      case "enhancement":
        return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900">{area}</Badge>;
      case "technical debt":
      case "tech debt":
      case "refactoring":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900">{area}</Badge>;
      case "product debt":
      case "ux improvement":
      case "ui":
        return <Badge variant="outline" className="bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900">{area}</Badge>;
      case "documentation":
      case "docs":
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900">{area}</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-900">{area}</Badge>;
    }
  }

  if (loading) {
    return (
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>Recent Pull Requests</CardTitle>
          <CardDescription>Loading pull request data...</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[400px] w-full animate-pulse bg-muted"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>Recent Pull Requests</CardTitle>
          <CardDescription className="text-red-500">Error loading data</CardDescription>
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

  if (pullRequests.length === 0) {
    return (
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>Recent Pull Requests</CardTitle>
          <CardDescription>No pull requests found</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No recent pull request activity. Pull requests will appear here once they're created in your repositories.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader>
        <CardTitle>Recent Pull Requests</CardTitle>
        <CardDescription>Recent pull request activity across all repositories</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Repository</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <IconClock size={16} />
                    <span>Cycle Time</span>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <IconCheck size={16} />
                    <span>Investment Area</span>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <IconCalendar size={16} />
                    <span>Created</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pullRequests.map((pr) => (
                <TableRow key={pr.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      #{pr.number} {pr.title}
                    </div>
                  </TableCell>
                  <TableCell>{pr.repository.name}</TableCell>
                  <TableCell>{pr.developer.name}</TableCell>
                  <TableCell>{getStatusBadge(pr.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span>{pr.cycleTime.toFixed(1)} hrs</span>
                    </div>
                  </TableCell>
                  <TableCell>{getInvestmentAreaBadge(pr.investmentArea)}</TableCell>
                  <TableCell>{formatDate(pr.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 