import Link from "next/link";
import { IconBrandGithub, IconArrowRight, IconCode, IconChartBar, IconClock, IconReportAnalytics, IconTargetArrow, IconSpeakerphone, IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  // Sample data for metrics
  const metricsData = {
    codingTime: { value: 4.6, change: 0.3, trend: "up" },
    prSize: { value: 359, change: -55, trend: "up" },
    cycleTime: { value: 77.8, change: -5.4, trend: "up" },
    reviewTime: { value: 39.1, change: -5.9, trend: "up" }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b">
        <div className="container max-w-6xl mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-2">
            <IconCode className="h-5 w-5" />
            <span className="text-xl font-semibold">prcat</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium hover:underline">Features</Link>
            <Link href="#metrics" className="text-sm font-medium hover:underline">Metrics</Link>
            <Link href="#benefits" className="text-sm font-medium hover:underline">Benefits</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">Dashboard</Button>
            </Link>
            <Link href="/sign-in">
              <Button className="flex items-center gap-2" size="sm">
                <IconBrandGithub className="h-4 w-4" />
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid gap-12 md:grid-cols-2 md:gap-12 items-center">
            <div className="flex flex-col justify-center space-y-4 text-center md:text-left">
              <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
                Engineering metrics for <span className="text-primary">teams</span>, not managers
              </h1>
              <p className="text-xl text-muted-foreground">
                Prcat provides your engineering team with meaningful data about your development workflow - helping you identify bottlenecks and improve together.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center md:justify-start">
                <Link href="/dashboard">
                  <Button size="lg" className="flex items-center gap-2">
                    View Dashboard
                    <IconArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button variant="outline" size="lg" className="flex items-center gap-2">
                    <IconBrandGithub className="h-5 w-5" />
                    Sign in with GitHub
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-center relative rounded-lg shadow-lg overflow-hidden p-2 bg-muted/50">
              <div className="grid grid-cols-2 gap-3 w-full h-[350px] p-4 bg-background rounded-md">
                <Card className="col-span-2 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Engineering Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[140px] w-full relative">
                      {/* Static chart representation */}
                      <div className="absolute inset-0 flex items-end px-4">
                        <div className="relative flex-1 h-full flex items-end">
                          {/* X-axis */}
                          <div className="absolute bottom-0 w-full h-[1px] bg-border"></div>
                          
                          {/* Chart bars/areas */}
                          <div className="flex justify-between w-full h-full items-end pb-4">
                            {[65, 80, 55, 95, 70, 45, 75].map((height, i) => (
                              <div key={i} className="flex flex-col items-center w-8">
                                <div 
                                  className="w-8 rounded-t-sm bg-gradient-to-t from-primary/20 to-primary/5"
                                  style={{ height: `${height}%` }}
                                ></div>
                                <div className="mt-1 text-[8px] text-muted-foreground">
                                  {i % 2 === 0 ? `Mar ${(i+1)*5}` : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Area chart line */}
                          <svg className="absolute inset-0" width="100%" height="100%">
                            <path 
                              d="M10,80 L50,40 L90,65 L130,20 L170,50 L210,70 L250,40" 
                              fill="none" 
                              stroke="#0284c7" 
                              strokeWidth="2"
                            />
                            <path 
                              d="M10,90 L50,70 L90,80 L130,60 L170,85 L210,75 L250,65" 
                              fill="none" 
                              stroke="#22c55e" 
                              strokeWidth="2"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="overflow-hidden">
                  <CardHeader className="py-3">
                    <CardDescription className="text-xs">Cycle Time</CardDescription>
                    <CardTitle className="text-lg font-semibold">
                      {metricsData.cycleTime.value} hrs
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline" className="text-green-500 text-xs">
                        <IconTrendingUp className="h-3 w-3 mr-1" />
                        {metricsData.cycleTime.change} hrs
                      </Badge>
                    </CardAction>
                  </CardHeader>
                </Card>
                
                <Card className="overflow-hidden">
                  <CardHeader className="py-3">
                    <CardDescription className="text-xs">PR Size</CardDescription>
                    <CardTitle className="text-lg font-semibold">
                      {metricsData.prSize.value} LOC
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline" className="text-green-500 text-xs">
                        <IconTrendingDown className="h-3 w-3 mr-1" />
                        {metricsData.prSize.change}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                <Link href="/dashboard">
                  <Button className="w-full" size="lg">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-auto py-6 md:py-8">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <IconCode className="h-5 w-5" />
              <span className="font-medium">prcat</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Engineering metrics for teams, not managers
            </p>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm hover:underline">Dashboard</Link>
              <Link href="/sign-in" className="text-sm hover:underline">Sign in</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
