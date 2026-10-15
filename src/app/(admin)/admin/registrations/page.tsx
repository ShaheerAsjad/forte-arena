import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ArrowRight,
  Download,
} from "lucide-react";

export const metadata = {
  title: "Registrations Hub | Admin Console",
};

async function RegistrationsHubContent() {
  await requireRole(["ORGANIZER", "ADMIN"], "/login?next=/admin/registrations");

  const events = await prisma.event.findMany({
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      participationType: true,
      maxParticipants: true,
      registrations: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 font-heading">
          Registrations Hub
        </h1>
        <p className="text-sm text-mist mt-0.5">
          Select a competition below to review applications, approve teams, and export rosters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {events.map((event) => {
          const total = event.registrations.length;
          const approved = event.registrations.filter((r) => r.status === "APPROVED").length;
          const pending = event.registrations.filter((r) => r.status === "PENDING").length;

          return (
            <Card
              key={event.id}
              className="p-6 bg-white border border-navy-100 shadow-sm rounded-2xl flex flex-col justify-between space-y-4 hover:border-gold-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600 bg-gold-100/80 px-2 py-0.5 rounded-full border border-gold-300">
                    {event.category}
                  </span>
                  <span className="text-xs font-semibold text-mist">
                    {event.participationType}
                  </span>
                </div>
                <h3 className="font-heading text-lg font-bold text-navy-950">
                  {event.title}
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 px-3.5 rounded-xl bg-navy-50/60 border border-navy-100/60 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-mist uppercase">Total</p>
                  <p className="text-base font-bold text-navy-950">{total}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-800 uppercase">Approved</p>
                  <p className="text-base font-bold text-emerald-700">
                    {approved}
                    {event.maxParticipants && (
                      <span className="text-xs font-normal text-mist">
                        /{event.maxParticipants}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-800 uppercase">Pending</p>
                  <p className="text-base font-bold text-amber-900">{pending}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-navy-50">
                <a
                  href={`/api/admin/events/${event.id}/export`}
                  download
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-mist hover:text-navy-900 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </a>
                <Link href={`/admin/events/${event.id}/registrations`}>
                  <Button variant="gold" size="sm" className="font-semibold shadow-xs">
                    <span>Review Applications</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminRegistrationsHubPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-16 bg-navy-100/50 rounded-2xl w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="h-44 bg-navy-100/50 rounded-2xl" />
            <div className="h-44 bg-navy-100/50 rounded-2xl" />
          </div>
        </div>
      }
    >
      <RegistrationsHubContent />
    </Suspense>
  );
}
