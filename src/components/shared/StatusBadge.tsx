import React from "react";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { CheckCircle2, Clock, XCircle, AlertCircle, Sparkles } from "lucide-react";

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
  const normalized = status.toUpperCase();

  const getVariantAndIcon = (): {
    variant: BadgeProps["variant"];
    label: string;
    icon: React.ReactNode;
  } => {
    switch (normalized) {
      case "REGISTRATION OPEN":
        return {
          variant: "success",
          label: "Registration Open",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
      case "CLOSING SOON":
        return {
          variant: "warning",
          label: "Closing Soon",
          icon: <Clock className="w-3.5 h-3.5" />,
        };
      case "UPCOMING":
        return {
          variant: "info",
          label: "Upcoming",
          icon: <Sparkles className="w-3.5 h-3.5" />,
        };
      case "APPROVED":
        return {
          variant: "success",
          label: "Approved",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
      case "PENDING":
        return {
          variant: "warning",
          label: "Pending Review",
          icon: <Clock className="w-3.5 h-3.5" />,
        };
      case "REJECTED":
        return {
          variant: "danger",
          label: "Rejected",
          icon: <XCircle className="w-3.5 h-3.5" />,
        };
      case "WITHDRAWN":
        return {
          variant: "outline",
          label: "Withdrawn",
          icon: <AlertCircle className="w-3.5 h-3.5" />,
        };
      case "PUBLISHED":
        return {
          variant: "navy",
          label: "Live / Open",
          icon: <Sparkles className="w-3.5 h-3.5 text-gold-400" />,
        };
      case "COMPLETED":
        return {
          variant: "gold",
          label: "Completed",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
      case "CLOSED":
        return {
          variant: "outline",
          label: "Closed",
          icon: <Clock className="w-3.5 h-3.5" />,
        };
      case "DRAFT":
        return {
          variant: "outline",
          label: "Draft",
          icon: <AlertCircle className="w-3.5 h-3.5" />,
        };
      case "CANCELLED":
        return {
          variant: "danger",
          label: "Cancelled",
          icon: <XCircle className="w-3.5 h-3.5" />,
        };
      default:
        return {
          variant: "default",
          label: status,
          icon: null,
        };
    }
  };

  const { variant, label, icon } = getVariantAndIcon();

  return (
    <Badge variant={variant} size={size} className={className}>
      {icon}
      <span>{label}</span>
    </Badge>
  );
}
