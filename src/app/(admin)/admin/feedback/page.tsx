import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { FeedbackRepository } from "@/features/feedback/repositories/feedback.repository";
import { AdminFeedbackFilter } from "@/features/admin/feedback/AdminFeedbackFilter";
import { Card } from "@/components/ui/Card";
import {
  MessageSquareQuote,
  Star,
  Users,
  Award,
  Calendar,
  Sparkles,
} from "lucide-react";
import { getDepartmentLabel } from "@/features/profile/academic.config";

export const metadata = {
  title: "Participant Feedback | Admin Console",
};

interface PageProps {
  searchParams: Promise<{ eventId?: string }>;
}

async function AdminFeedbackContent({ searchParams }: PageProps) {
  await requireRole(["ORGANIZER", "ADMIN"], "/login?next=/admin/feedback");
  const { eventId } = await searchParams;
  const currentEventId = eventId || "ALL";

  const [events, stats, feedbacks] = await Promise.all([
    FeedbackRepository.getEventsForFilter(),
    FeedbackRepository.getFeedbackStats(currentEventId),
    FeedbackRepository.getFeedbackList(currentEventId),
  ]);

  const selectedEvent = events.find((e) => e.id === currentEventId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-100/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gold-600 bg-gold-100/80 px-2.5 py-0.5 rounded-full border border-gold-300">
              Student Sentiment
            </span>
            <span className="text-xs text-mist">• Quality & Reviews</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-heading">
            Participant Feedback
          </h1>
          <p className="text-sm text-mist mt-0.5">
            Post-tournament ratings and reviews submitted by approved competitors.
          </p>
        </div>

        <AdminFeedbackFilter
          events={events}
          selectedEventId={currentEventId}
        />
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Average Rating Card */}
        <Card className="p-6 bg-white border border-navy-100 shadow-sm rounded-2xl flex items-center gap-4 hover:border-gold-300 transition-colors">
          <div className="w-13 h-13 rounded-2xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-700 shrink-0">
            <Star className="w-6 h-6 fill-gold-500 text-gold-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-mist uppercase tracking-wider">
              Average Score
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-black font-heading text-navy-950">
                {stats.totalResponses > 0 ? stats.averageRating.toFixed(1) : "—"}
              </span>
              <span className="text-xs font-bold text-gold-600">
                {stats.totalResponses > 0 ? "out of 5.0" : "No ratings yet"}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-gold-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= Math.round(stats.averageRating)
                      ? "fill-gold-500 text-gold-500"
                      : "text-navy-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </Card>

        {/* Total Responses */}
        <Card className="p-6 bg-white border border-navy-100 shadow-sm rounded-2xl flex items-center gap-4 hover:border-gold-300 transition-colors">
          <div className="w-13 h-13 rounded-2xl bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-800 shrink-0">
            <Users className="w-6 h-6 text-navy-700" />
          </div>
          <div>
            <p className="text-xs font-bold text-mist uppercase tracking-wider">
              Total Responses
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-black font-heading text-navy-950">
                {stats.totalResponses}
              </span>
              <span className="text-xs font-medium text-emerald-700">
                {selectedEvent ? "for this event" : "across all events"}
              </span>
            </div>
            <p className="text-xs text-mist mt-1">Verified student submissions</p>
          </div>
        </Card>

        {/* Positive Sentiment % (4 & 5 stars) */}
        <Card className="p-6 bg-white border border-navy-100 shadow-sm rounded-2xl flex items-center gap-4 hover:border-gold-300 transition-colors">
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
            <Award className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <p className="text-xs font-bold text-mist uppercase tracking-wider">
              Satisfaction Rate
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-black font-heading text-navy-950">
                {stats.totalResponses > 0
                  ? `${Math.round(
                      ((stats.ratingCounts[5] + stats.ratingCounts[4]) /
                        stats.totalResponses) *
                        100
                    )}%`
                  : "—"}
              </span>
              <span className="text-xs font-medium text-emerald-700">
                rated 4 or 5 stars
              </span>
            </div>
            <p className="text-xs text-mist mt-1">Positive tournament experience</p>
          </div>
        </Card>
      </div>

      {/* 1 to 5 Distribution Bar Chart & Scope */}
      <Card className="p-6 bg-white border border-navy-100 shadow-sm rounded-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-navy-50 pb-3">
          <div>
            <h2 className="text-base font-bold text-navy-950 font-heading flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-500" />
              <span>Rating Distribution (1 to 5 Stars)</span>
            </h2>
            <p className="text-xs text-mist">
              Breakdown of participant sentiment and score distribution.
            </p>
          </div>
          {selectedEvent && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-navy-100 text-navy-800 w-fit">
              Filtering: {selectedEvent.title}
            </span>
          )}
        </div>

        {/* Pure CSS & SVG Distribution Bar Chart */}
        <div className="space-y-3 max-w-2xl py-1">
          {([5, 4, 3, 2, 1] as const).map((ratingNum) => {
            const count = stats.ratingCounts[ratingNum];
            const pct = stats.ratingPercentages[ratingNum];

            return (
              <div key={ratingNum} className="flex items-center gap-3 text-xs">
                {/* Star label */}
                <div className="w-16 flex items-center gap-1 font-bold text-navy-950 shrink-0">
                  <span>{ratingNum}</span>
                  <Star className="w-3.5 h-3.5 fill-gold-500 text-gold-500" />
                </div>

                {/* Progress bar */}
                <div className="flex-1 h-3 rounded-full bg-navy-100/70 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-gold-400 to-gold-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Stats figures */}
                <div className="w-24 text-right shrink-0 flex items-center justify-end gap-2 text-mist font-mono">
                  <span className="font-semibold text-navy-900">{pct}%</span>
                  <span className="text-[11px]">({count})</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Comments List */}
      <Card className="p-6 bg-white border border-navy-100 shadow-sm rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-navy-50 pb-3">
          <div>
            <h2 className="text-base font-bold text-navy-950 font-heading flex items-center gap-2">
              <MessageSquareQuote className="w-4 h-4 text-gold-600" />
              <span>Participant Reviews & Comments</span>
            </h2>
            <p className="text-xs text-mist">
              Direct feedback received from verified competitors.
            </p>
          </div>
          <span className="text-xs font-semibold text-mist">
            {feedbacks.length} {feedbacks.length === 1 ? "review" : "reviews"}
          </span>
        </div>

        {feedbacks.length === 0 ? (
          <div className="py-16 text-center text-mist space-y-2">
            <MessageSquareQuote className="w-10 h-10 mx-auto text-navy-200" />
            <p className="text-sm font-semibold text-navy-900">No feedback submitted yet</p>
            <p className="text-xs max-w-sm mx-auto">
              Once approved students complete competitions and submit their evaluations, their comments will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-navy-50">
            {feedbacks.map((item) => (
              <div key={item.id} className="py-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-navy-950">
                        {item.user.name}
                      </p>
                      {item.user.rollNumber && (
                        <span className="text-[11px] font-mono text-mist bg-navy-50 border border-navy-100 px-1.5 py-0.5 rounded">
                          {item.user.rollNumber}
                        </span>
                      )}
                      {item.user.department && (
                        <span className="text-[11px] text-mist hidden sm:inline">
                          • {getDepartmentLabel(item.user.department) ?? item.user.department}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/events/${item.event.slug}`}
                      className="text-xs font-medium text-gold-700 hover:text-gold-800 hover:underline inline-block mt-0.5"
                    >
                      {item.event.title}
                    </Link>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end text-gold-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= item.rating
                              ? "fill-gold-500 text-gold-500"
                              : "text-navy-200"
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-navy-900 ml-1">
                        {item.rating}.0
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-mist justify-end mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(item.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {item.comment ? (
                  <p className="text-sm text-navy-900 bg-navy-50/50 p-3 rounded-xl border border-navy-100/70 whitespace-pre-line leading-relaxed">
                    &ldquo;{item.comment}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs text-mist italic">
                    Rating submitted with no written comment.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function AdminFeedbackPage({ searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-16 bg-navy-100/50 rounded-2xl w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="h-28 bg-navy-100/50 rounded-2xl" />
            <div className="h-28 bg-navy-100/50 rounded-2xl" />
            <div className="h-28 bg-navy-100/50 rounded-2xl" />
          </div>
          <div className="h-56 bg-navy-100/50 rounded-2xl w-full" />
          <div className="h-96 bg-navy-100/50 rounded-2xl w-full" />
        </div>
      }
    >
      <AdminFeedbackContent searchParams={searchParams} />
    </Suspense>
  );
}
