import { AppSidebar } from "@/components/app-sidebar"
import { InvestmentAreaDistribution } from "@/components/investment-area-distribution"
import { RecommendationsInsights } from "@/components/recommendations-insights"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { IconDownload } from "@tabler/icons-react"

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
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="flex justify-between items-center px-4 lg:px-6">
                <h1 className="text-2xl font-semibold">Team Collaboration Insights</h1>
                <Button variant="outline" size="sm">
                  <IconDownload className="mr-2 h-4 w-4" />
                  Export Team Report
                </Button>
              </div>
              <div className="px-4 lg:px-6">
                <InvestmentAreaDistribution />
              </div>
              <div className="px-4 lg:px-6">
                <RecommendationsInsights />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 