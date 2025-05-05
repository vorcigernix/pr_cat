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
    id: number;
    name: string;
  };
  repository: {
    id: number;
    name: string;
  };
  status: string;
  createdAt: string;
  reviewStartedAt: string;
  mergedAt: string;
  deployedAt: string;
  reviewers: Array<{ id: number; name: string }>;
  linesAdded: number;
  linesRemoved: number;
  files: number;
  commentCount: number;
  approvalCount: number;
  reviewThoroughness: number;
  timeToFirstReview: number;
  reviewTime: number;
  cycleTime: number;
  qualityScore: number;
  investmentArea?: string;
};

export function PRActivityTable() {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // In a real app, this would be an API call
        const data = await import("@/app/dashboard/pull-requests.json");
        // Get the 10 most recent PRs
        const sortedPRs = [...data.default]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);
        setPullRequests(sortedPRs);
      } catch (error) {
        console.error("Failed to load pull request data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "merged":
        return <Badge className="bg-green-500">Merged</Badge>;
      case "open":
        return <Badge className="bg-blue-500">Open</Badge>;
      case "closed":
        return <Badge className="bg-red-500">Closed</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  }

  function getInvestmentAreaBadge(area: string | undefined) {
    if (!area) return null;
    
    switch (area.toLowerCase()) {
      case "bug fixes":
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900">{area}</Badge>;
      case "technical debt":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900">{area}</Badge>;
      case "new features":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900">{area}</Badge>;
      case "product debt":
        return <Badge variant="outline" className="bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900">{area}</Badge>;
      default:
        return <Badge variant="outline">{area}</Badge>;
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
                  <TableCell>{getInvestmentAreaBadge(pr.investmentArea || randomInvestmentArea())}</TableCell>
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

// Helper function to randomly assign investment areas for demo purposes
function randomInvestmentArea() {
  const areas = ["Bug Fixes", "Technical Debt", "New Features", "Product Debt"];
  return areas[Math.floor(Math.random() * areas.length)];
} 