"use client"

import * as React from "react"
import { type Icon } from "@tabler/icons-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary({
  items,
  currentPath,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: Icon
  }[]
  currentPath?: string
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const searchParams = useSearchParams()
  const filterParams = new URLSearchParams()
  for (const key of ['organizationId', 'teamId', 'repositoryId', 'timeRange']) {
    const value = searchParams.get(key)
    if (value) filterParams.set(key, value)
  }
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isItemActive = currentPath === item.url

            return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                isActive={isItemActive}
                asChild
              >
                <Link href={item.url.startsWith('/dashboard') && filterParams.size ? `${item.url}?${filterParams}` : item.url} aria-current={isItemActive ? "page" : undefined}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
