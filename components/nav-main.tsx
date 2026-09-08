"use client"

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

export function NavMain({
  items,
  currentPath,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
  currentPath?: string
}) {
  const searchParams = useSearchParams()
  const filterParams = new URLSearchParams()
  for (const key of ['organizationId', 'teamId', 'repositoryId', 'timeRange']) {
    const value = searchParams.get(key)
    if (value) filterParams.set(key, value)
  }
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const isItemActive = currentPath === item.url

            return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                tooltip={item.title}
                isActive={isItemActive}
                asChild
              >
                <Link href={item.url.startsWith('/dashboard') && filterParams.size ? `${item.url}?${filterParams}` : item.url} aria-current={isItemActive ? "page" : undefined}>
                  {item.icon && <item.icon />}
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
