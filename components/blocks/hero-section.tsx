"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PrcatLogo } from "@/components/ui/prcat-logo";
import { AnimatedScreenshots } from "@/components/ui/animated-screenshots";
import { Menu, X } from "lucide-react";

const menuItems = [
  { name: "Features", href: "#features" },
  { name: "Metrics", href: "#metrics" },
  { name: "Benefits", href: "#benefits" },
];

export const HeroSection = () => {
  const [menuState, setMenuState] = React.useState(false);
  
  return (
    <div className="bg-black text-white overflow-hidden">
      <header>
        <nav
          data-state={menuState && 'active'}
          className="group fixed z-20 w-full border-b border-white/10 bg-black/80 backdrop-blur md:relative">
          <div className="m-auto max-w-6xl px-6">
            <div className="flex flex-wrap items-center justify-between gap-6 py-4 lg:gap-0">
              <div className="flex w-full justify-between lg:w-auto">
                <Link
                  href="/"
                  aria-label="home"
                  className="flex items-center space-x-2">
                  <PrcatLogo dark={true} fontSize="text-xl" iconSize="h-5 w-5" />
                </Link>

                <button
                  onClick={() => setMenuState(!menuState)}
                  aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                  className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 text-white lg:hidden">
                  <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                  <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                </button>
              </div>

              <div className="bg-black/90 group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-white/10 p-6 shadow-2xl md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
                <div className="lg:pr-4">
                  <ul className="space-y-6 text-base lg:flex lg:gap-8 lg:space-y-0 lg:text-sm">
                    {menuItems.map((item, index) => (
                      <li key={index}>
                        <Link
                          href={item.href}
                          className="text-white/70 hover:text-white block duration-150">
                          <span>{item.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit lg:border-l lg:border-white/10 lg:pl-6">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-white/20 hover:bg-white/10 text-white">
                    <Link href="/dashboard">
                      <span>Dashboard</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm">
                    <Link href="/sign-in">
                      <span>Sign in</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="relative">
        {/* Subtle background gradient effect */}
        <div
          aria-hidden
          className="z-[2] absolute inset-0 pointer-events-none isolate opacity-20 overflow-hidden">
          <div 
            className="absolute -left-[10%] top-0 w-[40%] h-[80%] rounded-full"
            style={{
              background: "radial-gradient(50% 50% at 50% 50%, rgba(71, 127, 247, 0.15) 0%, rgba(60, 120, 244, 0.08) 50%, rgba(20, 100, 240, 0) 85%)"
            }}
          />
          <div 
            className="absolute -right-[5%] top-[10%] w-[30%] h-[60%] rounded-full"
            style={{
              background: "radial-gradient(50% 50% at 50% 50%, rgba(180, 100, 250, 0.12) 0%, rgba(160, 90, 220, 0.06) 50%, rgba(150, 80, 210, 0) 85%)"
            }}
          />
        </div>

        <section className="overflow-hidden pt-28 pb-16 lg:pt-32 lg:pb-20">
          <div className="relative mx-auto max-w-6xl px-6">
            <div className="grid gap-16 md:grid-cols-2 md:gap-24 items-center">
              <div className="relative z-10 flex flex-col justify-center space-y-5 text-center md:text-left">
                <h1 className="text-balance text-4xl font-semibold md:text-5xl lg:text-5xl text-white">
                  Engineering metrics for <span className="text-primary">teams</span>, not managers
                </h1>
                <p className="text-xl text-white/70">
                  Prcat provides your engineering team with meaningful data about your development workflow - helping you identify bottlenecks and improve together.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 pt-6 justify-center md:justify-start">
                  <Button size="lg" asChild>
                    <Link href="/dashboard">
                      <span>View Dashboard</span>
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="border-white/20 hover:bg-white/10 text-white" 
                    asChild
                  >
                    <Link href="/sign-in">
                      <span>Sign in with GitHub</span>
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="relative h-[450px] md:h-[500px] mx-auto w-full z-10">
                <AnimatedScreenshots />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-black relative z-10 py-16">
          <div className="m-auto max-w-6xl px-6">
            <h2 className="text-center text-lg font-medium text-white/90">Trusted by engineering teams worldwide</h2>
            <div className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-x-12 gap-y-8">
              <img
                className="h-5 w-fit invert opacity-70 hover:opacity-100 transition-opacity"
                src="https://html.tailus.io/blocks/customers/github.svg"
                alt="GitHub Logo"
                height="16"
                width="auto"
              />
              <img
                className="h-5 w-fit invert opacity-70 hover:opacity-100 transition-opacity"
                src="https://html.tailus.io/blocks/customers/vercel.svg"
                alt="Vercel Logo"
                height="20"
                width="auto"
              />
              <img
                className="h-4 w-fit invert opacity-70 hover:opacity-100 transition-opacity"
                src="https://html.tailus.io/blocks/customers/tailwindcss.svg"
                alt="Tailwind CSS Logo"
                height="16"
                width="auto"
              />
              <img
                className="h-6 w-fit invert opacity-70 hover:opacity-100 transition-opacity"
                src="https://html.tailus.io/blocks/customers/openai.svg"
                alt="OpenAI Logo"
                height="24"
                width="auto"
              />
              <img
                className="h-4 w-fit invert opacity-70 hover:opacity-100 transition-opacity"
                src="https://html.tailus.io/blocks/customers/laravel.svg"
                alt="Laravel Logo"
                height="16"
                width="auto"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}; 