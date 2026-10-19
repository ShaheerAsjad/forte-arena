import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminAttendanceLoading() {
  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header & Event Selector Skeleton */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-navy-100 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-navy-700">
                  Attendance Console
                </span>
              </div>
              <Skeleton className="h-8 w-60 sm:w-72 rounded-xl" />
              <Skeleton className="h-4 w-72 sm:w-96 rounded-lg" />
            </div>

            {/* Select & Scan QR Button Skeletons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="w-full sm:w-80 space-y-1">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <Skeleton className="h-10 w-24 rounded-xl mt-auto shrink-0" />
            </div>
          </div>

          <div className="pt-3 border-t border-navy-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
            <Skeleton className="h-7 w-48 rounded-xl" />
          </div>
        </div>

        {/* 4 Summary Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              className="p-3.5 sm:p-5 bg-white border border-navy-100 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="w-4 h-4 rounded-md" />
              </div>
              <Skeleton className="h-8 w-16 rounded-xl" />
              <Skeleton className="h-3 w-32 rounded-md" />
            </Card>
          ))}
        </div>

        {/* Directory Card Skeleton */}
        <Card className="p-4 sm:p-6 bg-white border border-navy-100 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-navy-100">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-48 rounded-lg" />
              <Skeleton className="h-3.5 w-72 rounded-md" />
            </div>
            <Skeleton className="h-9 w-full md:w-72 rounded-xl" />
          </div>

          {/* Filter Chips Bar Skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>

          {/* Table Rows Skeleton */}
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((row) => (
              <div
                key={row}
                className="flex items-center justify-between p-3 rounded-xl bg-navy-50/40 border border-navy-100/50"
              >
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-xl" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
