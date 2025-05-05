import { AppSidebar } from "@/components/app-sidebar"
import { CompactEngineeringMetrics } from "@/components/compact-engineering-metrics"
import { InvestmentAreaDistribution } from "@/components/investment-area-distribution"
import { PRActivityTable } from "@/components/pr-activity-table"
import { SectionCardsEngineering } from "@/components/section-cards-engineering"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function DashboardPage() {
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
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <h1 className="text-2xl font-semibold">Dashboard Overview</h1>
              </div>
              <SectionCardsEngineering />
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2">
                <CompactEngineeringMetrics />
                <InvestmentAreaDistribution />
              </div>
              <PRActivityTable />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
