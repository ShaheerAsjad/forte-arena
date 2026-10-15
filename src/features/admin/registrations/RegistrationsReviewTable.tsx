"use client";

import {
  RegistrationsReviewCards,
  type RegistrationReviewItem,
  type EventOption,
} from "./RegistrationsReviewCards";

export type { RegistrationReviewItem, EventOption };

export function RegistrationsReviewTable({
  registrations,
  eventId,
  maxParticipants,
  approvedCount,
  events,
  showEventFilter,
}: {
  registrations: RegistrationReviewItem[];
  eventId?: string;
  maxParticipants: number | null;
  approvedCount: number;
  events?: EventOption[];
  showEventFilter?: boolean;
}) {
  return (
    <RegistrationsReviewCards
      registrations={registrations}
      currentEventId={eventId}
      maxParticipants={maxParticipants}
      approvedCount={approvedCount}
      events={events}
      showEventFilter={showEventFilter}
    />
  );
}
