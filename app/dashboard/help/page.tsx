import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  IconBrandGithub, 
  IconChartBar, 
  IconDashboard, 
  IconFolder, 
  IconUsers, 
  IconListDetails,
  IconWebhook,
  IconRobot,
  IconCode,
  IconClock,
  IconTarget,
  IconTrendingUp,
  IconQuestionMark,
  IconMail,
  IconBook,
  IconApi,
  IconInfoCircle
} from "@tabler/icons-react";
import { headers } from "next/headers";
import Link from "next/link";

export default async function HelpPage() {
  const headersList = await headers();
  const host = headersList.get('host');
  const isProduction = host === 'prcat.vercel.app';

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader pageTitle="Help & Documentation" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="space-y-6">
                  
                  {/* Hosted Solution Notice - Only show on production */}
                  {isProduction && (
                    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                      <IconInfoCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertTitle className="text-blue-800 dark:text-blue-200">Hosted Solution Coming Soon</AlertTitle>
                      <AlertDescription className="text-blue-700 dark:text-blue-300">
                        <p className="mb-3">
                          We're working on a hosted version of PR Cat that will eliminate the need for self-hosting. 
                          In the meantime, you can deploy your own instance using our open source code.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Link href="https://github.com/vorcigernix/pr_cat" target="_blank" rel="noopener noreferrer">
                              <IconBrandGithub className="mr-2 h-4 w-4" />
                              Deploy Your Own
                            </Link>
                          </Button>
                          <Button asChild variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20">
                            <Link href="mailto:hello@prcat.dev?subject=Hosted Solution Interest">
                              <IconMail className="mr-2 h-4 w-4" />
                              Get Notified
                            </Link>
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Quick Start Guide - Always visible */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconDashboard className="h-5 w-5" />
                        Quick Start Guide
                      </CardTitle>
                      <CardDescription>
                        Get up and running with PR Cat in minutes
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4">
                        <div className="flex gap-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                            1
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-semibold">Connect GitHub</h4>
                            <p className="text-sm text-muted-foreground">
                              Install the PR Cat GitHub App on your organization and grant access to repositories you want to analyze.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                            2
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-semibold">Configure Categories</h4>
                            <p className="text-sm text-muted-foreground">
                              Set up investment areas and categories that match your team's focus areas and business priorities.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                            3
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-semibold">Configure AI Provider</h4>
                            <p className="text-sm text-muted-foreground">
                              Set up your AI provider (OpenAI, Google Gemini, or Anthropic Claude) in Settings to enable automatic PR categorization.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tabbed Content */}
                  <Tabs defaultValue="how-to-use" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="how-to-use">How to Use PR Cat</TabsTrigger>
                      <TabsTrigger value="why-metrics-matter">Why These Metrics Matter</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="how-to-use" className="space-y-6">
                      {/* Features Overview */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <IconChartBar className="h-5 w-5" />
                            Features Overview
                          </CardTitle>
                          <CardDescription>
                            Understand what each section of the dashboard provides
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-2">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <IconDashboard className="h-5 w-5 text-blue-500" />
                              <div>
                                <h4 className="font-semibold">Dashboard</h4>
                                <p className="text-sm text-muted-foreground">
                                  High-level metrics, recent activity, and category distribution
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <IconListDetails className="h-5 w-5 text-green-500" />
                              <div>
                                <h4 className="font-semibold">Lifecycle</h4>
                                <p className="text-sm text-muted-foreground">
                                  PR lifecycle analysis and workflow optimization insights
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <IconChartBar className="h-5 w-5 text-purple-500" />
                              <div>
                                <h4 className="font-semibold">Analytics</h4>
                                <p className="text-sm text-muted-foreground">
                                  Deep dive analytics, trends, and performance metrics
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <IconFolder className="h-5 w-5 text-orange-500" />
                              <div>
                                <h4 className="font-semibold">Repositories</h4>
                                <p className="text-sm text-muted-foreground">
                                  Repository-specific insights and webhook management
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <IconUsers className="h-5 w-5 text-red-500" />
                              <div>
                                <h4 className="font-semibold">Team</h4>
                                <p className="text-sm text-muted-foreground">
                                  Team performance, collaboration metrics, and contributor insights
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* How AI Categorization Works */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <IconRobot className="h-5 w-5" />
                            AI Categorization
                          </CardTitle>
                          <CardDescription>
                            How PR Cat automatically categorizes your pull requests
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <h4 className="font-semibold">What gets analyzed:</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              <li className="flex items-start gap-2">
                                <IconCode className="h-4 w-4 mt-0.5 text-blue-500" />
                                <span><strong>PR Title & Description:</strong> Natural language understanding of what the PR does</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <IconCode className="h-4 w-4 mt-0.5 text-green-500" />
                                <span><strong>File Changes:</strong> Analysis of modified files and code patterns</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <IconCode className="h-4 w-4 mt-0.5 text-purple-500" />
                                <span><strong>Commit Messages:</strong> Understanding of the development intent</span>
                              </li>
                            </ul>
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-semibold">AI Providers:</h4>
                            <div className="flex gap-2">
                              <Badge variant="secondary">OpenAI GPT-4</Badge>
                              <Badge variant="secondary">Google Gemini</Badge>
                              <Badge variant="secondary">Anthropic Claude</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              PR Cat uses multiple AI providers for robust categorization with automatic fallback.
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Metrics Explained */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <IconTrendingUp className="h-5 w-5" />
                            Key Metrics Explained
                          </CardTitle>
                          <CardDescription>
                            Understanding the metrics and what they mean for your team
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-2">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <IconClock className="h-4 w-4 text-blue-500" />
                                <h4 className="font-semibold">Cycle Time</h4>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Time from PR creation to merge. Lower is generally better for team velocity.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <IconTarget className="h-4 w-4 text-green-500" />
                                <h4 className="font-semibold">Review Coverage</h4>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Percentage of PRs that receive at least one review before merging.
                              </p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <IconCode className="h-4 w-4 text-purple-500" />
                                <h4 className="font-semibold">PR Size</h4>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Lines of code changed. Smaller PRs are typically easier to review and less risky.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <IconUsers className="h-4 w-4 text-orange-500" />
                                <h4 className="font-semibold">Collaboration Index</h4>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Measures how well team members collaborate through code reviews.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Webhooks & Integration */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <IconWebhook className="h-5 w-5" />
                            Webhooks & Integration
                          </CardTitle>
                          <CardDescription>
                            How PR Cat integrates with your GitHub workflow
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <h4 className="font-semibold">Automatic Processing:</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              <li>• PRs are automatically categorized when opened</li>
                              <li>• Categories are updated when PR descriptions change</li>
                              <li>• Metrics are calculated in real-time as PRs are merged</li>
                              <li>• Team performance data updates continuously</li>
                            </ul>
                          </div>
                          <div className="rounded-lg bg-muted p-4">
                            <h4 className="font-semibold text-sm mb-2">Webhook Events Processed:</h4>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">pull_request.opened</Badge>
                              <Badge variant="outline">pull_request.closed</Badge>
                              <Badge variant="outline">pull_request.edited</Badge>
                              <Badge variant="outline">pull_request_review.submitted</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Troubleshooting */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <IconQuestionMark className="h-5 w-5" />
                            Troubleshooting
                          </CardTitle>
                          <CardDescription>
                            Common issues and how to resolve them
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold">PRs not being categorized?</h4>
                              <p className="text-sm text-muted-foreground">
                                Check that the GitHub webhook is properly installed and that your organization has sufficient AI credits.
                              </p>
                            </div>
                            <div>
                              <h4 className="font-semibold">Missing repository data?</h4>
                              <p className="text-sm text-muted-foreground">
                                Ensure the PR Cat GitHub App has access to the repository and that webhooks are enabled.
                              </p>
                            </div>
                            <div>
                              <h4 className="font-semibold">Incorrect categories?</h4>
                              <p className="text-sm text-muted-foreground">
                                Review your category definitions in Settings and ensure they clearly describe the intended scope.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Support */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <IconMail className="h-5 w-5" />
                            Get Support
                          </CardTitle>
                          <CardDescription>
                            Need help? Here's how to get assistance
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <h4 className="font-semibold flex items-center gap-2">
                                <IconBrandGithub className="h-4 w-4" />
                                GitHub Issues
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Report bugs or request features on our GitHub repository.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-semibold flex items-center gap-2">
                                <IconBook className="h-4 w-4" />
                                Documentation
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Comprehensive guides and API documentation available online.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="why-metrics-matter" className="space-y-6">
                      {/* Why These Metrics Matter */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <IconTarget className="h-5 w-5" />
                            Why These Metrics Matter
                          </CardTitle>
                          <CardDescription>
                            Practical applications for team growth, retrospectives, and engineering leadership
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          
                          {/* Team Retrospectives */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                              <IconUsers className="h-5 w-5 text-blue-500" />
                              Team Retrospectives
                            </h4>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-3">
                                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4">
                                  <h5 className="font-semibold text-sm mb-2">Cycle Time Trends</h5>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    "Our average cycle time increased from 2.1 to 3.5 days this sprint."
                                  </p>
                                  <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>• What caused the increase? Complex features or review bottlenecks?</li>
                                    <li>• Which PRs took longest and why?</li>
                                    <li>• How can we break down large PRs next sprint?</li>
                                  </ul>
                                </div>
                                <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4">
                                  <h5 className="font-semibold text-sm mb-2">Review Coverage Insights</h5>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    "Only 67% of our PRs got reviewed before merging."
                                  </p>
                                  <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>• Are we prioritizing speed over quality?</li>
                                    <li>• Which types of changes need mandatory reviews?</li>
                                    <li>• How can we make reviews faster, not optional?</li>
                                  </ul>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-4">
                                  <h5 className="font-semibold text-sm mb-2">Investment Focus</h5>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    "60% of our effort went to bug fixes vs. planned features."
                                  </p>
                                  <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>• Is this sustainable? What's driving the bugs?</li>
                                    <li>• Should we allocate dedicated bug-fix time?</li>
                                    <li>• How can we prevent rather than fix?</li>
                                  </ul>
                                </div>
                                <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 p-4">
                                  <h5 className="font-semibold text-sm mb-2">Team Collaboration</h5>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    "Collaboration index shows knowledge silos forming."
                                  </p>
                                  <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>• Are we spreading expertise across the team?</li>
                                    <li>• Should we pair program more often?</li>
                                    <li>• How can we encourage cross-component reviews?</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Engineering All-Hands */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                              <IconTrendingUp className="h-5 w-5 text-green-500" />
                              Engineering All-Hands Presentations
                            </h4>
                            <div className="space-y-4">
                              <div className="rounded-lg bg-muted p-4">
                                <h5 className="font-semibold text-sm mb-3">Quarterly Engineering Review Template</h5>
                                <div className="space-y-3 text-sm">
                                  <div>
                                    <strong>🎯 Team Velocity:</strong> "Average cycle time improved by 15% to 2.3 days, enabling faster feature delivery"
                                  </div>
                                  <div>
                                    <strong>🔍 Quality Metrics:</strong> "Review coverage at 85% - hitting our quality standards while maintaining speed"
                                  </div>
                                  <div>
                                    <strong>📊 Investment Allocation:</strong> "40% features, 25% technical debt, 20% infrastructure, 15% bugs - aligned with strategic goals"
                                  </div>
                                  <div>
                                    <strong>🤝 Team Growth:</strong> "Collaboration index shows knowledge sharing up 20% - less single points of failure"
                                  </div>
                                </div>
                              </div>
                              <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-lg border p-3 text-center">
                                  <div className="text-2xl font-bold text-blue-600">2.3d</div>
                                  <div className="text-xs text-muted-foreground">Avg Cycle Time</div>
                                  <div className="text-xs text-green-600">↓15% vs Q3</div>
                                </div>
                                <div className="rounded-lg border p-3 text-center">
                                  <div className="text-2xl font-bold text-green-600">85%</div>
                                  <div className="text-xs text-muted-foreground">Review Coverage</div>
                                  <div className="text-xs text-green-600">↑8% vs Q3</div>
                                </div>
                                <div className="rounded-lg border p-3 text-center">
                                  <div className="text-2xl font-bold text-purple-600">7.2</div>
                                  <div className="text-xs text-muted-foreground">Collaboration Index</div>
                                  <div className="text-xs text-green-600">↑20% vs Q3</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Developer Growth & Mentoring */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                              <IconCode className="h-5 w-5 text-purple-500" />
                              Developer Growth & Mentoring
                            </h4>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-3">
                                <h5 className="font-semibold text-sm">For Junior Developers</h5>
                                <div className="space-y-3">
                                  <div className="rounded-lg border-l-4 border-blue-500 pl-4 py-2">
                                    <p className="text-sm font-medium">PR Size Coaching</p>
                                    <p className="text-xs text-muted-foreground">
                                      "Your recent PRs averaged 450 lines. Let's practice breaking features into smaller, reviewable chunks of ~150 lines."
                                    </p>
                                  </div>
                                  <div className="rounded-lg border-l-4 border-green-500 pl-4 py-2">
                                    <p className="text-sm font-medium">Review Participation</p>
                                    <p className="text-xs text-muted-foreground">
                                      "You've reviewed 3 PRs this week - great! Let's focus on asking questions about patterns you don't understand."
                                    </p>
                                  </div>
                                  <div className="rounded-lg border-l-4 border-purple-500 pl-4 py-2">
                                    <p className="text-sm font-medium">Area Exposure</p>
                                    <p className="text-xs text-muted-foreground">
                                      "Your contributions are 80% frontend. Let's find opportunities to work on API endpoints next sprint."
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <h5 className="font-semibold text-sm">For Senior Developers</h5>
                                <div className="space-y-3">
                                  <div className="rounded-lg border-l-4 border-orange-500 pl-4 py-2">
                                    <p className="text-sm font-medium">Knowledge Sharing</p>
                                    <p className="text-xs text-muted-foreground">
                                      "Your reviews have great technical depth. Consider adding more 'why' explanations to help junior devs learn."
                                    </p>
                                  </div>
                                  <div className="rounded-lg border-l-4 border-red-500 pl-4 py-2">
                                    <p className="text-sm font-medium">Bottleneck Identification</p>
                                    <p className="text-xs text-muted-foreground">
                                      "You're reviewing 40% of team PRs. How can we distribute this knowledge and prevent single points of failure?"
                                    </p>
                                  </div>
                                  <div className="rounded-lg border-l-4 border-teal-500 pl-4 py-2">
                                    <p className="text-sm font-medium">Strategic Impact</p>
                                    <p className="text-xs text-muted-foreground">
                                      "Your recent focus on infrastructure (30% of time) is paying off - team cycle time improving."
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Product & Business Alignment */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                              <IconChartBar className="h-5 w-5 text-orange-500" />
                              Product & Business Alignment
                            </h4>
                            <div className="rounded-lg bg-muted p-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-3">
                                  <h5 className="font-semibold text-sm">Quarterly Planning</h5>
                                  <p className="text-sm text-muted-foreground">
                                    Use category distribution to validate that engineering effort aligns with business priorities.
                                  </p>
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    <div>• "We planned 50% new features, but delivered 30%"</div>
                                    <div>• "Technical debt work was 15% vs planned 25%"</div>
                                    <div>• "Bug fixes consumed 35% - investigate root causes"</div>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <h5 className="font-semibold text-sm">Resource Allocation</h5>
                                  <p className="text-sm text-muted-foreground">
                                    Identify where the team is actually spending time vs. where they should be.
                                  </p>
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    <div>• Justify hiring for high-effort areas</div>
                                    <div>• Rebalance team focus based on actual data</div>
                                    <div>• Communicate trade-offs to stakeholders</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Items Template */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                              <IconListDetails className="h-5 w-5 text-red-500" />
                              From Metrics to Action Items
                            </h4>
                            <div className="rounded-lg border p-4">
                              <h5 className="font-semibold text-sm mb-3">Weekly Team Check-in Template</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center py-1 border-b">
                                  <span>📈 <strong>What's improving?</strong></span>
                                  <span className="text-muted-foreground">Review cycle time, collaboration trends</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b">
                                  <span>🚩 <strong>What needs attention?</strong></span>
                                  <span className="text-muted-foreground">Large PRs, review bottlenecks, knowledge silos</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b">
                                  <span>🎯 <strong>This week's focus?</strong></span>
                                  <span className="text-muted-foreground">Specific actions based on data trends</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span>📊 <strong>Success metrics?</strong></span>
                                  <span className="text-muted-foreground">How will we measure improvement?</span>
                                </div>
                              </div>
                            </div>
                          </div>

                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>

                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 