import { Suspense } from 'react';
import { ChartAreaEngineering } from '@/components/chart-area-engineering';
import { getTimeSeriesData } from '@/app/api/services/metrics-data';

export default async function ChartAreaWrapper() {
  // Fetch data directly in the server component
  const timeSeriesData = await getTimeSeriesData();
  
  return (
    <Suspense fallback={<ChartAreaSkeleton />}>
      <ChartAreaEngineering initialChartData={timeSeriesData} />
    </Suspense>
  );
}

function ChartAreaSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="h-[300px] bg-gray-100 dark:bg-gray-900 rounded animate-pulse mt-4" />
    </div>
  );
} 