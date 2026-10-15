"use client";

import { motion, useScroll, useSpring, useReducedMotion } from "motion/react";

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const shouldReduceMotion = useReducedMotion();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 280,
    damping: 30,
    restDelta: 0.001,
  });

  if (shouldReduceMotion) {
    return null;
  }

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-gold-600 via-gold-400 to-amber-300 z-50 origin-left shadow-xs shadow-gold-500/30 pointer-events-none"
      aria-hidden="true"
    />
  );
}
