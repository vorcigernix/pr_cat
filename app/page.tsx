import Link from "next/link";
import { IconBrandGithub, IconArrowRight, IconCode, IconChartBar, IconClock, IconReportAnalytics, IconTargetArrow, IconSpeakerphone, IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrcatLogo } from "@/components/ui/prcat-logo";
import { PRHeroSection } from "@/components/blocks/linear-hero-section";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  // Sample data for metrics
  const metricsData = {
    codingTime: { value: 4.6, change: 0.3, trend: "up" },
    prSize: { value: 359, change: -55, trend: "up" },
    cycleTime: { value: 77.8, change: -5.4, trend: "up" },
    reviewTime: { value: 39.1, change: -5.9, trend: "up" }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section with Linear-style UI */}
      <PRHeroSection />

      {/* Features */}
      <section id="features" className="py-16 md:py-24 bg-muted/50">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Features designed for engineering teams</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Prcat helps your team track what matters, identify bottlenecks, and continuously improve your development process.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            <div className="bg-background p-6 rounded-lg shadow-sm text-center">
              <div className="flex justify-center mb-4">
                <IconChartBar className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">DORA Metrics Dashboard</h3>
              <p className="text-muted-foreground">
                Track key metrics like Cycle Time, PR Size, Coding Time, and Review Time to understand your team's performance.
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-sm text-center">
              <div className="flex justify-center mb-4">
                <IconTargetArrow className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Bottleneck Detection</h3>
              <p className="text-muted-foreground">
                Automatically identify where work gets stuck and what's slowing down your development process.
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-sm text-center">
              <div className="flex justify-center mb-4">
                <IconSpeakerphone className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Actionable Recommendations</h3>
              <p className="text-muted-foreground">
                Get tailored suggestions for improving your workflows based on your team's specific patterns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI PR Categorizer */}
      <section id="ai-categorizer" className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="bg-primary/10 dark:bg-primary/5 w-fit px-3 py-1 rounded-full mb-4">
                <span className="text-sm font-medium text-primary">AI-Powered</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">Investment Area Categorization</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our AI automatically analyzes your GitHub pull requests and categorizes them into strategic investment areas, giving you clear visibility into how your engineering resources are being allocated.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <IconCode className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Custom Investment Categories</h3>
                    <p className="text-muted-foreground text-sm">
                      Define your own investment areas like "bugs", "product debt", "technical debt", "new features", or any category that matters to your team.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <IconChartBar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Resource Allocation Insights</h3>
                    <p className="text-muted-foreground text-sm">
                      Track what percentage of your engineering effort is going into each investment area and make data-driven decisions about resource allocation.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <IconTargetArrow className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">GitHub Integration</h3>
                    <p className="text-muted-foreground text-sm">
                      Seamlessly connects to your GitHub repositories and automatically categorizes every new pull request as it's created.
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-sm border-l-2 border-primary/50 pl-4 py-1 text-muted-foreground italic">
                "We discovered we were spending 65% of our time on bug fixes and only 15% on innovation. This insight helped us rebalance our engineering priorities."
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
                    <h3 className="text-sm font-medium">Current Sprint Allocation</h3>
                    <span className="text-xs text-muted-foreground">Last updated: 2h ago</span>
                  </div>
                  
                  <div className="space-y-3 mt-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">Bug Fixes</span>
                        <span>38%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: '38%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">Technical Debt</span>
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
                        <span className="font-medium">Product Debt</span>
                        <span>10%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: '10%' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t">
                    <h3 className="text-sm font-medium mb-3">Recent Categorizations</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                        <span className="flex-grow font-medium">Fix auth token refresh loop</span>
                        <span className="text-muted-foreground">Bug Fixes</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-500"></div>
                        <span className="flex-grow font-medium">Refactor API error handling</span>
                        <span className="text-muted-foreground">Technical Debt</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
                        <span className="flex-grow font-medium">Add user onboarding flow</span>
                        <span className="text-muted-foreground">New Features</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full bg-violet-500"></div>
                        <span className="flex-grow font-medium">Improve UX of checkout page</span>
                        <span className="text-muted-foreground">Product Debt</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section id="metrics" className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Metrics that matter</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Focus on the metrics that actually help your team improve, not just look good in reports.
            </p>
          </div>
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto">
            <div className="bg-muted/30 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <IconClock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">Cycle Time</h3>
              <p className="text-sm text-muted-foreground">
                Track how long it takes from first commit to production deployment.
              </p>
            </div>
            <div className="bg-muted/30 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <IconCode className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">PR Size</h3>
              <p className="text-sm text-muted-foreground">
                Monitor the size of pull requests to encourage smaller, more manageable changes.
              </p>
            </div>
            <div className="bg-muted/30 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <IconReportAnalytics className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">Review Time</h3>
              <p className="text-sm text-muted-foreground">
                Measure how long PRs wait for review and the time spent in review.
              </p>
            </div>
            <div className="bg-muted/30 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <IconChartBar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">Coding Time</h3>
              <p className="text-sm text-muted-foreground">
                Understand how much time is spent actively coding versus waiting.
              </p>
            </div>
          </div>
          
          {/* PR Quality visualization */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div className="col-span-1 md:col-span-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-3">PR Quality Analysis</h3>
                <p className="text-muted-foreground mb-4">
                  Prcat helps engineering teams maintain high code quality by analyzing PR patterns and identifying areas for improvement.
                </p>
                <ul className="space-y-2 inline-block text-left">
                  <li className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#22c55e]"></div>
                    <span>68% High Quality PRs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#eab308]"></div>
                    <span>24% Medium Quality PRs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#ef4444]"></div>
                    <span>8% Low Quality PRs</span>
                  </li>
                </ul>
              </div>
              <div className="col-span-1 md:col-span-2 h-[300px] flex items-center justify-center">
                {/* Static donut chart */}
                <div className="relative w-[240px] h-[240px]">
                  {/* High quality - 68% */}
                  <div className="absolute inset-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="3"
                        strokeDasharray="68, 100"
                        strokeLinecap="round"
                        transform="rotate(-90, 18, 18)"
                      />
                    </svg>
                  </div>
                  
                  {/* Medium quality - 24% */}
                  <div className="absolute inset-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#eab308"
                        strokeWidth="3"
                        strokeDasharray="24, 100"
                        strokeLinecap="round"
                        transform="rotate(-18, 18, 18)"
                      />
                    </svg>
                  </div>
                  
                  {/* Low quality - 8% */}
                  <div className="absolute inset-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3"
                        strokeDasharray="8, 100"
                        strokeLinecap="round"
                        transform="rotate(72, 18, 18)"
                      />
                    </svg>
                  </div>
                  
                  {/* Inner circle */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[160px] h-[160px] rounded-full bg-background"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-16 md:py-24 bg-muted/50">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Benefits for your team</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Improve your engineering workflow and build better software together.
            </p>
          </div>
          <div className="grid gap-12 md:grid-cols-2 max-w-4xl mx-auto">
            <div className="flex flex-col items-center md:items-start">
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <IconArrowRight className="h-3 w-3 text-primary" />
                  </div>
                  <p><span className="font-medium">Identify bottlenecks</span> in your development process</p>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <IconArrowRight className="h-3 w-3 text-primary" />
                  </div>
                  <p><span className="font-medium">Improve collaboration</span> with data-driven insights</p>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <IconArrowRight className="h-3 w-3 text-primary" />
                  </div>
                  <p><span className="font-medium">Reduce cycle time</span> by focusing on what's important</p>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <IconArrowRight className="h-3 w-3 text-primary" />
                  </div>
                  <p><span className="font-medium">Track progress</span> over time with historical data</p>
                </li>
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
                <h3 className="text-xl font-bold mb-4 text-center">Ready to improve your team's performance?</h3>
                <p className="text-muted-foreground mb-6 text-center">
                  Start tracking your engineering metrics today and discover ways to make your development process more efficient.
                </p>
                {session ? (
                  <Link href="/dashboard">
                    <Button className="w-full" size="lg">
                      Get Started
                    </Button>
                  </Link>
                ) : (
                  <Link href="/sign-in">
                    <Button className="w-full" size="lg">
                      Sign in
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-auto py-6 md:py-8">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-row items-center gap-2">
              <PrcatLogo fontSize="text-base" iconSize="h-4 w-4" />
            </div>
            <p className="text-sm text-muted-foreground">
              Engineering metrics for teams, not managers
            </p>
            <div className="flex items-center gap-4">
              {session ? (
                <Link href="/dashboard" className="text-sm hover:underline">Dashboard</Link>
              ) : (
                <Link href="/sign-in" className="text-sm hover:underline">Sign in</Link>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
