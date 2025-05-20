import React from 'react';
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Suspense } from 'react';
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { getOrganizationInstallations } from '@/app/api/services/github-orgs';
import { SettingsContent } from "@/components/settings-content";

// Mark this route as dynamic since it uses headers() via getOrganizationInstallations
export const dynamic = 'force-dynamic';

// This is a Server Component - it can use getOrganizationInstallations
export default async function SettingsPage() {
  // Fetch data in the server component - don't await
  const organizationsPromise = getOrganizationInstallations();

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader pageTitle="Settings" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <Suspense fallback={<div className="p-6">Loading settings...</div>}>
                <SettingsContent organizationsPromise={organizationsPromise} />
              </Suspense>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 