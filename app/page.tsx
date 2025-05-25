import Link from "next/link";
import Image from "next/image";
import { IconArrowRight, IconCode, IconChartBar, IconClock, IconReportAnalytics, IconTargetArrow, IconSpeakerphone, IconUsers, IconTrendingUp, IconBrandGithub, IconHeart, IconPresentation, IconSchool, IconBuildingStore } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { PrcatLogo } from "@/components/ui/prcat-logo";
import { PRHeroSection } from "@/components/blocks/linear-hero-section";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  
  // If user is logged in but has never completed onboarding, redirect to onboarding
  if (session?.user) {
    // In a real implementation, we would check if the user has completed onboarding
    // by querying the database for a user preference or flag
    // For now, we can use the newUser flag from the session
    
    const isNewUser = session.newUser === true;
    
    // If this is a new user (first login), redirect to onboarding flow
    if (isNewUser) {
      redirect('/onboarding');
    }
    
    // Otherwise, if they're already logged in but not a first-time user
    // they might want to go directly to the dashboard
    const needsSetup = session.hasGithubApp === false;
    if (needsSetup) {
      // Show a notice that setup is incomplete (handled in PRHeroSection)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section - Open Source First */}
      <section className="py-16 md:py-24 lg:py-32 relative overflow-hidden">
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
              <span className="text-muted-foreground">You Can Actually Trust</span>
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

        {/* 3D Dashboard Image with Advanced Masking */}
        <div className="mx-auto -mt-16 max-w-7xl" style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' }}>
          <div 
            className="mr-0 pl-8 lg:mr-0 lg:pl-16"
            style={{ 
              perspective: '1200px',
              maskImage: 'linear-gradient(to right, black 80%, transparent 100%)'
            }}
          >
            <div style={{ transform: 'rotateX(20deg)' }}>
              <div className="lg:h-[44rem] relative" style={{ transform: 'skewX(0.36rad)' }}>
                <Image
                  className="rounded-lg z-[2] relative border border-border/20 dark:hidden"
                  src="/dashboard.avif"
                  alt="PR Cat Dashboard Screenshot"
                  width={2880}
                  height={2074}
                  priority
                />
                <Image
                  className="rounded-lg z-[2] relative border border-border/20 hidden dark:block"
                  src="/dashboard2.avif"
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

          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 p-8 rounded-xl">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4">No Vendor Lock-in, Ever</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Unlike SaaS analytics platforms, you're not trapped. Don't like our hosted version? Deploy it yourself. Want to modify it? Fork it. Need to migrate? Export everything.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild>
                  <Link href="https://github.com/vorcigernix/pr_cat/fork" target="_blank" rel="noopener noreferrer">
                    Fork & Customize
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="https://github.com/vorcigernix/pr_cat/blob/main/docs/self-hosting.md" target="_blank" rel="noopener noreferrer">
                    Self-Hosting Guide
                  </Link>
                </Button>
              </div>
            </div>
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
              <Link href="https://github.com/vorcigernix/pr_cat/blob/main/docs/quick-start.md" target="_blank" rel="noopener noreferrer">
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

