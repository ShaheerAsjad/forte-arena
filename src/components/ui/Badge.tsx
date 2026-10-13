import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "navy"
    | "gold"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center font-medium rounded-full transition-colors select-none";

  const variants = {
    default: "bg-navy-100 text-navy-900",
    navy: "bg-navy-900 text-ivory",
    gold: "bg-gold-100 text-warning font-semibold border border-gold-300/40",
    success: "bg-success-bg text-success font-medium",
    warning: "bg-warning-bg text-warning font-medium",
    danger: "bg-danger-bg text-danger font-medium",
    info: "bg-info-bg text-info font-medium",
    outline: "border border-navy-200/60 text-navy-900 bg-transparent",
  };

  const sizes = {
    sm: "px-2.5 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-xs font-semibold gap-1.5",
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  );
}
