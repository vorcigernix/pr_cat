import React from "react"
import Link from "next/link"
import Image from "next/image"
import { IconBrandGithub, IconChartBar, IconCode, IconUsers, IconHeart } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
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
            Self-hosted GitHub PR analytics for developers and their teams who want transparency, control, and insights that actually help everyone grow together. No vendor lock-in, no hidden algorithms.
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
            <div className="lg:h-176 relative" style={{ transform: 'skewX(0.36rad)' }}>
              <Image
                className="rounded-lg z-2 relative border border-border/20"
                src="/dashboard2.png"
                alt="PR Cat Dashboard Screenshot"
                width={2880}
                height={2074}
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 