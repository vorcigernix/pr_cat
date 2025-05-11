import { HeroSection } from "@/components/blocks/hero-section-dark"
import { Session } from "next-auth";

interface PRHeroSectionProps {
  session?: Session | null;
}

function PRHeroSection({ session }: PRHeroSectionProps) {
  return (
    <HeroSection
      session={session}
      title="based on AI PR categorizer"
      titleHref="#ai-categorizer"
      subtitle={{
        regular: "For builders and ",
        gradient: "everyone who helps them",
      }}
      description="PR Cat helps engineering leads who are in the trenches with their teams. Not an enterprise surveillance tool, but a collaborative platform that improves flow and removes barriers together."
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
