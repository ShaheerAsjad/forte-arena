import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { FloatingShapes } from "@/components/motion/FloatingShapes";
import { CountdownChip } from "@/components/shared/CountdownChip";
import { EventCard, CATEGORY_META } from "@/components/shared/EventCard";
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
  Compass,
  UserCheck,
  Megaphone,
  Pin,
  Clock,
  Layers,
} from "lucide-react";
import type { EventCategory } from "@/generated/prisma";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden space-y-24 pb-24">
      <FloatingShapes />

      {/* 1. Hero Section */}
      <section className="relative pt-10 sm:pt-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-navy-100/90 border border-gold-400/40 text-navy-900 text-xs sm:text-sm font-semibold shadow-xs">
                <Sparkles className="w-4 h-4 text-gold-500" />
                <span>Campus Festival 2026 Season</span>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="font-heading text-4xl sm:text-6xl font-extrabold tracking-tight text-navy-950 leading-[1.1]">
                Unleash Your Talent at{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-navy-900 via-navy-700 to-gold-500">
                  {APP_NAME}
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="text-base sm:text-lg text-mist max-w-xl mx-auto lg:mx-0 leading-relaxed">
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

          {/* Right: Live Next-Event Countdown Card */}
          <div className="lg:col-span-5 flex justify-center">
            <Suspense fallback={<HeroCountdownCardSkeleton />}>
              <HeroNextEventCard />
            </Suspense>
          </div>
        </div>
      </section>

      {/* 2. Stats Strip */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <Suspense fallback={<StatsStripSkeleton />}>
          <FestivalStatsStrip />
        </Suspense>
      </section>

      {/* 3. Featured Events */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
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

        <Suspense fallback={<EventGridSkeleton count={3} />}>
          <FeaturedEventsGrid />
        </Suspense>
      </section>

      {/* 4. Category Tiles */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="gold" size="sm">Arenas</Badge>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-navy-950">
            Browse by Category
          </h2>
          <p className="text-sm text-mist">
            Choose your battleground and join teams across diverse university disciplines.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {(Object.keys(CATEGORY_META) as EventCategory[]).map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            return (
              <Link
                key={cat}
                href={`/events?category=${cat}`}
                className="group block focus:outline-none"
              >
                <Card
                  hoverable
                  className="p-5 text-center flex flex-col items-center justify-center space-y-3 border border-navy-100 bg-white h-full group-hover:border-gold-400/50"
                >
                  <div className="w-12 h-12 rounded-2xl bg-navy-50 group-hover:bg-gold-50 flex items-center justify-center text-navy-900 group-hover:text-gold-600 transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-heading text-xs sm:text-sm font-bold text-navy-950">
                    {meta.label}
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. How It Works Steps */}
      <section className="bg-navy-950 text-ivory py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Discover",
                desc: "Explore events across categories, check team sizes, rules, and schedules.",
                icon: Compass,
              },
              {
                step: "02",
                title: "Register",
                desc: "Sign up individually or form your team roster with roll numbers.",
                icon: Users,
              },
              {
                step: "03",
                title: "Get Approved",
                desc: "Track real-time organizer reviews and live team verification.",
                icon: UserCheck,
              },
              {
                step: "04",
                title: "Compete & Win",
                desc: "Take the arena floor, score podium positions, and download certificates.",
                icon: Trophy,
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="relative p-6 rounded-3xl bg-navy-900/60 border border-navy-800/80 backdrop-blur-md space-y-4 hover:border-gold-400/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gold-400/15 text-gold-400 flex items-center justify-center font-heading font-black">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-heading text-3xl font-black text-ivory/20">
                      {s.step}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-ivory">
                    {s.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-ivory/70 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Latest Announcements */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
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

        <Suspense fallback={<AnnouncementsSkeleton />}>
          <AnnouncementsSection />
        </Suspense>
      </section>

      {/* 7. Recent Winners Spotlight */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
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
      <Card className="w-full max-w-sm p-6 text-center space-y-4 bg-white/95 border-navy-100 shadow-xl">
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
    );
  }

  const { item } = nextEvent;

  return (
    <Card className="w-full max-w-md p-6 sm:p-7 space-y-6 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-ivory border-navy-800 shadow-2xl rounded-3xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/10 rounded-full blur-2xl" />

      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gold-500/20 text-gold-400 border border-gold-400/30">
          <Clock className="w-3.5 h-3.5" />
          Next Up
        </span>
        <span className="text-xs text-ivory/60 font-medium">
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event.item.id} event={event} />
      ))}
    </div>
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {announcements.map((a) => (
        <Card key={a.id} className="p-5 space-y-2.5 bg-white border-navy-100">
          <div className="flex items-center justify-between">
            {a.pinned ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full border border-gold-200">
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
      ))}
    </div>
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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {winners.map((w) => (
        <Link key={w.eventId} href={`/results/${w.eventSlug}`} className="group block focus:outline-none">
          <Card hoverable className="p-5 bg-gradient-to-br from-amber-50/50 to-white border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <Badge variant="gold" size="sm">Champion</Badge>
              <span className="text-[11px] text-mist">{w.category}</span>
            </div>
            <h4 className="font-heading text-base font-bold text-navy-950 group-hover:text-navy-700 transition-colors">
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
      ))}
    </div>
  );
}

// -------------------------------------------------------------
// Skeletons
// -------------------------------------------------------------

function HeroCountdownCardSkeleton() {
  return (
    <Card className="w-full max-w-md p-7 space-y-4 bg-navy-900 rounded-3xl">
      <Skeleton className="h-6 w-1/3 bg-navy-800" />
      <Skeleton className="h-8 w-3/4 bg-navy-800" />
      <Skeleton className="h-20 w-full bg-navy-800 rounded-2xl" />
      <Skeleton className="h-12 w-full bg-navy-800 rounded-xl" />
    </Card>
  );
}

function StatsStripSkeleton() {
  return (
    <Card className="p-8 bg-white">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center space-y-2">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-24" />
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
        <Card key={i} className="overflow-hidden space-y-4 p-5 bg-white">
          <Skeleton className="aspect-16/10 w-full rounded-xl" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      ))}
    </div>
  );
}

function AnnouncementsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-5 space-y-2 bg-white">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-5 w-2/3" />
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
        <Card key={i} className="p-5 space-y-2 bg-white">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </Card>
      ))}
    </div>
  );
}
