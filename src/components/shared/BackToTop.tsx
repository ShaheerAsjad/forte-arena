"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 400);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: shouldReduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.8, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 16 }}
          transition={{ duration: 0.2 }}
          aria-label="Scroll back to top"
          className={cn(
            "fixed bottom-6 right-6 z-40 p-3 rounded-full",
            "bg-navy-950/90 hover:bg-navy-900 text-gold-400 hover:text-gold-300",
            "border border-gold-400/30 hover:border-gold-400/60 shadow-xl shadow-navy-950/20 backdrop-blur-md",
            "active:scale-95 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-gold-400"
          )}
        >
          <ArrowUp className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
          <span className="sr-only">Back to top</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
