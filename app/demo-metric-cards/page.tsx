import MetricsCardsWrapper from '@/app/components/metrics-cards-wrapper';
import ChartAreaWrapper from '@/app/components/chart-area-wrapper';

export default function DemoMetricCardsPage() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Server Component Data Fetching Demo</h1>
        <p className="text-muted-foreground">
          This page demonstrates server-side data fetching with React Server Components.
          All metrics data is fetched on the server and passed to client components.
        </p>
      </div>
      
      <div className="p-4 border border-amber-200 bg-amber-50 rounded-md dark:bg-amber-950/20 dark:border-amber-800">
        <h2 className="text-lg font-semibold mb-1">How This Works</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Server components (<code>MetricsCardsWrapper</code>, <code>ChartAreaWrapper</code>) fetch data</li>
          <li>Data is passed as props to client components</li>
          <li>Client components don't need to fetch data on mount</li>
          <li>Improved performance and SEO</li>
          <li>Simplified client component code</li>
        </ol>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-4">Metrics Cards Example</h2>
      <MetricsCardsWrapper />
      
      <h2 className="text-xl font-semibold mt-8 mb-4">Chart Area Example</h2>
      <ChartAreaWrapper />
      
      <div className="mt-8 p-4 border rounded-md">
        <h3 className="font-medium mb-2">👉 Key Benefits:</h3>
        <ul className="list-disc pl-5">
          <li>No loading state needed in the client components</li>
          <li>Data is already available on first render</li>
          <li>Reduced client-side JavaScript</li>
          <li>Better error handling on the server</li>
          <li>Pages load faster with less client-side processing</li>
        </ul>
      </div>
    </div>
  );
} 