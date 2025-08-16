"use client"

import React, { useState, useEffect } from "react"
import { motion, Variants } from "framer-motion"
import { cn } from "@/lib/utils"

interface TextEffectProps {
  children: string
  per?: "word" | "char" | "line"
  as?: keyof React.JSX.IntrinsicElements
  variants?: Variants
  className?: string
  preset?: "fade-in-blur" | "slide-up" | "scale-in"
  speedSegment?: number
  delay?: number
}

const presets = {
  "fade-in-blur": {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
    },
  },
  "slide-up": {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
    },
  },
  "scale-in": {
    hidden: {
      opacity: 0,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      scale: 1,
    },
  },
}

export function TextEffect({
  children,
  per = "word",
  as: Component = "div",
  variants,
  className,
  preset = "fade-in-blur",
  speedSegment = 0.1,
  delay = 0,
}: TextEffectProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const MotionComponent = motion(Component)
  const selectedVariants = variants || presets[preset]

  if (per === "line") {
    const lines = children.split("\n").filter((line) => line.length > 0)
    
    return (
      <MotionComponent
        className={cn(className)}
        initial="hidden"
        animate={isMounted ? "visible" : "hidden"}
        transition={{
          staggerChildren: speedSegment,
          delayChildren: delay,
        }}
      >
        {lines.map((line, lineIndex) => (
          <motion.span
            key={lineIndex}
            variants={{
              hidden: selectedVariants.hidden,
              visible: {
                ...selectedVariants.visible,
                transition: {
                  type: "spring",
                  bounce: 0.3,
                  duration: 1.5,
                },
              },
            }}
            style={{ display: "block" }}
          >
            {line}
          </motion.span>
        ))}
      </MotionComponent>
    )
  }

  if (per === "word") {
    const words = children.split(" ")
    
    return (
      <MotionComponent
        className={cn(className)}
        initial="hidden"
        animate={isMounted ? "visible" : "hidden"}
        transition={{
          staggerChildren: speedSegment,
          delayChildren: delay,
        }}
      >
        {words.map((word, wordIndex) => (
          <motion.span
            key={wordIndex}
            variants={{
              hidden: selectedVariants.hidden,
              visible: {
                ...selectedVariants.visible,
                transition: {
                  type: "spring",
                  bounce: 0.3,
                  duration: 1.5,
                },
              },
            }}
            style={{ display: "inline-block", marginRight: "0.25rem" }}
          >
            {word}
          </motion.span>
        ))}
      </MotionComponent>
    )
  }

  if (per === "char") {
    const chars = children.split("")
    
    return (
      <MotionComponent
        className={cn(className)}
        initial="hidden"
        animate={isMounted ? "visible" : "hidden"}
        transition={{
          staggerChildren: speedSegment,
          delayChildren: delay,
        }}
      >
        {chars.map((char, charIndex) => (
          <motion.span
            key={charIndex}
            variants={{
              hidden: selectedVariants.hidden,
              visible: {
                ...selectedVariants.visible,
                transition: {
                  type: "spring",
                  bounce: 0.3,
                  duration: 1.5,
                },
              },
            }}
            style={{ display: "inline-block" }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </MotionComponent>
    )
  }

  return (
    <MotionComponent
      className={cn(className)}
      initial="hidden"
      animate={isMounted ? "visible" : "hidden"}
      variants={{
        hidden: selectedVariants.hidden,
        visible: {
          ...selectedVariants.visible,
          transition: {
            type: "spring",
            bounce: 0.3,
            duration: 1.5,
            delay,
          },
        },
      }}
    >
      {children}
    </MotionComponent>
  )
}
