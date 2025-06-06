import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { TeamPerformanceMetrics } from "@/components/team-performance-metrics"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function TeamPage() {
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
        <SiteHeader pageTitle="Team Performance" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <TeamPerformanceMetrics />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 