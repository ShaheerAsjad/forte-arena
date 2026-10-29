import { connection } from "next/server";
import { notFound } from "next/navigation";
import { EventsService } from "@/features/events/services/events.service";
import { buildIcs, isCalendarEligible } from "@/features/events/events.calendar";
import { env } from "@/config/env";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  await connection();
  const { slug } = await params;

  const event = await EventsService.getEventDetails(slug);
  if (!event || !isCalendarEligible(event.item)) {
    notFound();
  }

  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const eventUrl = `${baseUrl}/events/${event.item.slug}`;

  const icsBody = buildIcs(event.item, { eventUrl });

  return new Response(icsBody, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.item.slug}.ics"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
