import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EventCard, CATEGORY_META } from "@/components/shared/EventCard";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { EventDetailTabs } from "@/components/shared/EventDetailTabs";
import { EventRegisterCard } from "@/components/shared/EventRegisterCard";
import { EventsService, type EventWithDerivedStatus } from "@/features/events/services/events.service";
import type { EventDetailItem } from "@/features/events/repositories/events.repository";
import { RegistrationsRepository } from "@/features/registrations/repositories/registrations.repository";
import { getSession } from "@/lib/session";
import { formatEventFullDate, formatEventTime } from "@/lib/dates";
import {
  Calendar,
  MapPin,
  Users,
  User,
  ArrowLeft,
} from "lucide-react";

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  return (
    <div className="relative space-y-12 pb-20 overflow-hidden">
      {/* Ambient Navy/Gold Mesh Backdrop */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(245,185,1,0.2),rgba(0,25,105,0.12),transparent_70%)] blur-3xl" />
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[350px] bg-[radial-gradient(circle_at_center,rgba(98,136,237,0.14),transparent_65%)] blur-3xl" />
      </div>

      {/* Blueprint Grid Texture */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,15,64,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,15,64,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_20%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Back Navigation */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-mist hover:text-navy-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Competitions</span>
        </Link>
      </div>

      <Suspense fallback={<EventDetailSkeleton />}>
        <EventDetailContent params={params} />
      </Suspense>
    </div>
  );
}

async function EventDetailContent({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const event = await EventsService.getEventDetails(slug);

  if (!event) {
    notFound();
  }

  const { item, derivedStatus } = event;
  const categoryMeta = CATEGORY_META[item.category] || CATEGORY_META.OTHER;
  const CategoryIcon = categoryMeta.icon;

  const relatedEvents = await EventsService.getRelatedEvents(item.category, item.slug, 3);

  return (
    <>
      {/* Hero Poster Banner */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-ivory border border-navy-800 shadow-xl">
          {/* Category Icon Badge - On top of poster image or artwork */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-navy-950/85 text-ivory backdrop-blur-md border border-white/20 shadow-lg">
              <CategoryIcon className="w-4 h-4 text-gold-400 shrink-0" />
              <span>{categoryMeta.label} Arena</span>
            </span>
          </div>

          {item.posterUrl ? (
            <div className="relative h-64 sm:h-96 w-full">
              <Image
                src={item.posterUrl}
                alt={item.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/70 to-transparent" />
            </div>
          ) : (
            <div className="relative h-56 sm:h-80 w-full overflow-hidden">
              <CategoryArtwork category={item.category} showIcon={false} />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/60 to-transparent" />
            </div>
          )}

          {/* Banner Details Overlay */}
          <div className="p-6 sm:p-10 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md text-ivory border border-white/20">
                <CategoryIcon className="w-3.5 h-3.5 text-gold-400" />
                <span>{categoryMeta.label}</span>
              </span>
              <StatusBadge status={derivedStatus} />
              <Badge variant="navy">
                {item.participationType === "TEAM" ? "Team Event" : "Solo Event"}
              </Badge>
            </div>

            <div className="space-y-3">
              <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-ivory leading-tight">
                {item.title}
              </h1>
              <p className="text-sm sm:text-base text-ivory/80 max-w-3xl leading-relaxed">
                {item.summary}
              </p>
            </div>

            {/* Event Key Info Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs sm:text-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-gold-400 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-ivory/60 text-[11px] block">Date & Time</span>
                  <span className="font-semibold text-ivory">
                    {formatEventFullDate(item.startsAt)} • {formatEventTime(item.startsAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-gold-400 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-ivory/60 text-[11px] block">Arena Venue</span>
                  <span className="font-semibold text-ivory">{item.venue}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-gold-400 shrink-0">
                  {item.participationType === "TEAM" ? (
                    <Users className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-ivory/60 text-[11px] block">Format</span>
                  <span className="font-semibold text-ivory">
                    {item.participationType === "TEAM"
                      ? `${item.minTeamSize}-${item.maxTeamSize} Members per Team`
                      : "Individual Solo Registration"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content & Sticky Registration Column */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Tabs */}
          <div className="lg:col-span-8 space-y-6">
            <EventDetailTabs
              description={item.description}
              rules={item.rules}
              eligibility={item.eligibility}
              prizes={item.prizes}
            />
          </div>

          {/* Right Column: Sticky Register Card inside Suspense */}
          <div className="lg:col-span-4">
            <Suspense fallback={<Card className="p-7 space-y-4 bg-white animate-pulse h-72" />}>
              <EventRegisterSection event={event} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Related Events Section */}
      {relatedEvents.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 border-t border-navy-100 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-navy-950">
              More in {categoryMeta.label}
            </h3>
            <Link
              href={`/events?category=${item.category}`}
              className="text-xs sm:text-sm font-bold text-navy-800 hover:text-navy-600"
            >
              View Arena
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedEvents.map((rel) => (
              <EventCard key={rel.item.id} event={rel} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function EventDetailSkeleton() {
  return (
    <div className="space-y-12 max-w-6xl mx-auto px-4 sm:px-6">
      <Card className="h-64 sm:h-96 bg-navy-900 rounded-3xl animate-pulse border-navy-800" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8">
          <Card className="h-80 bg-white rounded-2xl border border-navy-100 animate-pulse" />
        </div>
        <div className="lg:col-span-4">
          <Card className="p-7 space-y-4 bg-white rounded-2xl border border-navy-100 animate-pulse h-72" />
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Suspenseful Session Reader Component
// -------------------------------------------------------------

async function EventRegisterSection({
  event,
}: {
  event: EventWithDerivedStatus<EventDetailItem>;
}) {
  const session = await getSession();
  const isLoggedIn = !!session?.user;

  let existingRegistration: { id: string; status: string } | null = null;
  if (isLoggedIn && session?.user?.id) {
    existingRegistration = await RegistrationsRepository.findExistingRegistration(
      event.item.id,
      session.user.id
    );
  }

  return (
    <EventRegisterCard
      event={event}
      isLoggedIn={isLoggedIn}
      existingRegistration={existingRegistration}
    />
  );
}
