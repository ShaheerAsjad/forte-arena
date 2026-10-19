import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { QrCode, Camera } from "lucide-react";

export default function AdminScanLoading() {
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header & Event Selector Skeleton */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-navy-100 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Gate Scanner Console
                </span>
              </div>
              <Skeleton className="h-8 w-60 sm:w-72 rounded-xl" />
              <Skeleton className="h-4 w-72 sm:w-96 rounded-lg" />
            </div>

            {/* Event Picker Placeholder */}
            <div className="w-full md:w-80 space-y-1">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>

          <div className="pt-3 sm:pt-4 border-t border-navy-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
            <Skeleton className="h-6 w-44 rounded-xl" />
          </div>
        </div>

        {/* Viewfinder Card Skeleton */}
        <div className="max-w-2xl mx-auto space-y-4">
          <Card className="p-3 sm:p-5 bg-white border border-navy-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-gold-600" />
                <span className="font-bold text-navy-950 text-sm sm:text-base">
                  Live Viewfinder
                </span>
              </div>
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>

            {/* Camera Viewfinder Dark Box Skeleton */}
            <div className="relative w-full max-w-sm sm:max-w-md mx-auto min-h-[280px] sm:min-h-[320px] rounded-2xl bg-navy-950 border border-navy-800 shadow-md flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-navy-900 border border-navy-800 flex items-center justify-center text-gold-400">
                <Camera className="w-6 h-6 animate-pulse text-gold-400" />
              </div>
              <p className="text-xs font-semibold text-ivory">Preparing camera viewfinder...</p>
            </div>

            {/* Manual check-in shortcut placeholder */}
            <div className="pt-2 flex flex-col items-center gap-2">
              <Skeleton className="h-9 w-64 rounded-xl" />
              <Skeleton className="h-3 w-80 max-w-full rounded-md" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
