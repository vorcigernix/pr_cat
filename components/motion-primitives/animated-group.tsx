"use client"

import React, { useState, useEffect } from "react"
import { motion, Variants } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedGroupProps {
  children: React.ReactNode
  variants?: any // Allow more flexible variant structure
  className?: string
  as?: keyof React.JSX.IntrinsicElements
  delay?: number
}

export function AnimatedGroup({
  children,
  variants,
  className,
  as: Component = "div",
  delay = 0,
}: AnimatedGroupProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const MotionComponent = motion(Component)

  const defaultVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: delay,
      },
    },
  }

  const finalVariants = variants || defaultVariants

  return (
    <MotionComponent
      className={cn(className)}
      variants={finalVariants}
      initial="hidden"
      animate={isMounted ? "visible" : "hidden"}
    >
      {children}
    </MotionComponent>
  )
}
