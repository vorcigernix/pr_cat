import { auth } from "@clerk/nextjs/server";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

import data from "./dashboard/data.json";

export default async function Home() {
  const { userId } = await auth();
  
  // If not logged in, show welcome page
  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center bg-background">
        <h1 className="text-4xl font-bold mb-4">Welcome to DORA Metrics Portal</h1>
        <p className="text-xl mb-8 max-w-2xl">
          Sign in to view your DevOps performance metrics and improve your team's delivery capabilities.
        </p>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 max-w-md">
          <h2 className="text-lg font-medium text-blue-800 mb-2">What are DORA Metrics?</h2>
          <p className="text-blue-700">
            DORA (DevOps Research and Assessment) metrics measure software delivery performance:
            Deployment Frequency, Lead Time for Changes, Change Failure Rate, and Time to Restore Service.
          </p>
        </div>
      </div>
    );
  }
  
  // If logged in, show dashboard
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
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={data} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
