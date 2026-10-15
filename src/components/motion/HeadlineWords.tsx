"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

interface HeadlineWordsProps {
  text: string;
  highlightText?: string;
  className?: string;
  highlightClassName?: string;
}

export function HeadlineWords({
  text,
  highlightText,
  className = "",
  highlightClassName = "text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-amber-300 to-gold-500 drop-shadow-xs",
}: HeadlineWordsProps) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(" ");

  if (shouldReduceMotion) {
    return (
      <h1 className={className}>
        {words.join(" ")}{" "}
        {highlightText && (
          <span className={highlightClassName}>
            {highlightText}
          </span>
        )}
      </h1>
    );
  }

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const child: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.h1
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          variants={child}
          className="inline-block mr-2.5 sm:mr-3.5"
        >
          {word}
        </motion.span>
      ))}
      {highlightText && (
        <motion.span
          variants={child}
          className={`inline-block ${highlightClassName}`}
        >
          {highlightText}
        </motion.span>
      )}
    </motion.h1>
  );
}
