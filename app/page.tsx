import { auth } from "@/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { IconBrandGithub } from "@tabler/icons-react";
import Link from "next/link";

import data from "./dashboard/data.json";

export default async function Home() {
  const session = await auth();
  
  // If not logged in, show welcome page
  if (!session || !session.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background">
        <h1 className="text-4xl font-bold mb-4">DORA Metrics Portal</h1>
        <p className="text-xl mb-8 max-w-2xl">
          Track and improve your DevOps performance metrics
        </p>
        <Link href="/sign-in">
          <Button className="mb-8 flex items-center gap-2" size="lg">
            <IconBrandGithub className="h-5 w-5" />
            Sign in with GitHub
          </Button>
        </Link>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 max-w-md dark:bg-blue-950 dark:border-blue-900">
          <h2 className="text-lg font-medium text-blue-800 mb-2 dark:text-blue-300">What are DORA Metrics?</h2>
          <p className="text-blue-700 dark:text-blue-400">
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
