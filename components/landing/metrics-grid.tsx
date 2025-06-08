import React from "react"
import { IconClock, IconCode, IconReportAnalytics, IconArrowRight } from "@tabler/icons-react"

const METRICS = [
  {
    icon: IconClock,
    title: "Delivery Speed",
    description: "Understand your team's flow from first commit to production deployment across all your repositories."
  },
  {
    icon: IconCode,
    title: "PR Size",
    description: "Work together toward smaller, more digestible changes for better team flow and collaboration."
  },
  {
    icon: IconReportAnalytics,
    title: "Feedback Speed", 
    description: "Optimize how quickly your team provides meaningful code reviews to each other."
  },
  {
    icon: IconArrowRight,
    title: "Flow State Time",
    description: "Understand how much time your team spends in a state of high productivity and collaboration."
  }
]

export function MetricsGrid() {
  return (
    <section id="metrics" className="py-16 md:py-24">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Team health metrics that matter</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            For developers and teams who see success as a collaborative achievement, not individual performance metrics.
          </p>
        </div>
        
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto">
          {METRICS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-muted/30 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <Icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
} 