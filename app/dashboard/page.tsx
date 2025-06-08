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
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { auth } from "@/auth"
import { ensureUserExists } from "@/lib/user-utils"
import { redirect } from "next/navigation"

const SIDEBAR_STYLES = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
  "--header-height": "calc(var(--spacing) * 12)",
} as React.CSSProperties

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/sign-in')
  }
  
  // Ensure user exists in database - this handles all user creation/update logic
  await ensureUserExists(session.user)
  
  const setupIncomplete = session.hasGithubApp === false

  return (
    <SidebarProvider style={SIDEBAR_STYLES}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader pageTitle="Dashboard Overview" />
        
        {setupIncomplete && (
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
                <SectionCardsEngineering />
                
                <div className="px-4 lg:px-6">
                  <ActionableRecommendations />
                </div>
                
                <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2">
                  <CompactEngineeringMetrics />
                  <InvestmentAreaDistribution />
                </div>
                
                <PRActivityTable />
              </div>
            </div>
          </main>
        </ErrorBoundary>
      </SidebarInset>
    </SidebarProvider>
  )
}
