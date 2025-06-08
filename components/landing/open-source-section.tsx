import React from "react"
import Link from "next/link"
import Image from "next/image"
import { IconCode, IconTrendingUp, IconUsers } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

const FEATURES = [
  {
    icon: IconCode,
    title: "Complete Transparency",
    description: "See exactly how your data is processed. No hidden algorithms, no mysterious \"proprietary metrics.\" Every calculation is open for inspection.",
    link: "https://github.com/vorcigernix/pr_cat",
    linkText: "View the source code →"
  },
  {
    icon: IconTrendingUp,
    title: "Your Data, Your Infrastructure",
    description: "Deploy on your own servers. Your sensitive engineering data never leaves your environment. Full control, zero vendor dependency.",
    link: "https://github.com/vorcigernix/pr_cat#deployment",
    linkText: "Deployment guide →"
  },
  {
    icon: IconUsers,
    title: "Built by Engineers",
    description: "Features requested by real engineering teams. No corporate roadmap driven by sales targets. Just tools that actually help developers.",
    link: "https://github.com/vorcigernix/pr_cat/discussions",
    linkText: "Join the discussion →"
  }
]

export function OpenSourceSection() {
  return (
    <section id="why-open-source" className="py-16 md:py-24 bg-muted/30">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Why Open Source Engineering Analytics?</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Because the best engineering tools are built by engineers, for engineers. Not by vendors trying to sell you a black box.
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto mb-16">
          {FEATURES.map(({ icon: Icon, title, description, link, linkText }) => (
            <div key={title} className="bg-background p-6 rounded-xl shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">{title}</h3>
              <p className="text-muted-foreground mb-4">
                {description}
              </p>
              <Link href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                {linkText}
              </Link>
            </div>
          ))}
        </div>

        {/* Support Section */}
        <div className="w-full border-t border-dashed border-border/50 mb-12"></div>
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/60 dark:bg-black/20 border border-green-200 dark:border-green-800">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              With support from our friends at:
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 mb-12 p-6 rounded-xl">
          <Link 
            href="https://meiro.io/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center h-12 grayscale hover:grayscale-0 transition-all duration-300"
          >
            <Image
              src="/meiro.svg"
              alt="Meiro"
              width={120}
              height={48}
              className="h-10 w-auto filter dark:filter-none invert dark:invert-0"
            />
          </Link>
          
          <Button variant="outline" size="sm" asChild>
            <Link href="mailto:adam.sobotka@duck.com?subject=prcat partnership">
              Your company
            </Link>
          </Button>
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4">No Vendor Lock-in, Ever</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your data stays yours. Deploy anywhere, modify anything, contribute back if you want. 
            That's the promise of truly open source software.
          </p>
        </div>
      </div>
    </section>
  )
} 