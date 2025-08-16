import { Suspense } from "react"
import { ActionableRecommendations } from "@/components/actionable-recommendations"
import { AppSidebar } from "@/components/app-sidebar"
import { CompactEngineeringMetrics } from "@/components/compact-engineering-metrics"
import { DashboardControls } from "@/components/ui/dashboard-controls"
import { InvestmentAreaDistribution } from "@/components/investment-area-distribution"
import { PRActivityTable } from "@/components/pr-activity-table"
import { SectionCardsEngineering } from "@/components/section-cards-engineering"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { SetupStatusAlert } from "@/components/ui/setup-status-alert"
import { DemoModeBanner } from "@/components/ui/demo-mode-banner"
import { getDemoModeInfo } from "@/lib/demo-mode"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { auth } from "@/auth"
import { ensureUserExists } from "@/lib/user-utils"
import { redirect } from "next/navigation"

const SIDEBAR_STYLES = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
  "--header-height": "calc(var(--spacing) * 12)",
} as React.CSSProperties

// Enable PPR for this route
export const experimental_ppr = true

// Skeleton components for loading states
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

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/sign-in')
  }
  
  // Ensure user exists in database - this handles all user creation/update logic
  await ensureUserExists(session.user)
  
  // Get demo mode info for banner
  const demoInfo = getDemoModeInfo()
  const setupIncomplete = session.hasGithubApp === false

  return (
    <SidebarProvider style={SIDEBAR_STYLES}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader pageTitle="Dashboard Overview" />
        
        {demoInfo.isDemoMode && (
          <div className="px-4 pt-4 lg:px-6">
            <DemoModeBanner missingServices={demoInfo.missingServices} />
          </div>
        )}
        
        {setupIncomplete && !demoInfo.isDemoMode && (
          <div className="px-4 pt-4 lg:px-6">
            <SetupStatusAlert />
          </div>
        )}
        
        <div className="px-4 lg:px-6">
          <DashboardControls />
        </div>
        
        <ErrorBoundary>
          <main className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
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
                
                {/* Secondary metrics grid - dynamic data */}
                <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2">
                  <Suspense fallback={<CompactMetricsSkeleton />}>
                    <CompactEngineeringMetrics />
                  </Suspense>
                  <Suspense fallback={<CompactMetricsSkeleton />}>
                    <InvestmentAreaDistribution />
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
