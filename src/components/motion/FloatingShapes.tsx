"use client";

import { motion, useReducedMotion } from "motion/react";

export function FloatingShapes({ className }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${
        className || ""
      }`}
    >
      {/* Drifting Gold Sphere */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -35, 15, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-10 left-[15%] w-72 h-72 rounded-full bg-gold-400/15 blur-3xl"
      />

      {/* Drifting Navy Glow */}
      <motion.div
        animate={{
          x: [0, -35, 25, 0],
          y: [0, 25, -25, 0],
          scale: [1, 0.9, 1.05, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-36 right-[10%] w-96 h-96 rounded-full bg-navy-700/20 blur-3xl"
      />

      {/* Drifting Gold Accent Ring */}
      <motion.div
        animate={{
          rotate: [0, 180, 360],
          y: [0, -15, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute bottom-20 left-[25%] w-48 h-48 rounded-full border border-gold-500/20"
      />
    </div>
  );
}
