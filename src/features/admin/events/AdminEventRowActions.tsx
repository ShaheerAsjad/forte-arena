"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markEventCompletedAction } from "../events.actions";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  Users,
  Edit,
  ExternalLink,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type { EventStatus } from "@/lib/db-types";

interface AdminEventRowActionsProps {
  event: {
    id: string;
    slug: string;
    status: EventStatus;
  };
  effectiveStatus: EventStatus;
}

export function AdminEventRowActions({
  event,
  effectiveStatus,
}: AdminEventRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleMarkCompleted = () => {
    startTransition(async () => {
      try {
        const res = await markEventCompletedAction(event.id);
        if (res.ok) {
          toast.success("Event marked as COMPLETED successfully!");
          router.refresh();
        } else {
          toast.error(res.error);
        }
      } catch {
        toast.error("Failed to mark event as completed.");
      }
    });
  };

  const canMarkCompleted =
    effectiveStatus !== "COMPLETED" && event.status !== "CANCELLED";

  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap">
      {/* Mark Completed Button */}
      {canMarkCompleted && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={handleMarkCompleted}
          className="text-xs py-1 border-gold-300 text-gold-700 hover:bg-gold-50/80 font-semibold"
          title="Mark tournament as completed"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-gold-600" />
          )}
          <span>Complete</span>
        </Button>
      )}

      {/* Registrations Review Link */}
      <Link
        href={`/admin/events/${event.id}/registrations`}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-navy-50 hover:bg-navy-100 text-navy-900 transition"
        title="Manage registrations"
      >
        <Users className="w-3.5 h-3.5 text-gold-600" />
        <span>Registrations</span>
      </Link>

      {/* Edit Event Link */}
      <Link
        href={`/admin/events/${event.id}/edit`}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-navy-200 hover:bg-navy-50 text-navy-900 transition"
        title="Edit event"
      >
        <Edit className="w-3.5 h-3.5 text-mist" />
        <span>Edit</span>
      </Link>

      {/* View Public Page Link */}
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
  );
}
