import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-6">
      <div className="w-12 h-12 rounded-full border-4 border-gold-400 border-t-navy-900 animate-spin" />
      <div className="space-y-2 text-center">
        <Skeleton className="h-4 w-48 mx-auto" />
        <Skeleton className="h-3 w-32 mx-auto" />
      </div>
    </div>
  );
}
