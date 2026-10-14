import React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  title?: string;
  badge?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export function PageShell({
  title,
  badge,
  description,
  action,
  children,
  className,
  containerClassName,
}: PageShellProps) {
  return (
    <div className={cn("relative min-h-[calc(100vh-140px)] py-8 px-4 sm:px-6 overflow-hidden", className)}>
      {/* Ambient Navy/Gold Mesh Backdrop */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(245,185,1,0.22),rgba(0,25,105,0.14),transparent_70%)] blur-3xl" />
        <div className="absolute top-[15%] right-[-10%] w-[500px] h-[350px] bg-[radial-gradient(circle_at_center,rgba(98,136,237,0.16),transparent_65%)] blur-3xl" />
        <div className="absolute top-[10%] left-[-10%] w-[500px] h-[350px] bg-[radial-gradient(circle_at_center,rgba(245,185,1,0.16),transparent_65%)] blur-3xl" />
      </div>

      {/* Faint Blueprint Grid Texture */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,15,64,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,15,64,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_20%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className={cn("max-w-6xl mx-auto space-y-8", containerClassName)}>
        {(title || description || action) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-navy-100/70">
            <div className="space-y-1.5">
              {badge && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-navy-100/80 border border-gold-400/40 text-navy-950 mb-1">
                  <span>{badge}</span>
                </div>
              )}
              {title && (
                <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-navy-950 tracking-tight">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-sm sm:text-base text-mist max-w-2xl leading-relaxed">
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
