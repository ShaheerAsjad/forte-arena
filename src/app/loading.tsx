import { Skeleton } from "@/components/ui/Skeleton";
import { Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center p-8 space-y-6 select-none animate-in fade-in duration-300">
      {/* Brand Spinner */}
      <div className="relative flex items-center justify-center">
        {/* Pulsing Outer Ring */}
        <div className="w-16 h-16 rounded-full border-4 border-navy-100 border-t-gold-500 animate-spin" />
        {/* Core Jewel */}
        <div className="absolute w-8 h-8 rounded-full bg-navy-950 flex items-center justify-center text-gold-400 shadow-md shadow-navy-950/20">
          <Sparkles className="w-4 h-4 text-gold-400" />
        </div>
      </div>

      {/* Skeletons */}
      <div className="space-y-2.5 text-center w-full max-w-xs">
        <Skeleton className="h-4 w-40 mx-auto rounded-lg bg-navy-200/50" />
        <Skeleton className="h-3 w-28 mx-auto rounded-md bg-navy-100/60" />
      </div>
    </div>
  );
}
