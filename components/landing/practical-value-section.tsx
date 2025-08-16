import React from "react"
import { IconUsers } from "@tabler/icons-react"

export function PracticalValueSection() {
  return (
    <section id="practical-value" className="py-16 md:py-24">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Turn team insights into collaborative wins</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Get the concrete metrics your team needs for data-driven retrospectives, meaningful standups, and collaborative growth conversations.
          </p>
        </div>

        <div className="grid gap-12 md:gap-16">
          {/* Team Retrospectives */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <IconUsers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold">Data-Driven Retrospectives</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Move beyond "gut feeling" retrospectives. Use concrete metrics to identify what's working in your team's workflow, what's not, and specific actions you can take to improve together.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-2"></div>
                  <p><strong>"Our overall cycle time increased 40% this sprint"</strong> — Is it complex features or review bottlenecks?</p>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-2"></div>
                  <p><strong>"Only 67% of PRs got reviewed across teams"</strong> — Should we make reviews faster, not optional?</p>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-2"></div>
                  <p><strong>"60% effort on bug fixes vs features this sprint"</strong> — Time to address root causes?</p>
                </div>
              </div>
            </div>
            <div className="bg-muted/30 p-6 rounded-lg">
              <h4 className="font-semibold mb-3">Sprint Retrospective Template</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-border/20">
                  <span className="font-medium">📈 What's improving?</span>
                  <span className="text-muted-foreground">Review trends</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/20">
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
        </div>
      </div>
    </section>
  )
} 