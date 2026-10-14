"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Compass, Users, UserCheck, Trophy } from "lucide-react";

const STEPS = [
  {
    step: "01",
    title: "Discover",
    desc: "Explore events across categories, check team sizes, rules, and schedules.",
    icon: Compass,
  },
  {
    step: "02",
    title: "Register",
    desc: "Sign up individually or form your team roster with student roll numbers.",
    icon: Users,
  },
  {
    step: "03",
    title: "Get Approved",
    desc: "Track real-time organizer reviews and live contingent verification.",
    icon: UserCheck,
  },
  {
    step: "04",
    title: "Compete & Win",
    desc: "Take the arena floor, score podium positions, and download certificates.",
    icon: Trophy,
  },
];

export function HowItWorksSteps() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "0px 0px -80px 0px" });
  const shouldReduceMotion = useReducedMotion();

  return (
    <div ref={containerRef} className="relative">
      {/* Desktop Horizontal Connecting Line */}
      <div className="hidden lg:block absolute top-[44px] left-[12%] right-[12%] h-[3px] -z-0 pointer-events-none">
        {/* Background track */}
        <div className="w-full h-full bg-navy-800/80 rounded-full" />
        {/* Animated Drawing Line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView && !shouldReduceMotion ? { scaleX: 1 } : shouldReduceMotion ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500 rounded-full origin-left shadow-[0_0_12px_rgba(245,185,1,0.5)]"
        />
      </div>

      {/* Grid of Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {STEPS.map((s, index) => {
          const Icon = s.icon;
          const delay = index * 0.25;

          return (
            <motion.div
              key={s.step}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: shouldReduceMotion ? 0 : delay,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group relative p-6 rounded-3xl bg-navy-900/80 border border-navy-800/90 backdrop-blur-md space-y-4 hover:border-gold-400/60 hover:-translate-y-1.5 transition-all duration-300 shadow-xl hover:shadow-[0_16px_36px_-10px_rgba(245,185,1,0.15)]"
            >
              {/* Top Row: Icon + Step Number */}
              <div className="flex items-center justify-between">
                <motion.div
                  animate={
                    isInView && !shouldReduceMotion
                      ? {
                          scale: [1, 1.15, 1],
                          boxShadow: [
                            "0 0 0 rgba(245,185,1,0)",
                            "0 0 20px rgba(245,185,1,0.4)",
                            "0 0 0 rgba(245,185,1,0)",
                          ],
                        }
                      : {}
                  }
                  transition={{ delay: delay + 0.3, duration: 0.8 }}
                  className="w-12 h-12 rounded-2xl bg-gold-400/15 border border-gold-400/30 text-gold-400 flex items-center justify-center font-heading font-black group-hover:scale-110 group-hover:bg-gold-500 group-hover:text-navy-950 transition-all duration-300"
                >
                  <Icon className="w-6 h-6" />
                </motion.div>

                <span className="font-heading text-3xl font-black text-ivory/25 group-hover:text-gold-400/40 transition-colors">
                  {s.step}
                </span>
              </div>

              {/* Step Title & Description */}
              <div className="space-y-1.5">
                <h3 className="font-heading text-lg font-bold text-ivory group-hover:text-gold-300 transition-colors">
                  {s.title}
                </h3>
                <p className="text-xs sm:text-sm text-ivory/70 leading-relaxed">
                  {s.desc}
                </p>
              </div>

              {/* Progress Indicator Node */}
              <div className="pt-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gold-400/60 group-hover:bg-gold-400 transition-colors" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-400/80 font-heading">
                  Stage {s.step}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
