import { Calendar, ExternalLink } from "lucide-react";
import {
  buildGoogleCalendarUrl,
  type CalendarEventInput,
} from "@/features/events/events.calendar";

interface AddToCalendarButtonProps {
  event: CalendarEventInput;
  eventUrl?: string;
  className?: string;
}

export function AddToCalendarButton({
  event,
  eventUrl,
  className = "",
}: AddToCalendarButtonProps) {
  const icsUrl = `/events/${event.slug}/calendar.ics`;
  const googleUrl = buildGoogleCalendarUrl(event, { eventUrl });

  return (
    <div
      className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full ${className}`}
    >
      <a
        href={icsUrl}
        download={`${event.slug}.ics`}
        className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold font-heading rounded-xl border border-navy-200 bg-white hover:bg-navy-50 text-navy-950 transition-all shadow-2xs hover:border-navy-300 flex-1 text-center"
      >
        <Calendar className="w-3.5 h-3.5 text-gold-600 shrink-0" />
        <span>Add to Calendar (.ics)</span>
      </a>

      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold font-heading rounded-xl border border-navy-200 bg-white hover:bg-navy-50 text-navy-950 transition-all shadow-2xs hover:border-navy-300 flex-1 text-center"
      >
        <span>Google Calendar</span>
        <ExternalLink className="w-3.5 h-3.5 text-mist shrink-0" />
      </a>
    </div>
  );
}
