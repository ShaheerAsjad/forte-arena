import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EventCard, CATEGORY_META } from "@/components/shared/EventCard";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { EventDetailTabs } from "@/components/shared/EventDetailTabs";
import { EventRegisterCard } from "@/components/shared/EventRegisterCard";
import { AddToCalendarButton } from "@/components/shared/AddToCalendarButton";
import { isCalendarEligible } from "@/features/events/events.calendar";
import { StickyRegisterBar } from "@/features/events/components/StickyRegisterBar";
import { EventsService, type EventWithDerivedStatus } from "@/features/events/services/events.service";
import { EventsRepository, type EventDetailItem } from "@/features/events/repositories/events.repository";
import {
  getCandidateParentSlugs,
  findChildEvents,
  getChildSubHeading,
} from "@/features/events/events.relation";
import {
  EventWinnersSection,
  type ChildCompetitionWinners,
} from "@/features/events/components/EventWinnersSection";
import { ResultsService } from "@/features/results/services/results.service";
import { RegistrationsRepository } from "@/features/registrations/repositories/registrations.repository";
import { AnnouncementsService } from "@/features/announcements/services/announcements.service";
import { formatEventFullDate, formatEventTime, formatEventDate } from "@/lib/dates";
import { getSession } from "@/lib/session";
import {
  Calendar,
  MapPin,
  Users,
  User,
  ArrowLeft,
  Megaphone,
  ExternalLink,
} from "lucide-react";

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: EventDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await EventsService.getEventDetails(slug);
  if (!event) {
    return {
      title: "Event Not Found | Forte Arena",
    };
  }

  const { item } = event;
  const title = `${item.title} | Forte Arena`;
  const description =
    item.summary || `Join the ${item.title} competition at Forte Arena. Register before deadline.`;
  const ogImage = item.posterUrl ? [item.posterUrl] : ["/og-image.png"];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/events/${item.slug}`,
      siteName: "Forte Arena",
      images: ogImage,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage,
    },
  };
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

  // 1. Parent event detection for child competitions
  const candidateParentSlugs = getCandidateParentSlugs(item.slug);
  let parentEvent: { slug: string; title: string } | null = null;
  for (const cand of candidateParentSlugs) {
    const parentCandidate = await EventsRepository.getEventBySlug(cand);
    if (parentCandidate) {
      parentEvent = {
        slug: parentCandidate.slug,
        title: parentCandidate.title,
      };
      break;
    }
  }

  // 2. Fetch related events, notices, and published results using the same repository function as /results/[slug]
  const [relatedEvents, eventAnnouncements, allPublishedEvents, mainResultsData] =
    await Promise.all([
      EventsService.getRelatedEvents(item.category, item.slug, 3),
      AnnouncementsService.getAnnouncementsForEvent(item.id),
      ResultsService.getPublishedResultsEvents(),
      item.resultsPublished ? ResultsService.getEventResults(item.slug) : null,
    ]);

  const mainResults = mainResultsData?.results ?? [];

  // 3. Find related child competitions with published results
  const childPublished = findChildEvents(item.slug, allPublishedEvents);
  const childCompetitionsWithResults: ChildCompetitionWinners[] = [];
  for (const child of childPublished) {
    const childRes = await ResultsService.getEventResults(child.slug);
    if (childRes && childRes.results.length > 0) {
      childCompetitionsWithResults.push({
        slug: childRes.slug,
        title: childRes.title,
        subHeading: getChildSubHeading(item.title, childRes.title),
        results: childRes.results,
      });
    }
  }

  return (
    <>
      {/* Top Back Navigation & Parent Relation Link */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-mist hover:text-navy-950 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Competitions</span>
        </Link>

        {parentEvent && (
          <Link
            href={`/events/${parentEvent.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-700 dark:text-gold-300 bg-gold-50 dark:bg-gold-950/60 border border-gold-300/80 dark:border-gold-800/80 px-3 py-1 rounded-full hover:bg-gold-100 dark:hover:bg-gold-900/60 transition-colors"
            title={`Part of ${parentEvent.title}`}
          >
            <span className="text-mist dark:text-slate-400 font-normal">Part of:</span>
            <span className="font-bold underline decoration-gold-400/60 underline-offset-2">
              {parentEvent.title}
            </span>
          </Link>
        )}
      </div>

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
              {parentEvent && (
                <Link
                  href={`/events/${parentEvent.slug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gold-400/20 text-gold-300 border border-gold-400/40 hover:bg-gold-400/30 transition-colors"
                >
                  <span className="text-ivory/70 font-normal">Part of:</span>
                  <span className="underline underline-offset-2">{parentEvent.title}</span>
                </Link>
              )}
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
          {/* Left Column: Updates + Tabs */}
          <div className="lg:col-span-8 space-y-6">
            {eventAnnouncements.length > 0 && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-gold-50/90 via-white to-navy-50/50 border border-gold-300 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gold-500 text-navy-950 flex items-center justify-center font-bold">
                    <Megaphone className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-heading text-sm font-bold text-navy-950">
                    Important Updates & Notices ({eventAnnouncements.length})
                  </h3>
                </div>
                <div className="space-y-3 divide-y divide-navy-100/60">
                  {eventAnnouncements.map((u) => (
                    <div key={u.id} className="pt-2.5 first:pt-0 space-y-1">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <h4
                          className="text-xs font-bold text-navy-950 flex items-center gap-1.5 min-w-0 flex-1 truncate"
                          title={u.title}
                        >
                          {u.pinned && (
                            <span className="text-[10px] font-bold text-gold-800 bg-gold-100 px-1.5 py-0.2 rounded border border-gold-300 shrink-0">
                              PINNED
                            </span>
                          )}
                          <span className="truncate">{u.title}</span>
                        </h4>
                        <span className="text-[10px] text-mist shrink-0">
                          {formatEventDate(u.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-ink/80 leading-relaxed whitespace-pre-line">
                        {u.body}
                      </p>
                      {u.linkUrl && u.linkLabel && (
                        <div className="pt-1">
                          <a
                            href={u.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-700 hover:text-gold-800"
                          >
                            <span>{u.linkLabel}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      {/* Official Winners Section (shown only when event or child competitions have published results) */}
      <EventWinnersSection
        eventTitle={item.title}
        eventSlug={item.slug}
        results={mainResults}
        childCompetitions={childCompetitionsWithResults}
      />

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
      <div className="pt-4">
        <Skeleton className="h-5 w-40 rounded-md" />
      </div>
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

  const canAddToCalendar = isCalendarEligible(event.item);

  return (
    <>
      <div className="space-y-3">
        <EventRegisterCard
          event={event}
          isLoggedIn={isLoggedIn}
          existingRegistration={existingRegistration}
        />
        {canAddToCalendar && (
          <div className="p-4 bg-white rounded-2xl border border-navy-100 shadow-xs space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-mist">
              Save Event
            </p>
            <AddToCalendarButton event={event.item} />
          </div>
        )}
      </div>
      <StickyRegisterBar
        event={event.item}
        derivedStatus={event.derivedStatus}
        remainingSeats={event.remainingSeats}
        isLoggedIn={isLoggedIn}
        existingRegistration={existingRegistration}
      />
    </>
  );
}
