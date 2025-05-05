import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaEngineering } from "@/components/chart-area-engineering"
import { DeveloperPerformance } from "@/components/developer-performance"
import { InvestmentAreaDistribution } from "@/components/investment-area-distribution"
import { PRActivityTable } from "@/components/pr-activity-table"
import { PRQualityDetails } from "@/components/pr-quality-details"
import { RecommendationsInsights } from "@/components/recommendations-insights"
import { RepositoryInsights } from "@/components/repository-insights"
import { SectionCardsEngineering } from "@/components/section-cards-engineering"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function Page() {
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
              <SectionCardsEngineering />
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2">
                <ChartAreaEngineering />
                <InvestmentAreaDistribution />
              </div>
              <PRActivityTable />
              <RecommendationsInsights />
              <PRQualityDetails />
              <DeveloperPerformance />
              <RepositoryInsights />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// Temporary mock data until we implement the engineering-focused data table
const data = [
  {
    "id": 1,
    "header": "Add user authentication",
    "type": "Feature",
    "status": "In Process",
    "target": "18",
    "limit": "5",
    "reviewer": "Eddie Lake"
  },
  {
    "id": 2,
    "header": "Fix responsive layout issues",
    "type": "Bug",
    "status": "Done",
    "target": "29",
    "limit": "24",
    "reviewer": "Eddie Lake"
  },
  {
    "id": 3,
    "header": "Implement API pagination",
    "type": "Feature",
    "status": "Done",
    "target": "10",
    "limit": "13",
    "reviewer": "Eddie Lake"
  },
  {
    "id": 4,
    "header": "Update dependencies",
    "type": "Maintenance",
    "status": "Done",
    "target": "27",
    "limit": "23",
    "reviewer": "Jamik Tashpulatov"
  },
  {
    "id": 5,
    "header": "Refactor data fetching logic",
    "type": "Refactor",
    "status": "In Process",
    "target": "2",
    "limit": "16",
    "reviewer": "Jamik Tashpulatov"
  }
];
