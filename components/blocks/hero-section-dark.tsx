"use client";

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PrcatLogo } from "@/components/ui/prcat-logo"
import { Menu, X } from "lucide-react"
import { useSession } from "next-auth/react"

interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  titleHref?: string
  subtitle?: {
    regular: string
    gradient: string
  }
  description?: string
  ctaText?: string
  ctaHref?: string
  secondaryCtaText?: string
  secondaryCtaHref?: string
  bottomImage?: {
    light: string
    dark: string
  }
  gridOptions?: {
    angle?: number
    cellSize?: number
    opacity?: number
    lightLineColor?: string
    darkLineColor?: string
  }
}

const RetroGrid = ({
  angle = 65,
  cellSize = 60,
  opacity = 0.5,
  lightLineColor = "gray",
  darkLineColor = "gray",
}) => {
  const gridStyles = {
    "--grid-angle": `${angle}deg`,
    "--cell-size": `${cellSize}px`,
    "--opacity": opacity,
    "--light-line": lightLineColor,
    "--dark-line": darkLineColor,
  } as React.CSSProperties

  return (
    <div
      className={cn(
        "pointer-events-none absolute size-full overflow-hidden [perspective:200px]",
        `opacity-[var(--opacity)]`,
      )}
      style={gridStyles}
    >
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div className="animate-grid [background-image:linear-gradient(to_right,var(--light-line)_1px,transparent_0),linear-gradient(to_bottom,var(--light-line)_1px,transparent_0)] [background-repeat:repeat] [background-size:var(--cell-size)_var(--cell-size)] [height:300vh] [inset:0%_0px] [margin-left:-200%] [transform-origin:100%_0_0] [width:600vw] dark:[background-image:linear-gradient(to_right,var(--dark-line)_1px,transparent_0),linear-gradient(to_bottom,var(--dark-line)_1px,transparent_0)]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent to-90% dark:from-black" />
    </div>
  )
}

const menuItems = [
  { name: "Features", href: "#features" },
  { name: "Metrics", href: "#metrics" },
  { name: "Benefits", href: "#benefits" },
];

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  (
    {
      className,
      title = "Build products for everyone",
      titleHref = "#",
      subtitle = {
        regular: "Designing your projects faster with ",
        gradient: "the largest figma UI kit.",
      },
      description = "Sed ut perspiciatis unde omnis iste natus voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae.",
      ctaText = "Browse courses",
      ctaHref = "#",
      secondaryCtaText,
      secondaryCtaHref = "#",
      bottomImage = {
        light: "https://farmui.vercel.app/dashboard-light.png",
        dark: "https://farmui.vercel.app/dashboard.png",
      },
      gridOptions,
      ...props
    },
    ref,
  ) => {
    const [menuState, setMenuState] = React.useState(false);
    const { data: session } = useSession();

    return (
      <div className={cn("relative", className)} ref={ref} {...props}>
        <div className="absolute top-0 z-[0] h-screen w-screen bg-zinc-300/10 dark:bg-zinc-700/10 bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(140,140,140,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(80,80,80,0.3),rgba(255,255,255,0))]" />
        
        {/* Navigation Header - Style from hero-section-9.tsx */}
        <header>
          <nav
            data-state={menuState && 'active'}
            className="group fixed z-20 w-full border-b border-dashed bg-white backdrop-blur md:relative dark:bg-zinc-950/50 lg:dark:bg-transparent">
            <div className="m-auto max-w-5xl px-6">
              <div className="flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
                <div className="flex flex-row w-full justify-between lg:w-auto">
                  <Link
                    href="/"
                    aria-label="home"
                    className="inline-flex flex-row items-center gap-2">
                    <PrcatLogo dark={false} fontSize="text-xl" iconSize="h-5 w-5" className="dark:hidden" />
                    <PrcatLogo dark={true} fontSize="text-xl" iconSize="h-5 w-5" className="hidden dark:block" />
                  </Link>

                  <button
                    onClick={() => setMenuState(!menuState)}
                    aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                    className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                    <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                    <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                  </button>
                </div>

                <div className="bg-background group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                  <div className="lg:pr-4">
                    <ul className="space-y-6 text-base lg:flex lg:gap-8 lg:space-y-0 lg:text-sm">
                      {menuItems.map((item, index) => (
                        <li key={index}>
                          <Link
                            href={item.href}
                            className="text-muted-foreground hover:text-accent-foreground block duration-150">
                            <span>{item.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit lg:border-l lg:pl-6">
                    {session ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm">
                        <Link href="/dashboard">
                          <span>Dashboard</span>
                        </Link>
                      </Button>
                    ) : null}
                    {session ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm">
                        <Link href="/api/auth/signout">
                          <span>Sign out</span>
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        size="sm">
                        <Link href="/sign-in">
                          <span>Sign in</span>
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </header>
        
        <section className="relative max-w-full mx-auto z-1">
          <RetroGrid {...gridOptions} />
          <div className="max-w-screen-xl z-10 mx-auto px-4 py-28 gap-12 md:px-8">
            <div className="space-y-5 max-w-3xl leading-0 lg:leading-5 mx-auto text-center">
              <h1 className="text-sm text-gray-600 dark:text-gray-400 group font-geist mx-auto px-5 py-2 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 border-[2px] border-black/5 dark:border-white/5 rounded-3xl w-fit">
                <Link href={titleHref}>
                  {title}
                  <ChevronRight className="inline w-4 h-4 ml-2 group-hover:translate-x-1 duration-300" />
                </Link>
              </h1>
              <h2 className="text-4xl tracking-tighter font-geist bg-clip-text text-transparent mx-auto md:text-6xl bg-[linear-gradient(180deg,_#000_0%,_rgba(0,_0,_0,_0.75)_100%)] dark:bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
                {subtitle.regular}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70 dark:from-primary dark:to-primary/70">
                  {subtitle.gradient}
                </span>
              </h2>
              <p className="max-w-2xl mx-auto text-gray-600 dark:text-gray-300">
                {description}
              </p>
              <div className="items-center justify-center gap-x-4 space-y-3 sm:flex sm:space-y-0">
                {session ? (
                  <Button asChild size="lg" className="px-8">
                    <Link href={ctaHref}>
                      {ctaText}
                    </Link>
                  </Button>
                ) : null}
                
                {secondaryCtaText && !session && (
                  <Button asChild variant="outline" size="lg" className="border-gray-300 dark:border-gray-700">
                    <Link href={secondaryCtaHref}>
                      {secondaryCtaText}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            {bottomImage && (
              <div className="mt-16 mx-auto px-6 max-w-6xl relative z-10">
                <div className="relative">
                  <img
                    src={bottomImage.light}
                    className="w-full shadow-lg rounded-lg border border-gray-200 dark:hidden"
                    alt="Dashboard preview"
                  />
                  <img
                    src={bottomImage.dark}
                    className="hidden w-full shadow-lg rounded-lg border border-gray-800 dark:block"
                    alt="Dashboard preview"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    )
  },
)
HeroSection.displayName = "HeroSection"

export { HeroSection }
