"use client";

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useMetricsSummary } from "@/hooks/use-metrics";
import { useTeamFilterParams } from "@/hooks/use-team-filter";

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {Array(4).fill(0).map((_, i) => (
        <Card key={i} className="@container/card">
          <CardHeader>
            <CardDescription>Loading...</CardDescription>
            <div className="h-8 w-24 animate-pulse bg-muted rounded mt-1"></div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="h-4 w-32 animate-pulse bg-muted rounded"></div>
            <div className="h-4 w-48 animate-pulse bg-muted rounded"></div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// Error component
function ErrorCard({ error, refresh }: { error: Error; refresh: () => void }) {
  return (
    <div className="px-4 lg:px-6">
      <Card className="p-4">
        <CardTitle className="mb-2">Error Loading Metrics</CardTitle>
        <CardDescription className="text-red-500">{error.message}</CardDescription>
        <button 
          onClick={refresh} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </Card>
    </div>
  );
}

export function SectionCardsEngineering() {
  const filters = useTeamFilterParams();
  const { data, isLoading, error, refresh } = useMetricsSummary(filters);
  if (isLoading && !data) return <LoadingSkeleton />;
  if (error && !data) return <ErrorCard error={error} refresh={refresh} />;
  if (!data) return null;

  const metrics = [
    { title: 'PRs Merged', value: data.prsMergedThisWeek, description: `${data.prsMergedLastWeek} in the preceding period of the same length.` },
    { title: 'Average PR Size', value: data.sizedPRCount === 0 ? 'Not available' : `${data.averagePRSize} LOC`, description: 'Recorded additions + deletions on PRs created in this period. PRs with missing sizes are excluded.' },
    { title: 'Open PRs', value: data.openPRCount, description: 'PRs created in this period that are still open.' },
    { title: 'Categorized PRs', value: `${data.categorizationRate}%`, description: 'Share of PRs created in this period with an assigned investment area.' },
  ];
  return <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
    {error && <p role="alert" className="col-span-full text-sm text-destructive">Refresh failed. Showing the last loaded values. <button className="underline" onClick={() => void refresh()}>Retry</button></p>}
    {metrics.map(metric => <Card key={metric.title}>
      <CardHeader>
        <CardDescription>{metric.title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{metric.value}</CardTitle>
      </CardHeader>
      <CardFooter className="text-sm text-muted-foreground">{metric.description}</CardFooter>
    </Card>)}
  </div>;
}
