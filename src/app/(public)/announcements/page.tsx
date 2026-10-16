import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AnnouncementsService } from "@/features/announcements/services/announcements.service";
import { formatEventDate } from "@/lib/dates";
import {
  Megaphone,
  Pin,
  ExternalLink,
  Layers,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Campus Bulletins & Announcements | Forté Arena",
  description:
    "Official notices, fixture amendments, venue schedules, and urgent competition announcements.",
};

interface AnnouncementsPageProps {
  searchParams: Promise<{ page?: string }>;
}

function AnnouncementsListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-56 bg-white border border-navy-100 rounded-2xl" />
      ))}
    </div>
  );
}

async function AnnouncementsContent({ searchParams }: AnnouncementsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10) || 1;
  const pageSize = 9;

  const { items, total, totalPages, currentPage } =
    await AnnouncementsService.getPublicAnnouncements({ page, pageSize });

  return (
    <div className="space-y-8">
      {items.length === 0 ? (
        <Card className="p-16 text-center text-mist bg-white rounded-3xl border border-navy-100 space-y-3">
          <div className="w-12 h-12 rounded-full bg-gold-50 text-gold-600 flex items-center justify-center mx-auto">
            <Megaphone className="w-6 h-6" />
          </div>
          <p className="font-heading font-bold text-lg text-navy-950">
            No Bulletins Published Yet
          </p>
          <p className="text-xs text-mist max-w-md mx-auto">
            Check back soon for schedule updates, room allocations, and festival announcements.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((a) => (
            <Card
              key={a.id}
              className={`p-6 bg-white border transition-all duration-200 rounded-2xl shadow-xs flex flex-col justify-between hover:-translate-y-1 ${
                a.pinned
                  ? "border-gold-300 ring-1 ring-gold-200/60"
                  : "border-navy-100 hover:border-gold-300/60"
              }`}
            >
              <div className="space-y-3">
                {/* Meta row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {a.pinned ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-800 bg-gold-100 px-2.5 py-0.5 rounded-full border border-gold-300">
                        <Pin className="w-3 h-3 text-gold-600" />
                        <span>Pinned</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-mist font-medium">Notice</span>
                    )}

                    {a.event && (
                      <Link
                        href={`/events/${a.event.slug}`}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-navy-800 bg-navy-50 hover:bg-navy-100 px-2 py-0.5 rounded-md border border-navy-100 transition-colors truncate max-w-[150px]"
                      >
                        <Layers className="w-3 h-3 text-navy-500" />
                        <span>{a.event.title}</span>
                      </Link>
                    )}
                  </div>

                  <span className="text-[11px] text-mist flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3" />
                    <span>{formatEventDate(a.createdAt)}</span>
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-heading text-base font-bold text-navy-950 leading-snug">
                  {a.title}
                </h3>

                {/* Body (rendered safely as plain text preserving whitespace) */}
                <p className="text-xs sm:text-sm text-ink/80 leading-relaxed whitespace-pre-line line-clamp-6">
                  {a.body}
                </p>
              </div>

              {/* Optional Link Button */}
              {a.linkUrl && a.linkLabel && (
                <div className="pt-4 border-t border-navy-50 mt-4">
                  <a
                    href={a.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-900 bg-navy-50 hover:bg-gold-50 border border-navy-200 hover:border-gold-300 px-3 py-1.5 rounded-xl transition-all"
                  >
                    <span>{a.linkLabel}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gold-600" />
                  </a>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-navy-100 text-xs font-semibold text-navy-900">
          <span>
            Showing page {currentPage} of {totalPages} ({total} notices)
          </span>

          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link href={`/announcements?page=${currentPage - 1}`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled className="gap-1 opacity-40">
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>
            )}

            {currentPage < totalPages ? (
              <Link href={`/announcements?page=${currentPage + 1}`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled className="gap-1 opacity-40">
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicAnnouncementsPage({ searchParams }: AnnouncementsPageProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-10 animate-in fade-in duration-300">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-mist hover:text-navy-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-3 border-b border-navy-100 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gold-50 text-gold-700 border border-gold-300">
          <Megaphone className="w-3.5 h-3.5 text-gold-600" />
          <span>Official Bulletins</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-navy-950">
          Campus Announcements & Notices
        </h1>
        <p className="text-sm sm:text-base text-mist max-w-2xl leading-relaxed">
          Stay up to date with real-time schedule modifications, venue directions, competition guidelines, and organizers&apos; official announcements.
        </p>
      </div>

      {/* Main Content inside Suspense */}
      <Suspense fallback={<AnnouncementsListSkeleton />}>
        <AnnouncementsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
