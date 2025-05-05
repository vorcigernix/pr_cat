"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  IconChartBar,
  IconDashboard,
  IconFolder,
  IconHelp,
  IconListDetails,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { PrcatLogo } from "@/components/ui/prcat-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
      isActive: pathname === "/dashboard"
    },
    {
      title: "Lifecycle",
      url: "/dashboard/lifecycle",
      icon: IconListDetails,
      isActive: pathname === "/dashboard/lifecycle"
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: IconChartBar,
      isActive: pathname === "/dashboard/analytics"
    },
    {
      title: "Projects",
      url: "/dashboard/projects",
      icon: IconFolder,
      isActive: pathname === "/dashboard/projects"
    },
    {
      title: "Team",
      url: "/dashboard/team",
      icon: IconUsers,
      isActive: pathname === "/dashboard/team"
    },
  ]

  const navSecondary = [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
      isActive: pathname === "/dashboard/settings"
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
      isActive: false
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
      isActive: false
    },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/" className="flex items-center gap-1">
                <PrcatLogo fontSize="text-base" iconSize="h-4 w-4" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
