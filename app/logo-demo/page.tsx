"use client";

import { Logo } from "@/components/ui/logo";
import { ChalkLogo } from "@/components/ui/logo-chalk";
import { LampContainer } from "@/components/ui/lamp";
import { motion } from "framer-motion";

export default function LogoDemoPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Regular Logo Demo */}
      <section className="py-12 flex flex-col items-center justify-center border-b">
        <h2 className="text-2xl font-semibold mb-8">Regular Logo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col items-center p-8 rounded-lg bg-white border">
            <h3 className="text-sm font-medium mb-4 text-muted-foreground">Light Background</h3>
            <Logo animate className="h-12 w-auto" />
          </div>
          <div className="flex flex-col items-center p-8 rounded-lg bg-slate-900 border">
            <h3 className="text-sm font-medium mb-4 text-slate-300">Dark Background</h3>
            <Logo animate dark className="h-12 w-auto" />
          </div>
        </div>
      </section>

      {/* Chalk Logo Demo */}
      <section className="py-12 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-semibold mb-8">Chalk Logo</h2>
        <div className="w-full max-w-3xl aspect-video bg-slate-900 rounded-lg flex items-center justify-center">
          <div className="relative flex flex-col items-center">
            <ChalkLogo animate className="h-24 w-auto" />
            <p className="text-white text-sm mt-6 opacity-70">Handwritten chalk style logo</p>
          </div>
        </div>
      </section>

      {/* Lamp + Chalk Logo Demo */}
      <section className="py-12 flex-1 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-semibold mb-8">Lamp + Chalk Logo</h2>
        <div className="w-full max-w-5xl aspect-video rounded-lg overflow-hidden">
          <LampContainer>
            <motion.div
              initial={{ opacity: 0.5, y: 100 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.3,
                duration: 0.8,
                ease: "easeInOut",
              }}
              className="flex flex-col items-center"
            >
              <ChalkLogo animate className="h-20 w-auto mb-8" />
              <p className="mt-4 bg-gradient-to-br from-slate-300 to-slate-500 py-2 bg-clip-text text-center text-xl font-medium tracking-tight text-transparent md:text-2xl">
                Engineering metrics for teams
              </p>
            </motion.div>
          </LampContainer>
        </div>
      </section>
    </div>
  );
} 