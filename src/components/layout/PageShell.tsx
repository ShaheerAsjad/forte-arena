import React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export function PageShell({
  title,
  description,
  action,
  children,
  className,
  containerClassName,
}: PageShellProps) {
  return (
    <div className={cn("min-h-[calc(100vh-140px)] py-8 px-4 sm:px-6", className)}>
      <div className={cn("max-w-6xl mx-auto space-y-8", containerClassName)}>
        {(title || description || action) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-navy-100/60">
            <div className="space-y-1">
              {title && (
                <h1 className="font-heading text-3xl font-extrabold text-navy-950 tracking-tight">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-base text-mist max-w-2xl">
                  {description}
                </p>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
}
