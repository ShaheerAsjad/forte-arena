import React from "react";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, Clock, XCircle, AlertCircle, Sparkles } from "lucide-react";
import { getStatusMeta } from "@/features/events/events.derived";
import { cn } from "@/lib/utils";

export type EventOrRegistrationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | "DRAFT"
  | "PUBLISHED"
  | "CLOSED"
  | "COMPLETED"
  | "CANCELLED";

interface StatusBadgeProps {
  status: EventOrRegistrationStatus | string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const meta = getStatusMeta(status);
  const normalized = (status || "").trim().toUpperCase();

  const getIcon = (): React.ReactNode => {
    switch (normalized) {
      case "REGISTRATION OPEN":
      case "APPROVED":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "CLOSING SOON":
      case "PENDING":
      case "CLOSED":
        return <Clock className="w-3.5 h-3.5" />;
      case "UPCOMING":
        return <Sparkles className="w-3.5 h-3.5" />;
      case "PUBLISHED":
        return <Sparkles className="w-3.5 h-3.5 text-gold-400" />;
      case "COMPLETED":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "REJECTED":
      case "CANCELLED":
        return <XCircle className="w-3.5 h-3.5" />;
      case "WITHDRAWN":
      case "DRAFT":
        return <AlertCircle className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  return (
    <Badge
      variant={meta.variant}
      size={size}
      className={cn(meta.className, className)}
    >
      {getIcon()}
      <span>{meta.label}</span>
    </Badge>
  );
}
