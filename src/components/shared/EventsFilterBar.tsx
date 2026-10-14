"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Search, X, Filter } from "lucide-react";
import { CATEGORY_META } from "@/components/shared/EventCard";
import type { EventCategory } from "@/generated/prisma";

const ALL_CATEGORIES: { id: string; label: string }[] = [
  { id: "ALL", label: "All Categories" },
  { id: "TECHNICAL", label: "Technical" },
  { id: "SPORTS", label: "Sports" },
  { id: "CULTURAL", label: "Cultural" },
  { id: "ACADEMIC", label: "Academic" },
  { id: "GAMING", label: "Gaming" },
  { id: "OTHER", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "PUBLISHED", label: "Open / Live" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CLOSED", label: "Closed" },
];

export function EventsFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentCategory = searchParams.get("category") || "ALL";
  const currentStatus = searchParams.get("status") || "";
  const currentSearch = searchParams.get("q") || "";

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to page 1 on filter change
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearAllFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = currentCategory !== "ALL" || currentStatus !== "" || currentSearch !== "";

  return (
    <div className="space-y-4 bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-navy-100 shadow-sm">
      {/* Search and Status Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full flex-1">
          <Input
            placeholder="Search events by title, summary, or venue..."
            defaultValue={currentSearch}
            onChange={(e) => updateParam("q", e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist pointer-events-none" />
        </div>

        <div className="w-full sm:w-56 shrink-0">
          <Select
            options={STATUS_OPTIONS}
            value={currentStatus}
            onChange={(e) => updateParam("status", e.target.value)}
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="shrink-0 text-mist hover:text-danger w-full sm:w-auto"
          >
            <X className="w-4 h-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Category Pills Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-mist uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          Categories:
        </span>
        {ALL_CATEGORIES.map((cat) => {
          const isSelected = currentCategory === cat.id;
          const meta = cat.id !== "ALL" ? CATEGORY_META[cat.id as EventCategory] : null;
          const Icon = meta?.icon;

          return (
            <button
              key={cat.id}
              onClick={() => updateParam("category", cat.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-navy-900 text-ivory shadow-xs"
                  : "bg-navy-50 text-ink/80 hover:bg-navy-100"
              }`}
            >
              {Icon && <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-gold-400" : "text-mist"}`} />}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
