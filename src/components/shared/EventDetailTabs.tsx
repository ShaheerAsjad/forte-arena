"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { BookOpen, ShieldAlert, Award } from "lucide-react";

interface EventDetailTabsProps {
  description: string;
  rules: string;
  eligibility: string;
  prizes: string;
}

export function EventDetailTabs({
  description,
  rules,
  eligibility,
  prizes,
}: EventDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "rules", label: "Rules & Guidelines" },
    { id: "eligibility", label: "Eligibility & Prizes" },
  ];

  return (
    <div className="space-y-6">
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" && (
        <Card className="p-6 sm:p-8 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-navy-900 border-b border-navy-100 pb-3">
            <BookOpen className="w-5 h-5 text-gold-500" />
            <h3 className="font-heading text-lg font-bold">About the Competition</h3>
          </div>
          <div className="prose prose-navy max-w-none text-ink/80 text-sm sm:text-base leading-relaxed whitespace-pre-line">
            {description}
          </div>
        </Card>
      )}

      {activeTab === "rules" && (
        <Card className="p-6 sm:p-8 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-navy-900 border-b border-navy-100 pb-3">
            <ShieldAlert className="w-5 h-5 text-gold-500" />
            <h3 className="font-heading text-lg font-bold">Rules & Evaluation Criteria</h3>
          </div>
          <div className="prose prose-navy max-w-none text-ink/80 text-sm sm:text-base leading-relaxed whitespace-pre-line">
            {rules}
          </div>
        </Card>
      )}

      {activeTab === "eligibility" && (
        <Card className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-navy-900 border-b border-navy-100 pb-3">
              <Award className="w-5 h-5 text-gold-500" />
              <h3 className="font-heading text-lg font-bold">Prizes & Recognition</h3>
            </div>
            <div className="prose prose-navy max-w-none text-ink/80 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {prizes}
            </div>
          </div>

          <div className="pt-4 border-t border-navy-100 space-y-3">
            <h4 className="font-heading text-base font-bold text-navy-900">
              Eligibility Requirements
            </h4>
            <div className="prose prose-navy max-w-none text-ink/80 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {eligibility}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
