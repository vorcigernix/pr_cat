import { Suspense } from 'react';
import { SectionCardsEngineering } from '@/components/section-cards-engineering';

export default function MetricsCardsWrapper() {
  return (
    <Suspense fallback={<MetricsCardsSkeleton />}>
      <SectionCardsEngineering />
    </Suspense>
  );
}

function MetricsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-2">
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-9 w-16 bg-gray-300 dark:bg-gray-700 rounded-md animate-pulse" />
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
} 