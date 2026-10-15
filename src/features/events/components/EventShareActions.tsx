"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface EventShareActionsProps {
  event: {
    id?: string;
    slug: string;
    title: string;
    summary?: string | null;
    venue: string;
    startsAt: Date | string;
    endsAt?: Date | string | null;
  };
  variant?: "pill" | "buttons" | "compact";
  className?: string;
}

function formatIcsDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function EventShareActions({
  event,
  variant = "buttons",
  className = "",
}: EventShareActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleDownloadIcs = () => {
    try {
      const startDate = new Date(event.startsAt);
      const endDate = event.endsAt
        ? new Date(event.endsAt)
        : new Date(startDate.getTime() + 3 * 3600 * 1000); // default 3h

      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Forte Arena//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${event.id || event.slug}@forte-arena.edu`,
        `DTSTAMP:${formatIcsDate(new Date())}`,
        `DTSTART:${formatIcsDate(startDate)}`,
        `DTEND:${formatIcsDate(endDate)}`,
        `SUMMARY:${escapeIcsText(event.title)}`,
        `DESCRIPTION:${escapeIcsText(event.summary || "Forte Arena Competition")}`,
        `LOCATION:${escapeIcsText(event.venue)}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${event.slug}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Event added to calendar download (.ics)");
    } catch {
      toast.error("Failed to generate calendar file");
    }
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: event.title,
      text: event.summary || `Check out ${event.title} on Forte Arena`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          return;
        }
      }
    }

    // Fallback: clipboard copy
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Event link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={handleDownloadIcs}
          title="Add to Calendar (.ics)"
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-ivory/80 hover:text-gold-400 transition-colors border border-white/10"
        >
          <CalendarPlus className="w-4 h-4" />
        </button>
        <button
          onClick={handleShare}
          title="Share Event"
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-ivory/80 hover:text-gold-400 transition-colors border border-white/10"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDownloadIcs}
        className="gap-2 border-navy-200 text-navy-900 hover:bg-navy-50"
      >
        <CalendarPlus className="w-4 h-4 text-gold-500" />
        <span>Add to Calendar</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleShare}
        className="gap-2 border-navy-200 text-navy-900 hover:bg-navy-50"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Link Copied!</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4 text-gold-500" />
            <span>Share Event</span>
          </>
        )}
      </Button>
    </div>
  );
}
