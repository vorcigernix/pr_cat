"use client"

import * as React from "react"
import { IconBulb, IconArrowRight } from "@tabler/icons-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

type Recommendation = {
  id: string;
  title: string;
  description: string;
}

const recommendations: Recommendation[] = [
  {
    id: "tech-debt-focus",
    title: "Focus on Technical Debt",
    description: "You're spending too much time fixing bugs and not enough on tech debt. Investing in tech debt now will reduce bugs in the future."
  },
  {
    id: "review-time",
    title: "Improve Review Process",
    description: "Your PR review time has increased by 25% in the last month. Consider setting up review SLAs to keep delivery flowing."
  },
  {
    id: "feature-balance",
    title: "Balance Feature Work",
    description: "Your team is focusing 70% on features but only 10% on technical foundations. This imbalance may lead to stability issues."
  },
  {
    id: "deploy-frequency",
    title: "Increase Deployment Frequency",
    description: "Teams that deploy more frequently have better quality metrics. Consider breaking work into smaller chunks."
  }
]

export function ActionableRecommendations() {
  const [currentRecommendation, setCurrentRecommendation] = React.useState<Recommendation | null>(null);

  React.useEffect(() => {
    // In a real application, this would analyze actual data to generate recommendations
    // For demo purposes, just pick one randomly
    const randomIndex = Math.floor(Math.random() * recommendations.length);
    setCurrentRecommendation(recommendations[randomIndex]);
  }, []);

  if (!currentRecommendation) {
    return null;
  }

  return (
    <Alert variant="info" className="relative">
      <IconBulb className="h-4 w-4" />
      <AlertTitle className="flex items-center">
        {currentRecommendation.title}
        <span className="ml-2 text-xs text-muted-foreground font-normal">
          AI-powered recommendation
        </span>
      </AlertTitle>
      <AlertDescription className="flex items-start justify-between mt-1">
        <span className="text-sm leading-relaxed">
          {currentRecommendation.description}
        </span>
        <button className="text-xs font-medium flex items-center ml-4 text-primary hover:text-primary/80 transition-colors">
          <span>View Analysis</span>
          <IconArrowRight className="h-3.5 w-3.5 ml-1" />
        </button>
      </AlertDescription>
    </Alert>
  );
} 