"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

interface HeadlineWordsProps {
  text: string;
  highlightText?: string;
  className?: string;
}

export function HeadlineWords({
  text,
  highlightText,
  className = "",
}: HeadlineWordsProps) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(" ");

  if (shouldReduceMotion) {
    return (
      <h1 className={className}>
        {words.join(" ")}{" "}
        {highlightText && (
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-navy-900 via-navy-700 to-gold-500">
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
          className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-navy-900 via-navy-700 to-gold-500"
        >
          {highlightText}
        </motion.span>
      )}
    </motion.h1>
  );
}
