"use client"

import { SessionProvider } from "next-auth/react"

import { ThemeProvider } from "@/components/theme-provider"

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
      </ThemeProvider>
    </SessionProvider>
  )
}
