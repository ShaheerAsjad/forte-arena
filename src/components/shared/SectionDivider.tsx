import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface SectionDividerProps {
  className?: string;
  withIcon?: boolean;
}

export function SectionDivider({
  className,
  withIcon = true,
}: SectionDividerProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center py-8 select-none pointer-events-none max-w-4xl mx-auto px-4",
        className
      )}
      aria-hidden="true"
    >
      <div className="w-full h-px bg-gradient-to-r from-transparent via-navy-200/60 to-transparent" />
      {withIcon && (
        <div className="absolute px-3 bg-ivory text-gold-500">
          <Sparkles className="w-4 h-4 opacity-75" />
        </div>
      )}
    </div>
  );
}
