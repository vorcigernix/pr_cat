import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaEngineering } from "@/components/chart-area-engineering"
import { DateRangePickerWithPresets } from "@/components/date-range-picker"
import { PRQualityDetails } from "@/components/pr-quality-details"
import { RepositoryFilter } from "@/components/repository-filter"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function LifecyclePage() {
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
        <SiteHeader pageTitle="PR Lifecycle" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="flex justify-between items-center px-4 lg:px-6">
                <div className="flex gap-3">
                  <RepositoryFilter />
                  <DateRangePickerWithPresets />
                </div>
              </div>
              <div className="px-4 lg:px-6">
                <ChartAreaEngineering />
              </div>
              <PRQualityDetails />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 