import { AppSidebar } from "@/components/app-sidebar"
import { InvestmentAreaDistribution } from "@/components/investment-area-distribution"
import { RecommendationsInsights } from "@/components/recommendations-insights"
import { DashboardHeader } from "@/components/dashboard-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { ErrorBoundary } from "@/components/ui/error-boundary"

export default function AnalyticsPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <DashboardHeader pageTitle="Analytics Overview" />
        <ErrorBoundary>
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="px-4 lg:px-6">
                  <InvestmentAreaDistribution />
                </div>
                <div className="px-4 lg:px-6">
                  <RecommendationsInsights />
                </div>
              </div>
            </div>
          </div>
        </ErrorBoundary>
      </SidebarInset>
    </SidebarProvider>
  )
}
