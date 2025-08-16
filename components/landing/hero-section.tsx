import React from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { IconBrandGithub } from "@tabler/icons-react"

export function HeroSection() {
    return (
        <main className="overflow-hidden">
            <div
                aria-hidden
                className="absolute inset-0 isolate hidden opacity-65 contain-strict lg:block">
                <div className="w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
                <div className="h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
                <div className="h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
            </div>
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

                            <h1 className="mt-8 text-balance text-6xl md:text-7xl lg:mt-16 xl:text-[5.25rem] font-bold tracking-tight text-white">
                                Engineering Analytics<br />
                                You Can Actually Trust
                            </h1>
                            <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-[#a1a1aa]">
                                Self-hosted GitHub PR analytics for developers and their teams who want transparency, control, and insights that actually help everyone grow together.
                            </p>

                            <div className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row">
                                <div className="bg-white/10 rounded-[calc(1.5rem+0.125rem)] border border-[#262626]/60 p-0.5">
                                    <Button
                                        asChild
                                        size="lg"
                                        className="rounded-xl px-5 text-base bg-white text-black hover:bg-gray-100">
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

                    <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                        <div
                            aria-hidden
                            className="bg-gradient-to-b to-[#0b0b0b] absolute inset-0 z-10 from-transparent from-35%"
                        />
                        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[#262626]/60 p-4 shadow-lg shadow-black/30 ring-1 ring-[#262626]/30 bg-[#0b0b0b]/80 backdrop-blur-sm">
                            <Image
                                className="bg-[#0b0b0b] aspect-[15/8] relative rounded-2xl"
                                src="/dashboard2.png"
                                alt="PR Cat Dashboard Screenshot"
                                width="2700"
                                height="1440"
                                priority
                            />
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