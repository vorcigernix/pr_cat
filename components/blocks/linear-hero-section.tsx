import { HeroSection } from "@/components/blocks/hero-section-dark"

function PRHeroSection() {
  return (
    <HeroSection
      title="based on AI PR categorizer"
      titleHref="#ai-categorizer"
      subtitle={{
        regular: "Engineering metrics for ",
        gradient: "teams, not managers",
      }}
      description="Prcat provides your engineering team with meaningful data about your development workflow - helping you identify bottlenecks and improve together."
      ctaText="View Dashboard"
      ctaHref="/dashboard"
      secondaryCtaText="Sign in with GitHub"
      secondaryCtaHref="/sign-in"
      bottomImage={{
        light: "/screen1.png",
        dark: "/screen1.png",
      }}
      gridOptions={{
        angle: 45,
        opacity: 0.3,
        cellSize: 40,
        lightLineColor: "#3a3a3a",
        darkLineColor: "#2a2a2a",
      }}
      className="bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-zinc-900"
    />
  )
}
export { PRHeroSection }
