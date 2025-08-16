"use client"

import React from "react"
import Link from "next/link"
import { IconBrandGithub, IconChartBar } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { PrcatLogo } from "@/components/ui/prcat-logo"

import { cn } from "@/lib/utils"

export function AnimatedHeader() {
  const [isScrolled, setIsScrolled] = React.useState(false)

  React.useEffect(() => {
    let ticking = false
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 50)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className="fixed z-20 w-full px-2">
      <div className={cn(
        'mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12',
        isScrolled && 'bg-[#0c0c0c]/95 max-w-4xl rounded-2xl border border-[#262626]/60 backdrop-blur-lg shadow-xl shadow-black/30 lg:px-5'
      )}>
        <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
          <Link href="/" className="flex items-center space-x-2">
            <PrcatLogo className="h-8 w-8" />
          </Link>
          
          <nav className="flex items-center gap-3">
            <Button 
              asChild 
              variant="outline" 
              size="sm"
              className={cn(isScrolled && 'lg:hidden', 'border-[#262626]/60 bg-transparent text-white hover:bg-white/10')}
            >
              <Link href="https://github.com/vorcigernix/pr_cat" target="_blank" rel="noopener noreferrer">
                <IconBrandGithub className="mr-2 h-4 w-4" />
                GitHub
              </Link>
            </Button>
            <Button 
              asChild 
              variant="default" 
              size="sm"
              className={cn(isScrolled ? 'lg:inline-flex' : '', 'bg-white text-black hover:bg-zinc-100 shadow-lg')}
            >
              <Link href="/dashboard">
                <IconChartBar className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
} 