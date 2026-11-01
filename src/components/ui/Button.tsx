"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "gold" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  isLoading?: boolean;
  withArrow?: boolean;
}

const arrowBadgeVariants = {
  primary: "bg-white/15 text-white group-hover:bg-white/25",
  secondary: "bg-navy-900/10 text-navy-900 group-hover:bg-navy-900/20",
  gold: "bg-navy-950/15 text-navy-950 group-hover:bg-navy-950/25",
  outline: "bg-navy-900/10 text-navy-900 group-hover:bg-navy-900/20",
  ghost: "bg-navy-900/10 text-navy-900 group-hover:bg-navy-900/20",
  danger: "bg-white/20 text-white group-hover:bg-white/30",
};

export function ArrowBadge({
  variant = "gold",
  className,
}: {
  variant?: "primary" | "secondary" | "gold" | "outline" | "ghost" | "danger";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0 transition-transform duration-200 group-hover:translate-x-0.5",
        arrowBadgeVariants[variant] || arrowBadgeVariants.gold,
        className
      )}
    >
      <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
    </span>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      isLoading = false,
      withArrow = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isCurrentlyLoading = loading || isLoading;
    const baseStyles =
      "relative overflow-hidden group inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 motion-reduce:transition-none motion-reduce:active:scale-100 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none shadow-sm cursor-pointer whitespace-nowrap";

    const variants = {
      primary:
        "bg-navy-900 text-ivory hover:bg-navy-800 shadow-navy-900/10 hover:shadow-md",
      secondary:
        "bg-navy-100 text-navy-900 hover:bg-navy-200/80",
      gold:
        "bg-gold-500 text-navy-950 font-semibold hover:bg-gold-400 shadow-gold-500/20 hover:shadow-md",
      outline:
        "border border-navy-200/60 bg-transparent text-navy-900 hover:bg-navy-50",
      ghost:
        "bg-transparent text-ink hover:bg-navy-100/60 shadow-none",
      danger:
        "bg-danger text-white hover:bg-danger/90 shadow-danger/20",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 gap-1.5 h-8",
      md: "text-sm px-4 py-2.5 gap-2 h-10",
      lg: "text-base px-6 py-3.5 gap-2.5 h-12 rounded-2xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isCurrentlyLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {/* Subtle shine sweep overlay */}
        <span
          className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out pointer-events-none"
          aria-hidden="true"
        />

        {isCurrentlyLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 shrink-0 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {children}
          {withArrow && (
            <span
              className={cn(
                "inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0 transition-transform duration-200 group-hover:translate-x-0.5",
                arrowBadgeVariants[variant]
              )}
            >
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </span>
          )}
        </span>
      </button>
    );
  }
);

Button.displayName = "Button";
