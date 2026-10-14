"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

const LETTERS = "FORTÉ ARENA".split("");

const emptySubscribe = () => () => {};

export function IntroSplash() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [visible, setVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleDismiss = useCallback(() => {
    setVisible(false);
    try {
      sessionStorage.setItem("forte_splash_seen", "1");
    } catch {
      // Ignore in private browsing / restricted contexts
    }
  }, []);

  useEffect(() => {
    // Check if reduced motion or already seen in this session
    if (shouldReduceMotion) return;

    let frameId: number;
    let timer: NodeJS.Timeout;

    try {
      const seen = sessionStorage.getItem("forte_splash_seen");
      if (!seen) {
        frameId = requestAnimationFrame(() => {
          setVisible(true);
        });
        timer = setTimeout(() => {
          handleDismiss();
        }, 2500);
        return () => {
          if (frameId) cancelAnimationFrame(frameId);
          if (timer) clearTimeout(timer);
        };
      }
    } catch {
      // Fallback
    }
  }, [shouldReduceMotion, handleDismiss]);

  // Lock body scroll while splash is visible so no page content can peek or scroll below
  useEffect(() => {
    if (visible) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [visible]);

  if (!isClient || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro-splash"
          initial={{ opacity: 1, y: 0 }}
          exit={{
            y: "-100%",
            opacity: 0,
            transition: { duration: 0.65, ease: [0.65, 0, 0.35, 1] },
          }}
          className="fixed inset-0 top-0 left-0 w-screen h-screen min-h-[100dvh] z-[99999] bg-[#000F40] flex flex-col items-center justify-center text-ivory select-none overflow-hidden m-0 p-0"
          role="dialog"
          aria-label="Welcome to Forté Arena"
        >
          {/* Subtle Ambient Mesh Backing */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,185,1,0.18),transparent_70%)] pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-navy-950 to-transparent pointer-events-none" />

          {/* Visible Skip Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-6 right-6 z-20 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-ivory/80 hover:text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer"
          >
            Skip ✕
          </button>

          {/* Centerpiece Container */}
          <div className="relative flex flex-col items-center justify-center">
            {/* SVG Self-Drawing Circle Outline */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
              <svg
                className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                viewBox="0 0 200 200"
              >
                <defs>
                  <linearGradient id="splash-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F5B901" />
                    <stop offset="50%" stopColor="#FFF3CC" />
                    <stop offset="100%" stopColor="#D6A200" />
                  </linearGradient>
                </defs>

                {/* Background faint guide */}
                <circle
                  cx="100"
                  cy="100"
                  r="86"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  strokeOpacity="0.1"
                  fill="none"
                />

                {/* Self-drawing accent ring */}
                <motion.circle
                  cx="100"
                  cy="100"
                  r="86"
                  stroke="url(#splash-gold-grad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>

              {/* Real Forté Logo Scaling In */}
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.3,
                  duration: 0.7,
                  type: "spring",
                  stiffness: 220,
                  damping: 18,
                }}
                className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center"
              >
                <Image
                  src="/brand/forte-logo.png"
                  alt="Forté Arena"
                  width={140}
                  height={140}
                  className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(245,185,1,0.25)]"
                  priority
                />
              </motion.div>
            </div>

            {/* Wordmark Staggered Letter Reveal */}
            <motion.div
              className="flex items-center gap-1 sm:gap-1.5 mt-5 font-heading text-xl sm:text-2xl font-extrabold tracking-[0.25em] text-ivory"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    delayChildren: 0.7,
                    staggerChildren: 0.045,
                  },
                },
              }}
            >
              {LETTERS.map((char, i) => (
                <motion.span
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.35, ease: "easeOut" },
                    },
                  }}
                  className={char === " " ? "w-2 sm:w-3" : "text-transparent bg-clip-text bg-gradient-to-b from-white via-ivory to-gold-400"}
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>

            {/* Sub-label */}
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 0.4 }}
              className="mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-gold-400/80 font-heading"
            >
              Collegiate Championship Arena
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
