"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { withdrawRegistration } from "@/features/registrations/registrations.actions";
import { Button } from "@/components/ui/Button";
import { LogOut } from "lucide-react";
import type { RegistrationStatus } from "@/lib/db-types";

interface WithdrawButtonProps {
  registrationId: string;
  status: RegistrationStatus;
  registrationDeadline: Date;
}

export function WithdrawButton({
  registrationId,
  status,
  registrationDeadline,
}: WithdrawButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const canWithdraw =
    (status === "PENDING" || status === "APPROVED") &&
    new Date() <= registrationDeadline;

  if (!canWithdraw) return null;

  const handleWithdraw = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await withdrawRegistration({ registrationId });
      if (result.ok) {
        toast.success("Registration withdrawn.");
        router.refresh();
      } else {
        toast.error(result.error);
        setConfirming(false);
      }
    });
  };

  return (
    <Button
      variant={confirming ? "danger" : "outline"}
      size="sm"
      loading={isPending}
      onClick={handleWithdraw}
      onBlur={() => setConfirming(false)}
      id={`withdraw-${registrationId}`}
    >
      <LogOut className="w-3.5 h-3.5 mr-1.5" />
      {confirming ? "Confirm Withdraw?" : "Withdraw"}
    </Button>
  );
}
