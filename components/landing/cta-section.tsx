import React from "react"
import Link from "next/link"
import { IconBrandGithub, IconArrowRight } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { GlowEffect } from "@/components/motion-primitives/glow-effect"

export function CTASection() {
  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="container max-w-6xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-4">Ready to deploy your own engineering analytics?</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Join development teams that trust open source. Deploy PR Cat on your infrastructure and start gaining insights into your team's workflow.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <div className="relative inline-block w-fit">
            <GlowEffect
              colors={['#8B5CF6', '#C959DD', '#A78BFA', '#D946EF']}
              mode='static'
              blur='medium'
            />
            <Button 
              size="lg" 
              asChild
              className="relative bg-white/90 backdrop-blur-sm text-black hover:bg-white/95 shadow-lg border border-white/30"
            >
              <Link href="https://github.com/vorcigernix/pr_cat" target="_blank" rel="noopener noreferrer">
                <IconBrandGithub className="mr-2 h-4 w-4" />
                Contribute
                <IconArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
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
  )
} 