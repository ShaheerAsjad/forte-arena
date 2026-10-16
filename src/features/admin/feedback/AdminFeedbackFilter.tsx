"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, type SelectOption } from "@/components/ui/Select";

interface AdminFeedbackFilterProps {
  events: Array<{ id: string; title: string }>;
  selectedEventId: string;
}

export function AdminFeedbackFilter({
  events,
  selectedEventId,
}: AdminFeedbackFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const options: SelectOption[] = [
    { label: "All Competitions", value: "ALL" },
    ...events.map((ev) => ({
      label: ev.title,
      value: ev.id,
    })),
  ];

  const handleSelect = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val && val !== "ALL") {
      params.set("eventId", val);
    } else {
      params.delete("eventId");
    }
    router.push(`/admin/feedback?${params.toString()}`);
  };

  return (
    <div className="w-full sm:w-72">
      <Select
        options={options}
        value={selectedEventId}
        onChange={handleSelect}
        placeholder="Filter by competition..."
        size="sm"
      />
    </div>
  );
}
