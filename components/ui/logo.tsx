"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { motion, type Variants } from "framer-motion";

interface LogoProps {
  className?: string;
  animate?: boolean;
  dark?: boolean;
}

export function Logo({ className, animate = true, dark = false }: LogoProps) {
  // SVG path for "prcat" in a handwritten/cursive style
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { type: "spring", duration: 2, bounce: 0 },
        opacity: { duration: 0.3 }
      }
    }
  } as const satisfies Variants;

  return (
    <div className={cn("relative inline-block", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 40"
        className={cn(
          "h-8 w-auto",
          dark ? "text-white" : "text-primary"
        )}
      >
        {animate ? (
          <motion.path
            d="M8,20 C8,12 12,12 15,16 C16,18 16,22 16,24 C16,26 15,28 15,30 M17,20 C17,18 20,17 22,17 C25,17 27,19 25,22 C23,25 15,25 17,28 C19,31 23,29 25,27 M30,20 C30,10 35,15 35,20 C35,25 35,30 35,30 M40,20 C40,15 45,15 45,20 C45,25 40,27 40,20 M55,20 C50,12 48,25 50,25 C52,25 55,20 55,20 Z"
            fill="none"
            strokeWidth="2"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial="hidden"
            animate="visible"
            variants={pathVariants}
          />
        ) : (
          <path
            d="M8,20 C8,12 12,12 15,16 C16,18 16,22 16,24 C16,26 15,28 15,30 M17,20 C17,18 20,17 22,17 C25,17 27,19 25,22 C23,25 15,25 17,28 C19,31 23,29 25,27 M30,20 C30,10 35,15 35,20 C35,25 35,30 35,30 M40,20 C40,15 45,15 45,20 C45,25 40,27 40,20 M55,20 C50,12 48,25 50,25 C52,25 55,20 55,20 Z"
            fill="none"
            strokeWidth="2"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
} 
