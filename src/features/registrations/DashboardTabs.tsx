"use client";

import { useState } from "react";
import type { RegistrationStatus } from "@/lib/db-types";
import type { RegistrationCard } from "@/features/registrations/repositories/registrations.repository";
import { RegistrationCard as RegCard } from "@/features/registrations/RegistrationCard";
import { Trophy } from "lucide-react";

type TabId = "all" | RegistrationStatus;

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "all", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "WITHDRAWN", label: "Withdrawn" },
];

interface DashboardTabsProps {
  registrations: RegistrationCard[];
}

export function DashboardTabs({ registrations }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("all");

  const counts: Record<TabId, number> = {
    all: registrations.length,
    PENDING: registrations.filter((r) => r.status === "PENDING").length,
    APPROVED: registrations.filter((r) => r.status === "APPROVED").length,
    REJECTED: registrations.filter((r) => r.status === "REJECTED").length,
    WITHDRAWN: registrations.filter((r) => r.status === "WITHDRAWN").length,
  };

  const filtered =
    activeTab === "all"
      ? registrations
      : registrations.filter((r) => r.status === activeTab);

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-navy-100/60 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-white text-navy-950 shadow-sm"
                : "text-mist hover:text-navy-950"
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id
                  ? "bg-navy-900 text-ivory"
                  : "bg-navy-200 text-navy-700"
              }`}
            >
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-navy-100 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-mist" />
          </div>
          <p className="text-mist font-medium text-sm">
            {activeTab === "all"
              ? "No registrations yet. Explore events to get started!"
              : `No ${activeTab.toLowerCase()} registrations.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <RegCard key={r.id} registration={r} />
          ))}
        </div>
      )}
    </div>
  );
}
