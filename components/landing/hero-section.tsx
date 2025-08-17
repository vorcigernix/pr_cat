import React from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { IconBrandGithub } from "@tabler/icons-react"
import { TextLoop } from '@/components/motion-primitives/text-loop'
import { TextRoll } from '@/components/motion-primitives/text-roll'
import { Tilt } from '@/components/motion-primitives/tilt'
import { GlowEffect } from '@/components/motion-primitives/glow-effect'

export function HeroSection() {
    return (
        <main className="overflow-hidden">

            <section>
                <div className="relative pt-24 md:pt-36">
                    <div className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,#0b0b0b_75%)]"></div>
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                            <Link
                                href="https://github.com/vorcigernix/pr_cat"
                                className="hover:bg-[#0f0f10] hover:border-t-[#262626] bg-[#111111] group mx-auto flex w-fit items-center gap-4 rounded-full border border-[#262626]/60 p-1 pl-4 shadow-md shadow-black/30 transition-colors duration-300">
                                <span className="text-[#f5f5f5] text-sm">Open Source GitHub Analytics</span>
                                <span className="border-[#0b0b0b] block h-4 w-0.5 border-l bg-[#3f3f46]"></span>

                                <div className="bg-[#0b0b0b] group-hover:bg-[#111111] size-6 overflow-hidden rounded-full duration-500">
                                    <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                                        <span className="flex size-6">
                                            <ArrowRight className="m-auto size-3 text-white" />
                                        </span>
                                        <span className="flex size-6">
                                            <ArrowRight className="m-auto size-3 text-white" />
                                        </span>
                                    </div>
                                </div>
                            </Link>

                            <h1 className="mt-8 text-balance text-6xl md:text-7xl lg:mt-16 xl:text-[5.25rem] font-bold tracking-tight text-white text-center">
                                <div className="sm:hidden">
                                    <TextRoll duration={0.6}>Data</TextRoll>
                                    <div className="my-2">
                                        <TextRoll duration={0.6}>&gt;</TextRoll>
                                    </div>
                                    <TextRoll duration={0.6}>Feelings</TextRoll>
                                </div>
                                <div className="hidden sm:block">
                                    <TextRoll duration={0.6}>Data &gt; Feelings</TextRoll>
                                </div>
                            </h1>
                            <div className="mx-auto mt-6 text-balance text-lg sm:text-xl md:text-2xl text-[#e4e4e7] text-center px-4">
                                {/* Mobile version with shorter text */}
                                <div className="sm:hidden max-w-xs mx-auto">
                                    <TextLoop 
                                        className="inline-block" 
                                        interval={4}
                                        transition={{ duration: 1 }}
                                        variants={{
                                            initial: { opacity: 0, x: 300 },
                                            animate: { opacity: 1, x: 0 },
                                            exit: { opacity: 0, x: -300 }
                                        }}
                                    >
                                        <span>Team alignment &gt; Superstars</span>
                                        <span>Progress &gt; Push</span>
                                        <span>Transparency &gt; Politics</span>
                                    </TextLoop>
                                </div>
                                {/* Desktop version */}
                                <div className="hidden sm:block max-w-2xl mx-auto">
                                <TextLoop 
                                        className="inline-block" 
                                        interval={4}
                                        transition={{ duration: 1 }}
                                        variants={{
                                            initial: { opacity: 0, x: 300 },
                                            animate: { opacity: 1, x: 0 },
                                            exit: { opacity: 0, x: -300 }
                                        }}
                                    >
                                        <span>Team alignment &gt; Individual performance</span>
                                        <span>Continuous improvement &gt; Managerial push</span>
                                        <span>Transparency &gt; Politics</span>
                                    </TextLoop>
                                </div>
                            </div>
                            <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-[#a1a1aa]">
                                Self-hosted GitHub analytics that puts evidence-based decisions first, fostering team growth through transparency and continuous improvement.
                            </p>

                            <div className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row">
                                <div className="relative inline-block w-fit">
                                    <GlowEffect
                                        colors={['#8B5CF6', '#C959DD', '#A78BFA', '#D946EF']}
                                        mode='static'
                                        blur='medium'
                                    />
                                    <Button
                                        asChild
                                        size="lg"
                                        className="relative rounded-xl px-5 text-base bg-white/90 backdrop-blur-sm text-black hover:bg-white/95 shadow-lg border border-white/30">
                                        <Link href="https://github.com/vorcigernix/pr_cat" target="_blank" rel="noopener noreferrer">
                                            <IconBrandGithub className="mr-2 h-4 w-4" />
                                            <span className="text-nowrap">Start Building</span>
                                        </Link>
                                    </Button>
                                </div>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="ghost"
                                    className="h-10.5 rounded-xl px-5 text-white hover:bg-white/10">
                                    <Link href="#why-open-source">
                                        <span className="text-nowrap">Learn more</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="relative -mr-56 mt-8 px-2 sm:mr-0 sm:mt-12 md:mt-20">
                        <div
                            aria-hidden
                            className="bg-gradient-to-b to-[#0b0b0b] absolute inset-0 z-10 from-transparent from-35% pointer-events-none"
                        />
                        <div className="relative mx-auto max-w-6xl">
                            <Tilt 
                                rotationFactor={8} 
                                isRevese={false}
                                className="w-full"
                            >
                                <div className="overflow-hidden rounded-2xl border border-[#262626]/60 p-4 shadow-lg shadow-black/30 ring-1 ring-[#262626]/30 bg-[#0b0b0b]/80 backdrop-blur-sm">
                                    <Image
                                        className="bg-[#0b0b0b] aspect-[15/8] relative rounded-2xl"
                                        src="/dashboard2.png"
                                        alt="PR Cat Dashboard Screenshot"
                                        width="2700"
                                        height="1440"
                                        priority
                                    />
                                </div>
                            </Tilt>
                        </div>
                    </div>
                </div>
            </section>
            <section className="bg-[#0b0b0b] pb-16 pt-16 md:pb-32">
                <div className="group relative m-auto max-w-5xl px-6">
                    <div className="absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:scale-100 group-hover:opacity-100">
                        <Link
                            href="https://github.com/vorcigernix/pr_cat"
                            className="block text-sm duration-150 hover:opacity-75 text-white">
                            <span>Trusted by engineering teams</span>
                            <ChevronRight className="ml-1 inline-block size-3" />
                        </Link>
                    </div>
                    <div className="group-hover:blur-xs mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-x-12 gap-y-8 transition-all duration-500 group-hover:opacity-50 sm:gap-x-16 sm:gap-y-14">
                        <div className="flex">
                            <span className="mx-auto text-sm font-medium text-[#a1a1aa]">MIT Licensed</span>
                        </div>
                        <div className="flex">
                            <span className="mx-auto text-sm font-medium text-[#a1a1aa]">Self-Hostable</span>
                        </div>
                        <div className="flex">
                            <span className="mx-auto text-sm font-medium text-[#a1a1aa]">Open Source</span>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
} 