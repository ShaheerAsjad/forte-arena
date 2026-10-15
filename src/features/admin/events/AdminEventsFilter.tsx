"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Select } from "@/components/ui/Select";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "CLOSED", label: "Closed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function AdminEventsFilter({
  currentSearch,
  currentStatus,
}: {
  currentSearch?: string;
  currentStatus?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilters = (newSearch?: string, newStatus?: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newSearch !== undefined) {
      if (newSearch.trim()) {
        params.set("search", newSearch.trim());
      } else {
        params.delete("search");
      }
    }

    if (newStatus !== undefined) {
      if (newStatus && newStatus !== "ALL") {
        params.set("status", newStatus);
      } else {
        params.delete("status");
      }
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-navy-100 shadow-xs">
      {/* Search Input */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
        <input
          type="text"
          defaultValue={currentSearch || ""}
          onChange={(e) => updateFilters(e.target.value, undefined)}
          placeholder="Search by title or venue..."
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-navy-200 focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
        />
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 w-full sm:w-52">
        <div className="flex-1">
          <Select
            value={currentStatus || "ALL"}
            onChange={(val) => updateFilters(undefined, val)}
            options={STATUS_OPTIONS}
            size="sm"
          />
        </div>
        {isPending && (
          <span className="text-[11px] text-mist animate-pulse shrink-0">
            Filtering...
          </span>
        )}
      </div>
    </div>
  );
}
