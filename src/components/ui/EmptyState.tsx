import React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-10 text-center rounded-3xl border border-dashed border-navy-200/80 bg-white/40 backdrop-blur-xs space-y-4 max-w-md mx-auto my-6",
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-navy-100/70 text-navy-800 flex items-center justify-center text-2xl shadow-inner shadow-navy-900/5">
          {icon}
        </div>
      )}
      <div className="space-y-1.5">
        <h3 className="font-heading font-bold text-lg text-navy-950">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-mist max-w-sm">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
