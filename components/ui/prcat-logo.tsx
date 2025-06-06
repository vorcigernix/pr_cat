"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface PrcatLogoProps {
  className?: string;
  dark?: boolean;
  iconSize?: string;
  fontSize?: string;
}

export function PrcatLogo({ 
  className, 
  dark = false, 
  iconSize = "h-5 w-5", 
  fontSize = "text-lg"
}: PrcatLogoProps) {
  return (
    <div className={cn("inline-flex flex-row items-center", className)}>
      <div className="flex flex-row items-center">
        <span className={cn("inline-block font-bold", fontSize, dark ? "text-white" : "text-foreground")}>PR</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 16 16" 
          className={cn(
            iconSize,
            "mx-0.5 inline-block",
            dark ? "fill-white" : "fill-primary"
          )}
        >
          <path 
            fill="currentColor" 
            fillRule="evenodd" 
            d="M1.5 9c0 0.69781 0.10996 1.3699 0.3135 2H0v1.5h2.52182c0.11848 0.1851 0.24608 0.3637 0.38217 0.5353L1 14.9393 2.06066 16l1.90399 -1.904C5.07323 14.975 6.47531 15.5 8 15.5s2.9268 -0.525 4.0353 -1.404L13.9393 16 15 14.9393l-1.904 -1.904c0.1361 -0.1716 0.2637 -0.3502 0.3822 -0.5353H16V11h-1.8135c0.2035 -0.6301 0.3135 -1.30219 0.3135 -2V0.5C12.2612 0.5 10.366 1.97145 9.7289 4H6.2711C5.63397 1.97145 3.73882 0.5 1.5 0.5V9ZM8 13l-2 -2h4l-2 2Z" 
            clipRule="evenodd"
          />
        </svg>
        <span className={cn("inline-block font-bold", fontSize, dark ? "text-white" : "text-foreground")}>Cat</span>
      </div>
    </div>
  );
} 