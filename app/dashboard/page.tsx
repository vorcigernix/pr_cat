import { Suspense } from "react"
import { ActionableRecommendations } from "@/components/actionable-recommendations"
import { AppSidebar } from "@/components/app-sidebar"
import { CompactEngineeringMetrics } from "@/components/compact-engineering-metrics"
import { EnhancedCompactEngineeringMetrics } from "@/components/enhanced-compact-engineering-metrics"
import { DashboardHeader } from "@/components/dashboard-header"
import { InvestmentAreaDistribution } from "@/components/investment-area-distribution"
import { EnhancedInvestmentAreaDistribution } from "@/components/enhanced-investment-area-distribution"
import { PRActivityTable } from "@/components/pr-activity-table"
import { SectionCardsEngineering } from "@/components/section-cards-engineering"
import { TeamPerformanceSummary } from "@/components/team-performance-summary"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { SetupStatusAlert } from "@/components/ui/setup-status-alert"
import { DemoModeBanner } from "@/components/ui/demo-mode-banner"
import { EnvironmentConfig } from "@/lib/core"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { auth } from "@/auth"
import { ensureUserExists } from "@/lib/user-utils"
import { redirect } from "next/navigation"

// Keep the same sidebar styles as original
const SIDEBAR_STYLES = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
  "--header-height": "calc(var(--spacing) * 12)",
} as React.CSSProperties

// Enable PPR for this route
export const experimental_ppr = true

// Server-side data fetching for slow components
async function fetchChartData(organizationId: string) {
  try {
    // Fetch both slow API endpoints in parallel
    const [timeSeriesRes, categoryDistributionRes] = await Promise.allSettled([
      // Team Flow Metrics data
      fetch(`${process.env.NEXTAUTH_URL}/api/metrics/time-series`, {
        headers: { 'x-organization-id': organizationId }
      }),
      // Focus Distribution data  
      fetch(`${process.env.NEXTAUTH_URL}/api/pull-requests/category-distribution?timeRange=30d&format=timeseries`, {
        headers: { 'x-organization-id': organizationId }
      })
    ]);

    let timeSeriesData = null;
    let categoryDistributionData = null;

    // Extract successful results
    if (timeSeriesRes.status === 'fulfilled' && timeSeriesRes.value.ok) {
      timeSeriesData = await timeSeriesRes.value.json();
    }

    if (categoryDistributionRes.status === 'fulfilled' && categoryDistributionRes.value.ok) {
      categoryDistributionData = await categoryDistributionRes.value.json();
    }

    return {
      timeSeriesData,
      categoryDistributionData,
    };
  } catch (error) {
    console.warn('Server-side chart data fetch failed (non-blocking):', error);
    return {
      timeSeriesData: null,
      categoryDistributionData: null,
    };
  }
}

export default async function DashboardPage() {
  // Exact same authentication flow as original
  const session = await auth()
  const environmentConfig = EnvironmentConfig.getInstance()
  
  // Check if we're in demo mode for banner display only
  const isDemoMode = environmentConfig.isDemoMode()
  
  // In demo mode, the auth service provides mock sessions automatically
  // In production mode, require real authentication
  if (!isDemoMode && !session?.user) {
    redirect('/sign-in')
  }
  
  // In production mode, ensure user exists in database
  if (!isDemoMode && session?.user) {
    await ensureUserExists(session.user)
  }
  
  // Get organization info for server-side data fetching
  const organizations = session?.organizations || []
  const primaryOrg = organizations[0]
  const orgId = primaryOrg?.id?.toString() || "demo-org-1"
  
  // Fetch chart data server-side for performance boost
  const chartData = await fetchChartData(orgId);
  
  // Setup incomplete only applies to production mode
  const setupIncomplete = !isDemoMode && session?.hasGithubApp === false;

  return (
    <SidebarProvider style={SIDEBAR_STYLES}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <DashboardHeader pageTitle="Dashboard" />
        
        {isDemoMode && (
          <div className="pt-4 pb-2">
            <DemoModeBanner />
          </div>
        )}
        
        {setupIncomplete && (
          <div className="px-4 pt-4 lg:px-6">
            <SetupStatusAlert />
          </div>
        )}
        

        
        <ErrorBoundary>
          <main className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                {/* Team Performance Summary - focused on retrospectives */}
                <div className="px-4 lg:px-6">
                  <Suspense fallback={<TeamPerformanceSkeleton />}>
                    <TeamPerformanceSummary />
                  </Suspense>
                </div>

                {/* Main metrics cards - dynamic data */}
                <Suspense fallback={<MetricsCardsSkeleton />}>
                  <SectionCardsEngineering />
                </Suspense>
                
                {/* Recommendations - dynamic data */}
                <div className="px-4 lg:px-6">
                  <Suspense fallback={<RecommendationsSkeleton />}>
                    <ActionableRecommendations />
                  </Suspense>
                </div>
                
                {/* Secondary metrics grid - enhanced with server-side data */}
                <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2">
                  <Suspense fallback={<CompactMetricsSkeleton />}>
                    {chartData.timeSeriesData ? (
                      <EnhancedCompactEngineeringMetrics initialData={chartData.timeSeriesData} />
                    ) : (
                      <CompactEngineeringMetrics />
                    )}
                  </Suspense>
                  <Suspense fallback={<CompactMetricsSkeleton />}>
                    {chartData.categoryDistributionData ? (
                      <EnhancedInvestmentAreaDistribution initialData={chartData.categoryDistributionData} />
                    ) : (
                      <InvestmentAreaDistribution />
                    )}
                  </Suspense>
                </div>
                
                {/* PR Activity table - dynamic data */}
                <Suspense fallback={<TableSkeleton />}>
                  <PRActivityTable />
                </Suspense>
              </div>
            </div>
          </main>
        </ErrorBoundary>
      </SidebarInset>
    </SidebarProvider>
  )
}

// Skeleton components for loading states (same as original)
function MetricsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border rounded-lg p-6">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CompactMetricsSkeleton() {
  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="space-y-4">
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 w-full bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="bg-card border rounded-lg p-6 mx-4 lg:mx-6">
      <div className="space-y-4">
        <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

function RecommendationsSkeleton() {
  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 w-full bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

function TeamPerformanceSkeleton() {
  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}