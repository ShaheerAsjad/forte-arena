import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { ResultsRepository } from "@/features/results/repositories/results.repository";
import { AdminEventResultsManager } from "@/features/admin/results/AdminEventResultsManager";

interface AdminEventResultsPageProps {
  params: Promise<{ eventId: string }>;
}

export const metadata = {
  title: "Manage Standings & Awards | Organizer Console",
  description: "Record participant standings, award podium places, and publish tournament results.",
};

async function AdminEventResultsContent({ params }: AdminEventResultsPageProps) {
  const { eventId } = await params;
  await requireRole(["ORGANIZER", "ADMIN"], `/login?next=/admin/results/${eventId}`);

  const data = await ResultsRepository.getAdminEventResultsData(eventId);
  if (!data || !data.event) {
    notFound();
  }

  return (
    <AdminEventResultsManager
      event={data.event}
      initialResults={data.results}
      approvedRegistrations={data.approvedRegistrations}
    />
  );
}

export default function AdminEventResultsPage({ params }: AdminEventResultsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-6 w-36 bg-navy-100/50 rounded-md" />
          <div className="h-28 bg-navy-100/50 rounded-3xl w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 h-96 bg-navy-100/50 rounded-2xl" />
            <div className="lg:col-span-7 h-96 bg-navy-100/50 rounded-2xl" />
          </div>
        </div>
      }
    >
      <AdminEventResultsContent params={params} />
    </Suspense>
  );
}
