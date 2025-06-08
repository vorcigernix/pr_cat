import React from 'react'
import { AnimatedHeader } from '@/components/landing/animated-header'
import { HeroSection } from '@/components/landing/hero-section'
import { MetricsGrid } from '@/components/landing/metrics-grid'
import { Footer } from '@/components/landing/footer'
import { OpenSourceSection } from '@/components/landing/open-source-section'
import { PracticalValueSection } from '@/components/landing/practical-value-section'
import { CTASection } from '@/components/landing/cta-section'

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AnimatedHeader />
      <HeroSection />
      <OpenSourceSection />
      <PracticalValueSection />
      <MetricsGrid />
      <CTASection />
      <Footer />
    </div>
  )
}

