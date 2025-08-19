"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { useState } from "react"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu"
import { IconBrandGithub, IconMoon, IconSun, IconDeviceDesktop, IconLoader2 } from "@tabler/icons-react"

export function NavUser() {
  const { } = useSidebar()
  const { data: session } = useSession()
  const { setTheme, theme } = useTheme()
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await signIn("github", { callbackUrl: "/dashboard" })
    } catch (error) {
      console.error("Sign in error:", error)
      setIsSigningIn(false)
    }
    // Note: We don't set loading to false here because the page will redirect
  }

  // If not authenticated, show GitHub login button
  if (!session) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton 
            size="lg" 
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            onClick={handleSignIn}
            disabled={isSigningIn}
          >
            <div className="flex items-center justify-center h-8 w-8">
              {isSigningIn ? (
                <IconLoader2 className="h-5 w-5 animate-spin" />
              ) : (
                <IconBrandGithub className="h-5 w-5" />
              )}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {isSigningIn ? "Signing in..." : "Sign in"}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {isSigningIn ? "Please wait..." : "with GitHub"}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // If authenticated, show user profile
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer">
              <Avatar className="h-8 w-8 border">
                <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                <AvatarFallback>{session?.user?.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">My Account</span>
                <span className="text-muted-foreground truncate text-xs">
                  {session?.user?.name || session?.user?.email || "Manage your account"}
                </span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {session?.user?.name || session?.user?.email || "Account"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <IconSun className="h-4 w-4 mr-2" />
                Theme
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <IconSun className="h-4 w-4 mr-2" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <IconMoon className="h-4 w-4 mr-2" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <IconDeviceDesktop className="h-4 w-4 mr-2" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
