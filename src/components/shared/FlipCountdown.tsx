"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface FlipCountdownProps {
  targetDate: string | Date;
  label?: string;
  className?: string;
  compact?: boolean;
}

const emptySubscribe = () => () => {};

interface TimeUnits {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export function FlipCountdown({
  targetDate,
  label,
  className,
  compact = false,
}: FlipCountdownProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const shouldReduceMotion = useReducedMotion();

  const [timeLeft, setTimeLeft] = useState<TimeUnits>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const calculate = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!isClient) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <FlipUnit value="--" label="DAYS" compact={compact} reduceMotion />
        <FlipSeparator />
        <FlipUnit value="--" label="HOURS" compact={compact} reduceMotion />
        <FlipSeparator />
        <FlipUnit value="--" label="MINS" compact={compact} reduceMotion />
        <FlipSeparator />
        <FlipUnit value="--" label="SECS" compact={compact} reduceMotion />
      </div>
    );
  }

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {label && (
        <span className="text-[11px] font-bold uppercase tracking-wider text-gold-400 mb-2">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <FlipUnit
          value={formatNumber(timeLeft.days)}
          label="DAYS"
          compact={compact}
          reduceMotion={shouldReduceMotion}
        />
        <FlipSeparator />
        <FlipUnit
          value={formatNumber(timeLeft.hours)}
          label="HOURS"
          compact={compact}
          reduceMotion={shouldReduceMotion}
        />
        <FlipSeparator />
        <FlipUnit
          value={formatNumber(timeLeft.minutes)}
          label="MINS"
          compact={compact}
          reduceMotion={shouldReduceMotion}
        />
        <FlipSeparator />
        <FlipUnit
          value={formatNumber(timeLeft.seconds)}
          label="SECS"
          compact={compact}
          reduceMotion={shouldReduceMotion}
        />
      </div>
    </div>
  );
}

function FlipUnit({
  value,
  label,
  compact,
  reduceMotion,
}: {
  value: string;
  label: string;
  compact: boolean;
  reduceMotion: boolean | null;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "relative rounded-xl bg-navy-950 border border-gold-500/30 shadow-md shadow-navy-950/60 overflow-hidden flex items-center justify-center",
          compact
            ? "w-11 h-12 sm:w-12 sm:h-13"
            : "w-13 h-14 sm:w-16 sm:h-18"
        )}
      >
        {/* Subtle horizontal seam line across middle */}
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 z-20 pointer-events-none" />

        {/* Top half subtle glass highlight */}
        <div className="absolute top-0 inset-x-0 h-1/2 bg-white/[0.06] pointer-events-none" />

        {/* Animated digit */}
        <div className="relative h-full w-full flex items-center justify-center">
          {reduceMotion ? (
            <span
              className={cn(
                "font-mono font-black text-gold-400 tabular-nums select-none",
                compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl"
              )}
            >
              {value}
            </span>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={value}
                initial={{ y: -8, opacity: 0.2, rotateX: -30 }}
                animate={{ y: 0, opacity: 1, rotateX: 0 }}
                exit={{ y: 8, opacity: 0.2, rotateX: 30 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className={cn(
                  "font-mono font-black text-gold-400 tabular-nums select-none inline-block",
                  compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl"
                )}
              >
                {value}
              </motion.span>
            </AnimatePresence>
          )}
        </div>
      </div>

      <span
        className={cn(
          "font-bold uppercase tracking-wider text-ivory/60 mt-1.5 select-none",
          compact ? "text-[9px]" : "text-[10px] sm:text-[11px]"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function FlipSeparator() {
  return (
    <div className="flex flex-col gap-1 -mt-4 text-gold-400/60 select-none">
      <span className="w-1 h-1 rounded-full bg-gold-400" />
      <span className="w-1 h-1 rounded-full bg-gold-400" />
    </div>
  );
}
