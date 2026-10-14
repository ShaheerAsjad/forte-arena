import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/motion/Reveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { CountUp } from "@/components/motion/CountUp";
import { FloatingShapes } from "@/components/motion/FloatingShapes";
import { IntroSplash } from "@/components/motion/IntroSplash";
import { HeroSpotlight } from "@/components/motion/HeroSpotlight";
import { HeadlineWords } from "@/components/motion/HeadlineWords";
import { TiltCard } from "@/components/motion/TiltCard";
import { CategoryMarquee } from "@/components/motion/CategoryMarquee";
import { HowItWorksSteps } from "@/components/motion/HowItWorksSteps";
import { CountdownChip } from "@/components/shared/CountdownChip";
import { EventCard, CATEGORY_META } from "@/components/shared/EventCard";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { EventsService } from "@/features/events/services/events.service";
import { AnnouncementsService } from "@/features/announcements/services/announcements.service";
import { ResultsService } from "@/features/results/services/results.service";
import { StatsService } from "@/features/stats/services/stats.service";
import { formatEventDate } from "@/lib/dates";
import { APP_NAME } from "@/config/app";
import {
  ArrowRight,
  Sparkles,
  Trophy,
  Calendar,
  Users,
  Megaphone,
  Pin,
  Clock,
  Layers,
} from "lucide-react";
import type { EventCategory } from "@/lib/db-types";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden space-y-20 pb-24">
      {/* 0. First-Visit Session Splash Animation */}
      <IntroSplash />

      <FloatingShapes />

      {/* 1. Hero Section with Interactive Spotlight & Mesh Gradient */}
      <HeroSpotlight>
        <section className="relative pt-10 sm:pt-16 pb-6 px-4 sm:px-6 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              <Reveal>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-navy-100/90 border border-gold-400/50 text-navy-950 text-xs sm:text-sm font-semibold shadow-xs">
                  <Sparkles className="w-4 h-4 text-gold-600" />
                  <span>Campus Festival 2026 Season</span>
                </div>
              </Reveal>

              <HeadlineWords
                text="Unleash Your Talent at"
                highlightText={APP_NAME}
                className="font-heading text-4xl sm:text-6xl font-extrabold tracking-tight text-navy-950 leading-[1.1]"
              />

              <Reveal delay={0.2}>
                <p className="text-base sm:text-lg text-mist max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                  The university&apos;s grand stage for technical hackathons, athletic showdowns, gaming tournaments, and cultural arts. Register solo or assemble your squad.
                </p>
              </Reveal>

              <Reveal delay={0.3}>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                  <Link href="/events" className="w-full sm:w-auto">
                    <Button variant="gold" size="lg" className="w-full shadow-lg shadow-gold-500/25">
                      <span>Explore Events</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/results" className="w-full sm:w-auto">
                    <Button variant="outline" size="lg" className="w-full border-navy-200 hover:bg-navy-50">
                      <Trophy className="w-4 h-4 mr-2 text-gold-500" />
                      <span>View Winners</span>
                    </Button>
                  </Link>
                </div>
              </Reveal>
            </div>

            {/* Right: Live Next-Event Countdown Card with 3D Tilt */}
            <div className="lg:col-span-5 flex justify-center">
              <Suspense fallback={<HeroCountdownCardSkeleton />}>
                <HeroNextEventCard />
              </Suspense>
            </div>
          </div>
        </section>
      </HeroSpotlight>

      {/* 2. Slow Infinite Marquee Strip */}
      <CategoryMarquee />

      {/* 3. Stats Strip (Animated On Viewport Scroll) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <Suspense fallback={<StatsStripSkeleton />}>
          <FestivalStatsStrip />
        </Suspense>
      </section>

      {/* 4. Featured Events */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-navy-100 pb-4">
            <div>
              <Badge variant="navy" size="sm" className="mb-2">Spotlight</Badge>
              <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-navy-950">
                Featured Competitions
              </h2>
            </div>
            <Link
              href="/events"
              className="text-sm font-bold text-navy-800 hover:text-navy-600 flex items-center gap-1.5 transition-colors"
            >
              <span>View All Competitions</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>

        <Suspense fallback={<EventGridSkeleton count={3} />}>
          <FeaturedEventsGrid />
        </Suspense>
      </section>

      {/* 5. Category Tiles with Code-Made Illustrated Artwork */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <Reveal>
          <div className="text-center max-w-xl mx-auto space-y-2">
            <Badge variant="gold" size="sm">Arenas</Badge>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-navy-950">
              Browse by Category
            </h2>
            <p className="text-sm text-mist">
              Choose your battleground and join teams across diverse university disciplines.
            </p>
          </div>
        </Reveal>

        <Stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {(Object.keys(CATEGORY_META) as EventCategory[]).map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            return (
              <StaggerItem key={cat}>
                <Link
                  href={`/events?category=${cat}`}
                  className="group block focus:outline-none h-full"
                >
                  <Card
                    hoverable
                    className="relative overflow-hidden rounded-2xl border border-navy-100/90 bg-navy-950 h-36 sm:h-40 flex flex-col justify-end p-4 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-gold-400/80 hover:shadow-[0_14px_30px_-6px_rgba(245,185,1,0.25)]"
                  >
                    {/* Illustrated Category Background Motif */}
                    <div className="absolute inset-0">
                      <CategoryArtwork category={cat} showIcon={false} />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/70 to-transparent" />
                    </div>

                    {/* Small Category Icon Badge (Top Right) */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="w-7 h-7 rounded-lg bg-navy-950/85 backdrop-blur-md border border-white/20 flex items-center justify-center text-gold-400 shadow-md group-hover:scale-110 group-hover:border-gold-400/60 transition-all">
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Tile Bottom Details */}
                    <div className="relative z-10 flex items-end justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gold-400 block font-heading">
                          Arena
                        </span>
                        <span className="font-heading text-xs sm:text-sm font-extrabold text-ivory group-hover:text-gold-200 transition-colors line-clamp-1">
                          {meta.label}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-gold-400 group-hover:scale-110 group-hover:bg-gold-500 group-hover:text-navy-950 group-hover:border-gold-400 transition-all duration-300 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      {/* 6. How It Works Steps with Drawing Connecting Line */}
      <section className="bg-navy-950 text-ivory py-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-gold-400 font-heading">
                How It Works
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-ivory">
                Your Journey to the Arena Podium
              </h2>
              <p className="text-sm sm:text-base text-ivory/70 leading-relaxed">
                Participating in Forté Arena is simple, swift, and transparent at every stage.
              </p>
            </div>
          </Reveal>

          <HowItWorksSteps />
        </div>
      </section>

      {/* 7. Latest Announcements */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <Reveal>
          <div className="flex items-center justify-between border-b border-navy-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center text-gold-600">
                <Megaphone className="w-4 h-4" />
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-navy-950">
                Festival Bulletins & Announcements
              </h2>
            </div>
          </div>
        </Reveal>

        <Suspense fallback={<AnnouncementsSkeleton />}>
          <AnnouncementsSection />
        </Suspense>
      </section>

      {/* 8. Recent Winners Spotlight (with Gold Shimmer) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <Reveal>
          <div className="flex items-center justify-between border-b border-navy-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-navy-950">
                  Recent Champions Spotlight
                </h2>
              </div>
            </div>
            <Link
              href="/results"
              className="text-xs sm:text-sm font-bold text-navy-800 hover:text-navy-600 flex items-center gap-1"
            >
              <span>All Results</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Reveal>

        <Suspense fallback={<WinnersSpotlightSkeleton />}>
          <WinnersSpotlightSection />
        </Suspense>
      </section>
    </div>
  );
}

// -------------------------------------------------------------
// Suspenseful Async Data Components
// -------------------------------------------------------------

async function HeroNextEventCard() {
  const nextEvent = await EventsService.getNextUpcomingEvent();

  if (!nextEvent) {
    return (
      <TiltCard className="w-full max-w-md">
        <Card className="w-full p-6 text-center space-y-4 bg-white/95 border-navy-100 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-gold-100 mx-auto flex items-center justify-center text-gold-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-bold text-navy-950">
              Next Event Coming Soon
            </h3>
            <p className="text-xs text-mist">
              Event schedules are being finalized by organizers. Stay tuned!
            </p>
          </div>
          <Link href="/events" className="block pt-2">
            <Button variant="outline" size="sm" className="w-full">
              Browse All Arenas
            </Button>
          </Link>
        </Card>
      </TiltCard>
    );
  }

  const { item } = nextEvent;

  return (
    <TiltCard className="w-full max-w-md">
      <Card className="w-full p-6 sm:p-7 space-y-6 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-ivory border-navy-800 shadow-2xl rounded-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-36 h-36 bg-gold-400/15 rounded-full blur-2xl" />

        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gold-500/20 text-gold-400 border border-gold-400/30">
            <Clock className="w-3.5 h-3.5" />
            Next Up
          </span>
          <span className="text-xs text-ivory/70 font-medium">
            {formatEventDate(item.startsAt)}
          </span>
        </div>

        <div className="space-y-2">
          <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-ivory line-clamp-2">
            {item.title}
          </h3>
          <p className="text-xs sm:text-sm text-ivory/70 line-clamp-2 leading-relaxed">
            {item.summary}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <span className="text-[11px] uppercase tracking-wider text-gold-400 font-bold">
            Countdown to Match
          </span>
          <div className="text-xl sm:text-2xl font-black font-heading text-ivory">
            <CountdownChip targetDate={item.startsAt} />
          </div>
        </div>

        <Link href={`/events/${item.slug}`} className="block">
          <Button variant="gold" className="w-full py-5 text-sm font-bold shadow-md shadow-gold-500/20">
            <span>View Competition Details</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </Card>
    </TiltCard>
  );
}

async function FestivalStatsStrip() {
  const stats = await StatsService.getFestivalStats();

  const STATS_DATA = [
    { label: "Festival Events", value: stats.totalEvents, suffix: "+", icon: Calendar },
    { label: "Active Participants", value: stats.totalParticipants, suffix: "+", icon: Users },
    { label: "Competition Arenas", value: stats.totalCategories, suffix: "", icon: Layers },
    { label: "Champions Crowned", value: stats.totalWinners, suffix: "+", icon: Trophy },
  ];

  return (
    <Card className="p-6 sm:p-8 bg-white/95 border-navy-100/80 shadow-md">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-navy-100">
        {STATS_DATA.map((st, i) => {
          const Icon = st.icon;
          return (
            <div key={st.label} className={`flex flex-col items-center text-center ${i > 0 ? "pt-4 sm:pt-0 sm:pl-6" : ""}`}>
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center text-gold-500 mb-2">
                <Icon className="w-5 h-5" />
              </div>
              <div className="font-heading text-3xl sm:text-4xl font-extrabold text-navy-950">
                <CountUp to={st.value} suffix={st.suffix} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-mist mt-1">
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

async function FeaturedEventsGrid() {
  const events = await EventsService.getFeaturedEvents(3);

  if (events.length === 0) {
    return (
      <Card className="p-12 text-center space-y-3 bg-white">
        <p className="text-sm text-mist">No published events currently available.</p>
      </Card>
    );
  }

  return (
    <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <StaggerItem key={event.item.id}>
          <EventCard event={event} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

async function AnnouncementsSection() {
  const announcements = await AnnouncementsService.getLatestAnnouncements(3);

  if (announcements.length === 0) {
    return (
      <p className="text-xs text-mist">No current announcements published.</p>
    );
  }

  return (
    <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {announcements.map((a) => (
        <StaggerItem key={a.id}>
          <Card
            hoverable
            className="h-full p-5 space-y-2.5 bg-white border-navy-100 hover:-translate-y-1 hover:border-gold-300/80 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              {a.pinned ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-700 bg-gold-50 px-2 py-0.5 rounded-full border border-gold-300">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              ) : (
                <span className="text-[11px] text-mist">Notice</span>
              )}
              <span className="text-[11px] text-mist">{formatEventDate(a.publishedAt)}</span>
            </div>
            <h4 className="font-heading text-sm font-bold text-navy-950 line-clamp-1">
              {a.title}
            </h4>
            <p className="text-xs text-ink/80 line-clamp-2 leading-relaxed">
              {a.body}
            </p>
          </Card>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

async function WinnersSpotlightSection() {
  const winners = await ResultsService.getRecentSpotlightWinners(3);

  if (winners.length === 0) {
    return (
      <Card className="p-6 text-center text-xs text-mist bg-white">
        Competition results will be posted here as events complete.
      </Card>
    );
  }

  return (
    <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {winners.map((w) => (
        <StaggerItem key={w.eventId}>
          <Link href={`/results/${w.eventSlug}`} className="group block focus:outline-none h-full">
            <Card
              hoverable
              className="h-full p-5 bg-gradient-to-br from-amber-50/60 to-white border-amber-200/90 space-y-2 hover:-translate-y-1 hover:border-gold-400/80 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-between text-xs">
                <Badge variant="gold" size="sm">Champion</Badge>
                <span className="text-[11px] font-semibold text-mist uppercase tracking-wider">{w.category}</span>
              </div>
              <h4 className="font-heading text-base font-extrabold gold-shimmer">
                {w.winnerName}
              </h4>
              <p className="text-xs text-mist line-clamp-1">
                Event: {w.eventTitle}
              </p>
              {w.teamName && (
                <p className="text-[11px] font-semibold text-amber-900">
                  Team: {w.teamName}
                </p>
              )}
            </Card>
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

// -------------------------------------------------------------
// Skeletons
// -------------------------------------------------------------

function HeroCountdownCardSkeleton() {
  return (
    <div className="w-full max-w-md">
      <Card className="w-full p-7 space-y-4 bg-navy-900 rounded-3xl">
        <Skeleton className="h-6 w-1/3 bg-navy-800" />
        <Skeleton className="h-8 w-3/4 bg-navy-800" />
        <Skeleton className="h-20 w-full bg-navy-800 rounded-2xl" />
        <Skeleton className="h-12 w-full bg-navy-800 rounded-xl" />
      </Card>
    </div>
  );
}

function StatsStripSkeleton() {
  return (
    <Card className="p-8 bg-white border-navy-100">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center space-y-2">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function EventGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden border border-navy-100 bg-white">
          <Skeleton className="w-full aspect-16/10" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="pt-2 border-t border-navy-50 flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AnnouncementsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-5 space-y-2.5 bg-white border-navy-100">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </Card>
      ))}
    </div>
  );
}

function WinnersSpotlightSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-5 space-y-2 bg-amber-50/40 border-amber-100">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-40" />
        </Card>
      ))}
    </div>
  );
}
