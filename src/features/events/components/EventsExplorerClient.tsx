"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EventCard, CATEGORY_META } from "@/components/shared/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  Inbox,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import {
  type EventsFilterState,
  DEFAULT_EVENTS_FILTER_STATE,
  getAvailableCategories,
  parseEventsFilterParams,
  serializeEventsFilterParams,
  filterAndSortEvents,
} from "../events.filter";
import type { EventWithDerivedStatus } from "../events.derived";
import type { EventCategory } from "@/lib/db-types";

interface EventsExplorerClientProps {
  events: EventWithDerivedStatus[];
  initialParams?: {
    q?: string;
    category?: string;
    status?: string;
    type?: string;
    sort?: string;
  };
}

const STATUS_SELECT_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "OPEN", label: "Open for Registration" },
  { value: "CLOSED", label: "Registration Closed" },
  { value: "COMPLETED", label: "Completed" },
];

const PARTICIPATION_SELECT_OPTIONS = [
  { value: "ALL", label: "All Types (Solo & Team)" },
  { value: "INDIVIDUAL", label: "Solo Only" },
  { value: "TEAM", label: "Team Only" },
];

const SORT_SELECT_OPTIONS = [
  { value: "soonest", label: "Upcoming First" },
  { value: "latest", label: "Latest First" },
  { value: "az", label: "A-Z (Title)" },
];

export function EventsExplorerClient({
  events,
  initialParams,
}: EventsExplorerClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Categories actually present in the public events dataset
  const availableCategories = useMemo(
    () => getAvailableCategories(events),
    [events]
  );

  // Initialize filter state from initialParams or URL query string
  const [filters, setFilters] = useState<EventsFilterState>(() => {
    const raw = initialParams || {
      q: searchParams?.get("q"),
      category: searchParams?.get("category"),
      status: searchParams?.get("status"),
      type: searchParams?.get("type"),
      sort: searchParams?.get("sort"),
    };
    return parseEventsFilterParams(raw);
  });

  // Local immediate search input state for instantaneous typing response
  const [searchInput, setSearchInput] = useState<string>(filters.q);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mobile filters panel disclosure state
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Sync URL in an effect without router.replace (pure replaceState, zero server round-trips)
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    const queryString = serializeEventsFilterParams(filters);
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", newUrl);
    }
  }, [filters, pathname]);

  // Debounced search query updater (250ms)
  const handleSearchChange = (val: string) => {
    setSearchInput(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, q: val.trim() }));
    }, 250);
  };

  // Immediate clear search input
  const handleClearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchInput("");
    setFilters((prev) => ({ ...prev, q: "" }));
    searchInputRef.current?.focus();
  };

  // Handle single filter change
  const handleFilterChange = <K extends keyof EventsFilterState>(
    key: K,
    value: EventsFilterState[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Clear all filters back to default
  const handleClearAll = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchInput("");
    setFilters({ ...DEFAULT_EVENTS_FILTER_STATE });
  };

  // Filtered and sorted events
  const filteredEvents = useMemo(
    () => filterAndSortEvents(events, filters),
    [events, filters]
  );

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Compute active filters list for display tags
  const activeFilters = useMemo(() => {
    const list: Array<{
      key: keyof EventsFilterState;
      label: string;
    }> = [];

    if (filters.q.trim()) {
      list.push({
        key: "q",
        label: `Search: "${filters.q.trim()}"`,
      });
    }

    if (filters.category && filters.category.toUpperCase() !== "ALL") {
      const meta = CATEGORY_META[filters.category.toUpperCase() as EventCategory];
      list.push({
        key: "category",
        label: `Category: ${meta?.label || filters.category}`,
      });
    }

    if (filters.status && filters.status.toUpperCase() !== "ALL") {
      const opt = STATUS_SELECT_OPTIONS.find(
        (o) => o.value === filters.status.toUpperCase()
      );
      list.push({
        key: "status",
        label: `Status: ${opt?.label || filters.status}`,
      });
    }

    if (filters.type && filters.type.toUpperCase() !== "ALL") {
      const opt = PARTICIPATION_SELECT_OPTIONS.find(
        (o) => o.value === filters.type.toUpperCase()
      );
      list.push({
        key: "type",
        label: `Type: ${opt?.label || filters.type}`,
      });
    }

    if (filters.sort && filters.sort !== "soonest") {
      const opt = SORT_SELECT_OPTIONS.find((o) => o.value === filters.sort);
      list.push({
        key: "sort",
        label: `Sort: ${opt?.label || filters.sort}`,
      });
    }

    return list;
  }, [filters]);

  const handleRemoveFilter = (key: keyof EventsFilterState) => {
    if (key === "q") {
      handleClearSearch();
    } else if (key === "sort") {
      handleFilterChange("sort", "soonest");
    } else {
      handleFilterChange(key, "ALL");
    }
  };

  // Active secondary filters count for mobile toggle badge
  const activeSecondaryCount = useMemo(() => {
    let count = 0;
    if (filters.status && filters.status.toUpperCase() !== "ALL") count++;
    if (filters.type && filters.type.toUpperCase() !== "ALL") count++;
    return count;
  }, [filters.status, filters.type]);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Main Filter Console Card */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-navy-100 shadow-sm p-4 sm:p-6 space-y-4">
        {/* Top Search Input Row */}
        <div className="relative w-full">
          <label htmlFor="events-search-input" className="sr-only">
            Search events by title, summary, or venue
          </label>
          <Input
            id="events-search-input"
            ref={searchInputRef}
            placeholder="Search events by title, summary, or venue..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-11 pr-11 py-3 text-sm sm:text-base rounded-xl sm:rounded-2xl border-navy-200/80 focus:border-gold-500 focus:ring-gold-400/30"
          />
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-mist pointer-events-none"
            aria-hidden="true"
          />

          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search text"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-mist hover:text-navy-950 hover:bg-navy-100/70 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills (Dynamic from available categories) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-mist uppercase tracking-wider px-0.5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold-500" />
              Event Categories
            </span>
            <span className="text-[11px] text-mist/80 lowercase font-medium">
              {availableCategories.length} available
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Filter events by category"
            className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none touch-pan-x"
          >
            {/* "All" Category Chip */}
            <button
              type="button"
              role="radio"
              aria-checked={filters.category.toUpperCase() === "ALL"}
              onClick={() => handleFilterChange("category", "ALL")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 cursor-pointer min-h-[40px] border select-none ${
                filters.category.toUpperCase() === "ALL"
                  ? "bg-navy-950 text-ivory border-navy-950 shadow-xs"
                  : "bg-navy-50/70 text-navy-800 hover:bg-navy-100 hover:text-navy-950 border-navy-100"
              }`}
            >
              <span>All Categories</span>
            </button>

            {/* Individual Category Chips */}
            {availableCategories.map((cat) => {
              const meta = CATEGORY_META[cat] || CATEGORY_META.OTHER;
              const Icon = meta.icon;
              const isSelected =
                filters.category.toUpperCase() === cat.toUpperCase();

              return (
                <button
                  key={cat}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleFilterChange("category", cat)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 cursor-pointer min-h-[40px] border select-none ${
                    isSelected
                      ? "bg-navy-950 text-ivory border-navy-950 shadow-xs"
                      : "bg-navy-50/70 text-navy-800 hover:bg-navy-100 hover:text-navy-950 border-navy-100"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? "text-gold-400" : "text-mist"
                    }`}
                  />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Desktop Secondary Filters (Status, Type, Sort) */}
        {/* ------------------------------------------------------------- */}
        <div className="hidden md:grid md:grid-cols-3 gap-3 pt-2 border-t border-navy-100/70">
          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-wider mb-1">
              Derived Status
            </label>
            <Select
              options={STATUS_SELECT_OPTIONS}
              value={filters.status.toUpperCase()}
              onChange={(val) => handleFilterChange("status", val)}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-wider mb-1">
              Participation
            </label>
            <Select
              options={PARTICIPATION_SELECT_OPTIONS}
              value={filters.type.toUpperCase()}
              onChange={(val) => handleFilterChange("type", val)}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-wider mb-1">
              Sort By
            </label>
            <Select
              options={SORT_SELECT_OPTIONS}
              value={filters.sort}
              onChange={(val) =>
                handleFilterChange("sort", val as EventsFilterState["sort"])
              }
              className="w-full"
            />
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Mobile Filter Controls Bar (Sort + Collapsible Filter Toggle) */}
        {/* ------------------------------------------------------------- */}
        <div className="md:hidden flex items-center gap-2 pt-2 border-t border-navy-100/70">
          <div className="flex-1">
            <Select
              options={SORT_SELECT_OPTIONS}
              value={filters.sort}
              onChange={(val) =>
                handleFilterChange("sort", val as EventsFilterState["sort"])
              }
              className="w-full"
              triggerClassName="min-h-[40px] text-xs"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            aria-expanded={isMobileFiltersOpen}
            aria-controls="mobile-filters-panel"
            className="shrink-0 min-h-[40px] px-3.5 gap-1.5 text-xs font-bold border-navy-200 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-gold-600" />
            <span>Filters</span>
            {activeSecondaryCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-navy-950 text-ivory text-[10px] font-black flex items-center justify-center">
                {activeSecondaryCount}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-mist transition-transform duration-200 ${
                isMobileFiltersOpen ? "rotate-180" : ""
              }`}
            />
          </Button>
        </div>

        {/* Mobile Collapsible Panel */}
        {isMobileFiltersOpen && (
          <div
            id="mobile-filters-panel"
            className="md:hidden pt-3 border-t border-navy-100 space-y-3"
          >
            <div>
              <label className="block text-xs font-bold text-mist uppercase tracking-wider mb-1">
                Derived Status
              </label>
              <Select
                options={STATUS_SELECT_OPTIONS}
                value={filters.status.toUpperCase()}
                onChange={(val) => handleFilterChange("status", val)}
                className="w-full"
                triggerClassName="min-h-[40px] text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-mist uppercase tracking-wider mb-1">
                Participation Type
              </label>
              <Select
                options={PARTICIPATION_SELECT_OPTIONS}
                value={filters.type.toUpperCase()}
                onChange={(val) => handleFilterChange("type", val)}
                className="w-full"
                triggerClassName="min-h-[40px] text-xs"
              />
            </div>

            {activeSecondaryCount > 0 && (
              <div className="pt-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleFilterChange("status", "ALL");
                    handleFilterChange("type", "ALL");
                  }}
                  className="text-xs text-mist hover:text-danger min-h-[36px]"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset status & type
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Active Filters Row & Results Count Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        {/* Screen Reader Live Region */}
        <div aria-live="polite" className="sr-only">
          Showing {filteredEvents.length}{" "}
          {filteredEvents.length === 1 ? "competition" : "competitions"}
        </div>

        {/* Human Visible Count */}
        <div className="text-xs sm:text-sm text-mist font-medium">
          Showing{" "}
          <span className="font-extrabold text-navy-950">
            {filteredEvents.length}
          </span>{" "}
          {filteredEvents.length === 1 ? "competition" : "competitions"}
          {events.length > 0 && filteredEvents.length !== events.length && (
            <span> (filtered from {events.length})</span>
          )}
        </div>

        {/* Active Filter Tags */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mist mr-0.5">
              Active:
            </span>
            {activeFilters.map((af) => (
              <span
                key={af.key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-navy-100/70 text-navy-900 border border-navy-200/80 shadow-2xs"
              >
                <span>{af.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFilter(af.key)}
                  aria-label={`Remove filter ${af.label}`}
                  className="text-mist hover:text-danger rounded-full p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-bold text-gold-700 hover:text-gold-900 underline underline-offset-2 ml-1 cursor-pointer transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Events Grid or Empty State */}
      {/* ------------------------------------------------------------- */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-10 h-10 text-mist" />}
          title="No Competitions Found"
          description="We couldn't find any events matching your selected search criteria or filters."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="min-h-[40px] text-xs font-semibold cursor-pointer"
            >
              Clear all filters
            </Button>
          }
        />
      ) : (
        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {filteredEvents.map((event) => (
            <StaggerItem key={event.item.id}>
              <EventCard event={event} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
