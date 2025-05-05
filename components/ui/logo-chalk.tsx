"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { motion } from "framer-motion";

interface ChalkLogoProps {
  className?: string;
  animate?: boolean;
}

export function ChalkLogo({ className, animate = true }: ChalkLogoProps) {
  // SVG path for "prcat" in a handwritten/chalk style
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { type: "spring", duration: 2.5, bounce: 0.2 },
        opacity: { duration: 0.5 }
      }
    }
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 40"
        className="h-8 w-auto text-white opacity-90"
        style={{
          filter: "drop-shadow(0px 0px 1px rgba(255,255,255,0.5))",
        }}
      >
        {animate ? (
          <motion.path
            d="M7,21 C7,14 10,13 12,15 C14,17 13,22 13,25 C13,27 13,29 12,31 M17,21 C16,18 20,16 23,18 C25,19 22,23 20,22 C18,21 17,27 21,26 C24,25 26,22 26,22 M30,20 C28,12 34,15 33,20 C32,25 32,30 32,30 M38,22 C37,17 41,16 42,20 C43,24 39,26 38,22 M50,20 C48,15 47,25 50,25 C53,25 55,20 55,20 Z"
            fill="none"
            strokeWidth="1.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial="hidden"
            animate="visible"
            variants={pathVariants}
            style={{
              strokeDasharray: "1,2",
              strokeDashoffset: "0",
            }}
          />
        ) : (
          <path
            d="M7,21 C7,14 10,13 12,15 C14,17 13,22 13,25 C13,27 13,29 12,31 M17,21 C16,18 20,16 23,18 C25,19 22,23 20,22 C18,21 17,27 21,26 C24,25 26,22 26,22 M30,20 C28,12 34,15 33,20 C32,25 32,30 32,30 M38,22 C37,17 41,16 42,20 C43,24 39,26 38,22 M50,20 C48,15 47,25 50,25 C53,25 55,20 55,20 Z"
            fill="none"
            strokeWidth="1.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: "1,2",
              strokeDashoffset: "0",
            }}
          />
        )}
      </svg>
    </div>
  );
} 