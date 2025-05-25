'use client'

import React from 'react'
import Link from "next/link";
import Image from "next/image";
import { IconArrowRight, IconCode, IconChartBar, IconClock, IconReportAnalytics, IconTargetArrow, IconSpeakerphone, IconUsers, IconTrendingUp, IconBrandGithub, IconHeart, IconPresentation, IconSchool, IconBuildingStore } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { PrcatLogo } from "@/components/ui/prcat-logo";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { cn } from "@/lib/utils";

export default function Home() {
  const [isScrolled, setIsScrolled] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky Animated Header */}
      <header className="fixed z-20 w-full px-2">
        <div className={cn(
          'mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12',
          isScrolled && 'bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5'
        )}>
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <Link href="/" className="flex items-center space-x-2">
              <PrcatLogo className="h-8 w-8" />
            </Link>
            
            <div className="flex items-center gap-3">
              <ModeToggle />
              <Button 
                asChild 
                variant="outline" 
                size="sm"
                className={cn(isScrolled && 'lg:hidden')}
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
                className={cn(isScrolled ? 'lg:inline-flex' : '')}
              >
                <Link href="/dashboard">
                  <IconChartBar className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Open Source First */}
      <section className="py-16 md:py-24 lg:py-32 relative overflow-hidden pt-24 md:pt-36">
        <div className="container max-w-6xl mx-auto px-4 relative">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <IconBrandGithub className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Open Source</span>
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Engineering Analytics<br />
              <span className="text-yellow-600 dark:text-yellow-400">You Can Actually Trust</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Self-hosted GitHub PR analytics for engineering leaders who want transparency, control, and insights that actually help their teams grow. No vendor lock-in, no hidden algorithms.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" asChild>
                <Link href="https://github.com/vorcigernix/pr_cat" target="_blank" rel="noopener noreferrer">
                  <IconBrandGithub className="mr-2 h-4 w-4" />
                  Contribute on GitHub
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#why-open-source">
                  Why Open Source?
                </Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <IconHeart className="h-4 w-4 text-red-500" />
                <span>MIT Licensed</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCode className="h-4 w-4 text-blue-500" />
                <span>Self-Hostable</span>
              </div>
              <div className="flex items-center gap-2">
                <IconUsers className="h-4 w-4 text-purple-500" />
                <span>Community Driven</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Dashboard Image */}
        <div className="mx-auto -mt-16 max-w-7xl">
          <div className="mr-0 pl-8 lg:mr-0 lg:pl-16" style={{ perspective: '1200px' }}>
            <div style={{ transform: 'rotateX(20deg)' }}>
              <div className="lg:h-[44rem] relative" style={{ transform: 'skewX(0.36rad)' }}>
                <Image
                  className="rounded-lg z-[2] relative border border-border/20"
                  src="/dashboard2.png"
                  alt="PR Cat Dashboard Screenshot"
                  width={2880}
                  height={2074}
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Open Source */}
      <section id="why-open-source" className="py-16 md:py-24 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Why Open Source Engineering Analytics?</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Because the best engineering tools are built by engineers, for engineers. Not by vendors trying to sell you a black box.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto mb-16">
            <div className="bg-background p-6 rounded-xl shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <IconCode className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Complete Transparency</h3>
              <p className="text-muted-foreground mb-4">
                See exactly how your data is processed. No hidden algorithms, no mysterious "proprietary metrics." Every calculation is open for inspection.
              </p>
              <Link href="https://github.com/vorcigernix/pr_cat" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                View the source code →
              </Link>
            </div>
            
            <div className="bg-background p-6 rounded-xl shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <IconTrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Your Data, Your Infrastructure</h3>
              <p className="text-muted-foreground mb-4">
                Deploy on your own servers. Your sensitive engineering data never leaves your environment. Full control, zero vendor dependency.
              </p>
              <Link href="https://github.com/vorcigernix/pr_cat#deployment" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                Deployment guide →
              </Link>
            </div>
            
            <div className="bg-background p-6 rounded-xl shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                <IconUsers className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Built by Engineers</h3>
              <p className="text-muted-foreground mb-4">
                Features requested by real engineering teams. No corporate roadmap driven by sales targets. Just tools that actually help developers.
              </p>
              <Link href="https://github.com/vorcigernix/pr_cat/discussions" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                Join the discussion →
              </Link>
            </div>
          </div>

          {/* Dashed separator line */}
          <div className="w-full border-t border-dashed border-border/50 mb-12"></div>

          {/* Support pill */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/60 dark:bg-black/20 border border-green-200 dark:border-green-800">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                With support from our friends at:
              </span>
            </div>
          </div>
          
          {/* Company logos */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 mb-12 p-6 rounded-xl bg-gray-50 dark:bg-gray-900/20">
            {/* Vercel */}
            <Link 
              href="https://vercel.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center h-12 grayscale hover:grayscale-0 transition-all duration-300"
            >
              <svg aria-label="Vercel logotype" className="h-8 w-auto text-gray-800 dark:text-white" role="img" viewBox="0 0 262 52" xmlns="http://www.w3.org/2000/svg">
                <path d="M59.8019 52L29.9019 0L0.00190544 52H59.8019ZM89.9593 49.6328L114.947 2.36365H104.139L86.9018 36.6921L69.6647 2.36365H58.8564L83.8442 49.6328H89.9593ZM260.25 2.36365V49.6329H251.302V2.36365H260.25ZM210.442 31.99C210.442 28.3062 211.211 25.0661 212.749 22.2699C214.287 19.4737 216.431 17.321 219.181 15.812C221.93 14.3029 225.146 13.5484 228.828 13.5484C232.09 13.5484 235.026 14.2585 237.636 15.6788C240.245 17.0991 242.319 19.2074 243.857 22.0036C245.395 24.7998 246.187 28.2174 246.234 32.2564V34.3202H219.88C220.066 37.2496 220.928 39.5576 222.466 41.2442C224.051 42.8864 226.171 43.7075 228.828 43.7075C230.505 43.7075 232.043 43.2637 233.441 42.376C234.839 41.4883 235.888 40.2899 236.587 38.7808L245.745 39.4466C244.626 42.7754 242.529 45.4385 239.453 47.4358C236.377 49.4331 232.835 50.4317 228.828 50.4317C225.146 50.4317 221.93 49.6772 219.181 48.1681C216.431 46.6591 214.287 44.5064 212.749 41.7102C211.211 38.914 210.442 35.6739 210.442 31.99ZM237.006 28.6612C236.68 25.7762 235.771 23.668 234.28 22.3365C232.789 20.9606 230.971 20.2726 228.828 20.2726C226.358 20.2726 224.354 21.0049 222.816 22.4696C221.278 23.9343 220.322 25.9982 219.95 28.6612H237.006ZM195.347 22.3365C196.838 23.5348 197.77 25.1993 198.143 27.3297L207.371 26.8637C207.044 24.1562 206.089 21.8039 204.505 19.8066C202.92 17.8093 200.869 16.278 198.353 15.2128C195.883 14.1032 193.157 13.5484 190.174 13.5484C186.492 13.5484 183.277 14.3029 180.527 15.812C177.777 17.321 175.634 19.4737 174.096 22.2699C172.558 25.0661 171.789 28.3062 171.789 31.99C171.789 35.6739 172.558 38.914 174.096 41.7102C175.634 44.5064 177.777 46.6591 180.527 48.1681C183.277 49.6772 186.492 50.4317 190.174 50.4317C193.25 50.4317 196.046 49.8769 198.563 48.7673C201.079 47.6133 203.13 45.9933 204.714 43.9072C206.299 41.8212 207.254 39.38 207.58 36.5838L198.283 36.1844C197.957 38.5367 197.048 40.3565 195.557 41.6436C194.065 42.8864 192.271 43.5078 190.174 43.5078C187.285 43.5078 185.048 42.5091 183.463 40.5118C181.879 38.5145 181.086 35.6739 181.086 31.99C181.086 28.3062 181.879 25.4656 183.463 23.4683C185.048 21.471 187.285 20.4723 190.174 20.4723C192.178 20.4723 193.902 21.0937 195.347 22.3365ZM149.955 14.3457H158.281L158.522 21.1369C159.113 19.2146 159.935 17.7218 160.988 16.6585C162.514 15.1166 164.642 14.3457 167.371 14.3457H170.771V21.6146H167.302C165.359 21.6146 163.763 21.8789 162.514 22.4075C161.311 22.9362 160.386 23.7732 159.739 24.9186C159.137 26.064 158.837 27.5178 158.837 29.2799V49.6328H149.955V14.3457ZM111.548 22.2699C110.01 25.0661 109.241 28.3062 109.241 31.99C109.241 35.6739 110.01 38.914 111.548 41.7102C113.086 44.5064 115.229 46.6591 117.979 48.1681C120.729 49.6772 123.944 50.4317 127.626 50.4317C131.634 50.4317 135.176 49.4331 138.252 47.4358C141.327 45.4385 143.425 42.7754 144.543 39.4466L135.385 38.7808C134.686 40.2899 133.638 41.4883 132.24 42.376C130.842 43.2637 129.304 43.7075 127.626 43.7075C124.97 43.7075 122.849 42.8864 121.265 41.2442C119.727 39.5576 118.865 37.2496 118.678 34.3202H145.032V32.2564C144.986 28.2174 144.194 24.7998 142.656 22.0036C141.118 19.2074 139.044 17.0991 136.434 15.6788C133.824 14.2585 130.888 13.5484 127.626 13.5484C123.944 13.5484 120.729 14.3029 117.979 15.812C115.229 17.321 113.086 19.4737 111.548 22.2699ZM133.079 22.3365C134.57 23.668 135.479 25.7762 135.805 28.6612H118.748C119.121 25.9982 120.076 23.9343 121.614 22.4696C123.152 21.0049 125.156 20.2726 127.626 20.2726C129.77 20.2726 131.587 20.9606 133.079 22.3365Z" fill="currentColor"/>
              </svg>
            </Link>
            
            {/* Turso */}
            <Link 
              href="https://turso.tech/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center h-12 grayscale hover:grayscale-0 transition-all duration-300"
            >
              <Image
                src="/turso-logo-white.svg"
                alt="Turso"
                width={120}
                height={48}
                className="h-10 w-auto filter dark:filter-none invert dark:invert-0"
              />
            </Link>
            
            {/* Meiro */}
            <Link 
              href="https://meiro.io/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center h-12 grayscale"
            >
              <Image
                src="/meiro.svg"
                alt="Meiro"
                width={120}
                height={48}
                className="h-10 w-auto filter dark:filter-none invert dark:invert-0"
              />
            </Link>
            
            {/* Partnership CTA */}
            <Button variant="outline" size="sm" asChild>
              <Link href="mailto:adam.sobotka@duck.com?subject=prcat partnership">
                Your company
              </Link>
            </Button>
          </div>

          {/* No Vendor Lock-in, Ever */}
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">No Vendor Lock-in, Ever</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your data stays yours. Deploy anywhere, modify anything, contribute back if you want. 
              That's the promise of truly open source software.
            </p>
          </div>
        </div>
      </section>

      {/* Why These Metrics Matter - Moved up and simplified */}
      <section id="practical-value" className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Turn engineering insights into strategic wins</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Get the concrete metrics you need for data-driven retrospectives, executive updates, and team growth conversations.
            </p>
          </div>

          <div className="grid gap-12 md:gap-16">
            {/* Team Retrospectives */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <IconUsers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold">Data-Driven Retrospectives</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  Move beyond "gut feeling" retrospectives. Use concrete metrics to identify what's working across your organization, what's not, and specific actions your teams can take to improve together.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-2"></div>
                    <p><strong>"Our overall cycle time increased 40% this sprint"</strong> — Is it complex features or review bottlenecks?</p>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-2"></div>
                    <p><strong>"Only 67% of PRs got reviewed across teams"</strong> — Should we make reviews faster, not optional?</p>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-2"></div>
                    <p><strong>"60% effort on bug fixes vs features organization-wide"</strong> — Time to address root causes?</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 p-6 rounded-xl">
                <h4 className="font-semibold mb-3">Sprint Retrospective Template</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-blue-200/20 dark:border-blue-800/20">
                    <span className="font-medium">📈 What's improving?</span>
                    <span className="text-muted-foreground">Review trends</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-blue-200/20 dark:border-blue-800/20">
                    <span className="font-medium">🚩 What needs attention?</span>
                    <span className="text-muted-foreground">Cycle time spikes</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="font-medium">🎯 This week's focus?</span>
                    <span className="text-muted-foreground">Smaller PRs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Data for Presentations */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="md:order-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconPresentation className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold">Data You Can Present With Confidence</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  Get the concrete metrics you need to tell compelling stories about your team's progress. PR Cat provides the data foundation for your executive updates and quarterly reviews.
                </p>
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                    <p className="font-medium text-sm mb-1">Cycle Time Trends</p>
                    <p className="text-xs text-muted-foreground">Track team velocity improvements over time with concrete numbers</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                    <p className="font-medium text-sm mb-1">Investment Distribution</p>
                    <p className="text-xs text-muted-foreground">Show where engineering effort is actually going vs. planned allocation</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                    <p className="font-medium text-sm mb-1">Quality Metrics</p>
                    <p className="text-xs text-muted-foreground">Demonstrate review coverage and collaboration trends</p>
                  </div>
                </div>
              </div>
              <div className="md:order-1">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-background border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">2.3d</div>
                    <div className="text-xs text-muted-foreground">Avg Cycle</div>
                    <div className="text-xs text-green-600">From Dashboard</div>
                  </div>
                  <div className="bg-background border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">85%</div>
                    <div className="text-xs text-muted-foreground">Review Coverage</div>
                    <div className="text-xs text-green-600">Live Metrics</div>
                  </div>
                  <div className="bg-background border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">40%</div>
                    <div className="text-xs text-muted-foreground">Features</div>
                    <div className="text-xs text-green-600">vs 25% Bugs</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Investment Tracking */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <IconBuildingStore className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-2xl font-bold">Track Investment vs. Outcomes</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  Use PR Cat's category distribution and cycle time data to validate whether your organization's actual work aligns with planned priorities and business goals across all teams and repositories.
                </p>
                <div className="space-y-4">
                  <div className="border-l-4 border-orange-500 pl-4">
                    <p className="font-medium text-sm">Category Distribution Analysis</p>
                    <p className="text-xs text-muted-foreground mt-1">Compare planned vs. actual effort across features, bugs, and tech debt</p>
                  </div>
                  <div className="border-l-4 border-orange-500 pl-4">
                    <p className="font-medium text-sm">Velocity Impact Tracking</p>
                    <p className="text-xs text-muted-foreground mt-1">Measure how infrastructure investments affect delivery speed</p>
                  </div>
                  <div className="border-l-4 border-orange-500 pl-4">
                    <p className="font-medium text-sm">Resource Allocation Data</p>
                    <p className="text-xs text-muted-foreground mt-1">Get concrete data to support hiring and tooling requests</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 p-6 rounded-xl">
                <h4 className="font-semibold mb-4">Sample Category Breakdown</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">New Features</span>
                    <span className="text-orange-600 font-bold">40%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Bug Fixes</span>
                    <span className="text-orange-600 font-bold">25%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Technical Debt</span>
                    <span className="text-orange-600 font-bold">20%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Infrastructure</span>
                    <span className="text-orange-600 font-bold">15%</span>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="text-xs text-muted-foreground">
                      Compare against your planned allocation to identify gaps and make data-driven adjustments
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Simplified */}
      <section id="features" className="py-16 md:py-24 bg-muted/50">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">What's Under the Hood</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple, powerful features that focus on collaboration and organizational health, not surveillance.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            <div className="bg-background p-6 rounded-lg shadow-sm text-center">
              <div className="flex justify-center mb-4">
                <IconChartBar className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Engineering Flow Dashboard</h3>
              <p className="text-muted-foreground">
                Focus on metrics that encourage collaboration and flow across your organization, not individual performance surveillance.
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-sm text-center">
              <div className="flex justify-center mb-4">
                <IconCode className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Smart PR Categorization</h3>
              <p className="text-muted-foreground">
                AI-powered categorization helps track where your engineering effort actually goes. Transparent algorithms you can inspect and modify.
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-sm text-center">
              <div className="flex justify-center mb-4">
                <IconTargetArrow className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Collaboration Insights</h3>
              <p className="text-muted-foreground">
                Identify systemic obstacles across teams, removing process friction that slows everyone down.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI PR Categorizer - Simplified and De-emphasized */}
      <section id="ai-categorizer" className="py-16 md:py-24 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="bg-primary/10 dark:bg-primary/5 w-fit px-3 py-1 rounded-full mb-4">
                <span className="text-sm font-medium text-primary">AI-Powered</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">Engineering Focus Distribution</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our AI helps your organization understand where collective engineering energy is going, not to judge performance but to align focus with what matters most across all your teams.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <IconCode className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Transparent Categorization</h3>
                    <p className="text-muted-foreground text-sm">
                      AI categorizes PRs into your custom categories. All algorithms are open source - inspect, modify, or replace them entirely.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <IconChartBar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Engineering Energy Insights</h3>
                    <p className="text-muted-foreground text-sm">
                      See where your organization's collective engineering energy is flowing to make better decisions together about where to focus next.
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-sm border-l-2 border-primary/50 pl-4 py-1 text-muted-foreground italic">
                &quot;As a tech lead who codes daily with my teams, this helped us discover together that we were spending too much energy on maintenance and not enough on innovation across our repositories. We adjusted as an organization.&quot;
              </p>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
              <div className="relative bg-background border rounded-xl shadow-lg overflow-hidden">
                <div className="bg-muted/50 border-b px-4 py-3 flex items-center">
                  <div className="flex space-x-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="mx-auto text-xs font-medium text-muted-foreground">Investment Area Analysis</div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between mb-2">
                    <h3 className="text-sm font-medium">Engineering Focus Distribution</h3>
                    <span className="text-xs text-muted-foreground">Last updated: 2h ago</span>
                  </div>
                  
                  <div className="space-y-3 mt-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">Bug Squashing</span>
                        <span>38%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: '38%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">Code Health</span>
                        <span>27%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '27%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">New Features</span>
                        <span>25%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '25%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">UX Improvements</span>
                        <span>10%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: '10%' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t">
                    <h3 className="text-sm font-medium mb-3">Recent Contributions</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                        <span className="flex-grow font-medium">Fix auth token refresh loop</span>
                        <span className="text-muted-foreground">Bug Squashing</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-500"></div>
                        <span className="flex-grow font-medium">Refactor API error handling</span>
                        <span className="text-muted-foreground">Code Health</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
                        <span className="flex-grow font-medium">Add user onboarding flow</span>
                        <span className="text-muted-foreground">New Features</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full bg-violet-500"></div>
                        <span className="flex-grow font-medium">Improve UX of checkout page</span>
                        <span className="text-muted-foreground">UX Improvements</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Engineering Health Metrics */}
      <section id="metrics" className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Engineering health metrics that matter</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              For engineering leaders who see organizational success as a collaborative achievement across all teams, not individual performance metrics.
            </p>
          </div>
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto">
            <div className="bg-muted/30 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <IconClock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">Delivery Speed</h3>
              <p className="text-sm text-muted-foreground">
                Understand your organization's flow from first commit to production deployment across all repositories.
              </p>
            </div>
            <div className="bg-muted/30 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <IconCode className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">PR Size</h3>
              <p className="text-sm text-muted-foreground">
                Collaboratively work toward smaller, more digestible changes for better organizational flow.
              </p>
            </div>
            <div className="bg-muted/30 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <IconReportAnalytics className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">Feedback Speed</h3>
              <p className="text-sm text-muted-foreground">
                Optimize how quickly teams provide meaningful code reviews to each other across the organization.
              </p>
            </div>
            <div className="bg-muted/30 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <IconArrowRight className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">Flow State Time</h3>
              <p className="text-sm text-muted-foreground">
                Understand how much time your engineering organization spends in a state of high productivity and collaboration.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section - GitHub Focused */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Ready to deploy your own engineering analytics?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Join engineering organizations that trust open source. Deploy PR Cat on your infrastructure and start gaining insights into your development workflow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="https://github.com/vorcigernix/pr_cat" target="_blank" rel="noopener noreferrer">
                <IconBrandGithub className="mr-2 h-4 w-4" />
                Contribute
                <IconArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="https://github.com/vorcigernix/pr_cat/blob/main/README.md" target="_blank" rel="noopener noreferrer">
                Quick Start Guide
              </Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            MIT Licensed • Self-Hosted • No vendor lock-in • Full control
          </p>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t py-12 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Brand and Description */}
            <div className="space-y-4">
              <div className="flex items-center">
                <PrcatLogo className="mr-2" />
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                Open source GitHub PR analytics for engineering teams. Transform development metrics into strategic insights.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconBrandGithub className="h-4 w-4" />
                <span>MIT Licensed • Open Source</span>
              </div>
            </div>
            
            {/* Links */}
            <div className="grid gap-6 sm:grid-cols-2 md:col-span-2">
              <div>
                <h4 className="font-semibold mb-3">Product</h4>
                <div className="space-y-2 text-sm">
                  <Link href="#features" className="text-muted-foreground hover:text-foreground block">
                    Features
                  </Link>
                  <Link href="#why-metrics-matter" className="text-muted-foreground hover:text-foreground block">
                    Why Metrics Matter
                  </Link>
                  <Link href="/dashboard" className="text-muted-foreground hover:text-foreground block">
                    Dashboard
                  </Link>
                  <Link href="/dashboard/help" className="text-muted-foreground hover:text-foreground block">
                    Documentation
                  </Link>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Community</h4>
                <div className="space-y-2 text-sm">
                  <Link href="https://github.com/vorcigernix/pr_cat" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground block">
                    GitHub Repository
                  </Link>
                  <Link href="https://github.com/vorcigernix/pr_cat/issues" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground block">
                    Report Issues
                  </Link>
                  <Link href="https://github.com/vorcigernix/pr_cat/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground block">
                    Contributing
                  </Link>
                  <Link href="https://github.com/vorcigernix/pr_cat/discussions" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground block">
                    Discussions
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <span className="text-sm text-muted-foreground mb-4 md:mb-0">
              © 2024 PR Cat. MIT Licensed.
            </span>
            <div className="flex gap-6">
         
              <Link href="https://github.com/vorcigernix/pr_cat" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground">
                Source Code
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

