"use client";

import { useEffect, useState, useRef } from "react";
import { useReducedMotion, useInView } from "motion/react";

interface CountUpProps {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function CountUp({
  to,
  duration = 1.6,
  suffix = "",
  prefix = "",
  className,
}: CountUpProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion || !isInView) {
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      // Cubic ease out
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * to));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(to);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isInView, to, duration, shouldReduceMotion]);

  const displayCount = shouldReduceMotion ? to : count;

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayCount.toLocaleString()}
      {suffix}
    </span>
  );
}
