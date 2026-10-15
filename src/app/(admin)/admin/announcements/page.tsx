import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Megaphone,
  BellRing,
  Pin,
  Mail,
  Clock,
  ArrowRight,
  Send,
  Radio,
} from "lucide-react";

export const metadata = {
  title: "Announcements Hub | Organizer Admin Console",
  description: "Broadcast campus competition notices, rule updates, and urgent alerts.",
};

async function AnnouncementsComingSoonContent() {
  await requireRole(["ORGANIZER", "ADMIN"], "/login?next=/admin/announcements");

  const UPCOMING_CAPABILITIES = [
    {
      icon: Pin,
      title: "Pinned Priority Notices",
      description:
        "Highlight mandatory orientation times, reporting venues, and weather changes at the very top of the live feed.",
    },
    {
      icon: Radio,
      title: "Targeted Audience Broadcasts",
      description:
        "Send announcements globally across the campus or target participants enrolled in specific competitions.",
    },
    {
      icon: BellRing,
      title: "Student Dashboard Push Alerts",
      description:
        "Deliver instant alert banners directly onto student registered dashboards without relying on spam-prone email.",
    },
    {
      icon: Mail,
      title: "Automated Email Digest",
      description:
        "Optionally trigger immediate email notifications for urgent rule modifications or fixture schedule adjustments.",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-navy-100/70">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gold-600 bg-gold-100/90 border border-gold-300 px-2.5 py-0.5 rounded-full">
              MODULE IN STAGING
            </span>
            <span className="text-xs text-mist font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Coming in Next Release
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-heading">
            Announcements & Campus Bulletins
          </h1>
          <p className="text-sm text-mist mt-1 max-w-2xl">
            Broadcast competition notices, venue amendments, rule updates, and emergency alerts to student participants.
          </p>
        </div>

        <Link href="/admin">
          <Button variant="outline" size="sm" className="font-semibold shadow-xs">
            <span>Back to Overview</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* Hero Showcase Card */}
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-white via-navy-50/30 to-gold-50/20 border border-navy-100 shadow-sm rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-navy-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-navy-900 text-gold-400 flex items-center justify-center shadow-md">
            <Megaphone className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-navy-950 font-heading">
              Real-Time Campus Communications Hub
            </h2>
            <p className="text-xs sm:text-sm text-mist leading-relaxed">
              Maintain transparent communication with all teams and solo competitors. The upcoming bulletin management interface will allow draft composition, scheduled publish times, and live status banners across the platform.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-navy-100 text-navy-900 text-xs font-semibold shadow-2xs">
              <Send className="w-4 h-4 text-emerald-600" />
              <span>Multi-Channel Dispatch</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-navy-100 text-navy-900 text-xs font-semibold shadow-2xs">
              <Pin className="w-4 h-4 text-amber-600" />
              <span>Priority Pinning</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Feature Grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-mist mb-4 font-heading">
          Feature Blueprint
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {UPCOMING_CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <Card
                key={cap.title}
                className="p-5 bg-white border border-navy-100 shadow-xs rounded-2xl space-y-2 hover:border-gold-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center text-navy-800 shrink-0">
                    <Icon className="w-4 h-4 text-navy-700" />
                  </div>
                  <h4 className="font-heading font-bold text-sm text-navy-950">
                    {cap.title}
                  </h4>
                </div>
                <p className="text-xs text-mist leading-relaxed pl-12">
                  {cap.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminAnnouncementsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-20 bg-navy-100/50 rounded-2xl w-full" />
          <div className="h-64 bg-navy-100/50 rounded-3xl w-full" />
        </div>
      }
    >
      <AnnouncementsComingSoonContent />
    </Suspense>
  );
}
