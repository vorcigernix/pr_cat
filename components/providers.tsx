"use client"

import { SessionProvider } from "next-auth/react"

import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"

type ProvidersProps = {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="pr-cat-theme"
        enableColorScheme
      >
        {children}
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  )
}
