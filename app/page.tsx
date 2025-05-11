import Link from "next/link";
import { IconArrowRight, IconCode, IconChartBar, IconClock, IconReportAnalytics, IconTargetArrow, IconSpeakerphone } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { PrcatLogo } from "@/components/ui/prcat-logo";
import { PRHeroSection } from "@/components/blocks/linear-hero-section";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section with Linear-style UI */}
      <PRHeroSection session={session} />

      {/* Features */}
      <section id="features" className="py-16 md:py-24 bg-muted/50">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Built for hands-on technical leaders</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              PR Cat is for leaders who build alongside their teams — not for those who just want to monitor from above.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            <div className="bg-background p-6 rounded-lg shadow-sm text-center">
              <div className="flex justify-center mb-4">
                <IconChartBar className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Team Flow Dashboard</h3>
              <p className="text-muted-foreground">
                Focus on metrics that encourage collaboration and flow, not individual performance surveillance or stack ranking.
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-sm text-center">
              <div className="flex justify-center mb-4">
                <IconTargetArrow className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Collaborative Barrier Detection</h3>
              <p className="text-muted-foreground">
                Identify systemic obstacles as a team, removing process friction that slows everyone down.
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-sm text-center">
              <div className="flex justify-center mb-4">
                <IconSpeakerphone className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Team Improvement Quests</h3>
              <p className="text-muted-foreground">
                Gamified, actionable improvements built for the whole team, not manager-driven mandates from above.
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
              <h2 className="text-3xl font-bold tracking-tight mb-4">Team Focus Distribution</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our AI helps your team understand where your collective energy is going, not to judge performance but to align your focus with what matters most to all of you.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <IconCode className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Collaborative Categories</h3>
                    <p className="text-muted-foreground text-sm">
                      Define categories that make sense for your team's context like "bug squashing," "code health," "new features," or any focus area that helps you improve together.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <IconChartBar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Team Energy Insights</h3>
                    <p className="text-muted-foreground text-sm">
                      See where your team's collective energy is flowing to make better decisions together about where to focus next.
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
                      Seamlessly connects to your GitHub repositories with a team-first approach that focuses on collaboration, not individual metrics.
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-sm border-l-2 border-primary/50 pl-4 py-1 text-muted-foreground italic">
                &quot;As a tech lead who codes daily with my team, this helped us discover together that we were spending too much energy on maintenance and not enough on innovation. We adjusted as a team.&quot;
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
                    <h3 className="text-sm font-medium">Team Focus Distribution</h3>
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

      {/* Metrics */}
      <section id="metrics" className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Team health metrics that matter</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              For engineering leaders who see team success as a collaborative achievement, not individual performance metrics.
            </p>
          </div>
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto">
            <div className="bg-muted/30 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <IconClock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">Delivery Speed</h3>
              <p className="text-sm text-muted-foreground">
                Understand your team's flow from first commit to production deployment.
              </p>
            </div>
            <div className="bg-muted/30 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <IconCode className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">PR Size</h3>
              <p className="text-sm text-muted-foreground">
                Collaboratively work toward smaller, more digestible changes for better team flow.
              </p>
            </div>
            <div className="bg-muted/30 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <IconReportAnalytics className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">Feedback Speed</h3>
              <p className="text-sm text-muted-foreground">
                Optimize how quickly your team provides meaningful code reviews to each other.
              </p>
            </div>
            <div className="bg-muted/30 p-6 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <IconArrowRight className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">Flow State Time</h3>
              <p className="text-sm text-muted-foreground">
                Understand how much time your team spends in a state of high productivity and collaboration.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Ready to supercharge your engineering insights?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Join engineering teams that use PR Cat to gain visibility into their development workflow and make data-driven improvements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href={session ? "/dashboard" : "/sign-up"}>
                Get Started
                <IconArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t py-12 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <PrcatLogo className="mr-2" />
              <span className="text-sm text-muted-foreground">© 2023 PR Cat, Inc. All rights reserved.</span>
            </div>
            <div className="flex gap-6">
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Terms
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Documentation
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
