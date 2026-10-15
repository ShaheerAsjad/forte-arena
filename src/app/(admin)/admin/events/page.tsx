import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { AdminEventsFilter } from "@/features/admin/events/AdminEventsFilter";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EventsService } from "@/features/events/services/events.service";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Plus,
  Users,
  Calendar,
  ExternalLink,
  Edit,
} from "lucide-react";
import type { EventStatus } from "@/lib/db-types";

export const metadata = {
  title: "Manage Events | Admin Console",
};

interface AdminEventsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}

const VALID_STATUSES: EventStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
  "COMPLETED",
  "CANCELLED",
];

async function AdminEventsContent({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}) {
  const { search, status } = await searchParams;
  await requireRole(["ORGANIZER", "ADMIN"], "/login?next=/admin/events");

  const where: NonNullable<Parameters<typeof prisma.event.findMany>[0]>["where"] = {};

  if (status && status !== "ALL" && VALID_STATUSES.includes(status as EventStatus)) {
    where.status = status as EventStatus;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { venue: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: { startsAt: "desc" },
    include: {
      _count: {
        select: {
          registrations: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Create CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-100/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-heading">
            Events & Competitions
          </h1>
          <p className="text-sm text-mist mt-0.5">
            Manage festival arenas, modify rules, and monitor participant turnout.
          </p>
        </div>

        <Link href="/admin/events/new">
          <Button variant="gold" size="md" className="shadow-md shadow-gold-500/20 font-semibold">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Create New Event</span>
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <AdminEventsFilter currentSearch={search} currentStatus={status} />

      {/* Events Table Card */}
      <Card className="p-6 bg-white border border-navy-100 shadow-sm rounded-2xl">
        {events.length === 0 ? (
          <div className="py-16 text-center text-mist space-y-3">
            <Calendar className="w-10 h-10 mx-auto text-navy-200" />
            <p className="text-base font-semibold text-navy-950">No competitions found</p>
            <p className="text-xs max-w-sm mx-auto">
              No events matched your current search filters. Try clearing your filters or create a new event.
            </p>
            <Link href="/admin/events/new" className="inline-block pt-2">
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                <span>Create an event</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-navy-100/80 text-mist uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Event</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Participation</th>
                  <th className="py-3 px-3">Schedule</th>
                  <th className="py-3 px-3">Registrations</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {events.map((event) => {
                  const derivedStatus = EventsService.getDerivedStatus(event);

                  return (
                    <tr
                      key={event.id}
                      className="hover:bg-navy-50/50 transition-colors"
                    >
                      {/* Event Title, Category & Thumbnail */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-10 rounded-lg overflow-hidden shrink-0 border border-navy-100 bg-navy-900">
                            {event.posterUrl ? (
                              <Image
                                src={event.posterUrl}
                                alt={event.title}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <CategoryArtwork
                                category={event.category}
                                showIcon={false}
                                className="w-full h-full"
                              />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-navy-950 text-sm max-w-[240px] truncate">
                              {event.title}
                            </div>
                            <div className="text-[11px] text-mist flex items-center gap-1.5 mt-0.5">
                              <span className="font-semibold text-gold-600">
                                {event.category}
                              </span>
                              <span>• {event.venue}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <StatusBadge status={derivedStatus} />
                      </td>

                      {/* Participation format */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-navy-100 text-navy-800">
                          {event.participationType === "TEAM"
                            ? `Team (${event.minTeamSize}-${event.maxTeamSize})`
                            : "Solo"}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-3 text-mist whitespace-nowrap">
                        <div className="font-medium text-navy-900">
                          {new Date(event.startsAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-mist">
                          Deadline:{" "}
                          {new Date(event.registrationDeadline).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                        </div>
                      </td>

                      {/* Registrations count */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-navy-600" />
                          <span className="font-bold text-navy-950">
                            {event._count.registrations}
                          </span>
                          {event.maxParticipants && (
                            <span className="text-mist">
                              / {event.maxParticipants} max
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/events/${event.id}/registrations`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-navy-50 hover:bg-navy-100 text-navy-900 transition"
                            title="Manage registrations"
                          >
                            <Users className="w-3.5 h-3.5 text-gold-600" />
                            <span>Registrations</span>
                          </Link>

                          <Link
                            href={`/admin/events/${event.id}/edit`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-navy-200 hover:bg-navy-50 text-navy-900 transition"
                            title="Edit event"
                          >
                            <Edit className="w-3.5 h-3.5 text-mist" />
                            <span>Edit</span>
                          </Link>

                          <Link
                            href={`/events/${event.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-mist hover:text-navy-900 hover:bg-navy-50 transition"
                            title="View public page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function AdminEventsPage({ searchParams }: AdminEventsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-16 bg-navy-100/50 rounded-2xl w-full" />
          <div className="h-14 bg-navy-100/50 rounded-2xl w-full" />
          <div className="h-96 bg-navy-100/50 rounded-2xl w-full" />
        </div>
      }
    >
      <AdminEventsContent searchParams={searchParams} />
    </Suspense>
  );
}
