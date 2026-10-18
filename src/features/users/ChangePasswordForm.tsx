"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { changePassword } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const [isPending, setIsPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setIsPending(true);
    try {
      const result = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to update password");
      } else {
        toast.success("Password changed successfully!");
        setSaved(true);
        reset();
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update password"
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-navy-100">
        <div className="w-10 h-10 rounded-2xl bg-navy-100 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-navy-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-navy-950 font-heading">
            Change Password
          </h2>
          <p className="text-xs text-mist">
            Update your password to keep your account secure.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Current Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="currentPassword"
            className="flex items-center gap-2 text-sm font-semibold text-navy-950"
          >
            <KeyRound className="w-4 h-4 text-gold-600" />
            Current Password <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              {...register("currentPassword")}
              type={showCurrent ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter current password"
              className="w-full px-4 py-2.5 rounded-xl border border-navy-200 bg-white text-navy-950 placeholder:text-mist/60 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition text-sm pr-11"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-navy-950 transition-colors p-1"
              aria-label={showCurrent ? "Hide current password" : "Show current password"}
            >
              {showCurrent ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-xs text-danger">{errors.currentPassword.message}</p>
          )}
        </div>

        {/* New Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="newPassword"
            className="flex items-center gap-2 text-sm font-semibold text-navy-950"
          >
            <Lock className="w-4 h-4 text-gold-600" />
            New Password <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <input
              id="newPassword"
              {...register("newPassword")}
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              className="w-full px-4 py-2.5 rounded-xl border border-navy-200 bg-white text-navy-950 placeholder:text-mist/60 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition text-sm pr-11"
            />
            <button
              type="button"
              onClick={() => setShowNew((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-navy-950 transition-colors p-1"
              aria-label={showNew ? "Hide new password" : "Show new password"}
            >
              {showNew ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-xs text-danger">{errors.newPassword.message}</p>
          )}
        </div>

        {/* Confirm New Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="flex items-center gap-2 text-sm font-semibold text-navy-950"
          >
            <Lock className="w-4 h-4 text-gold-600" />
            Confirm New Password <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              {...register("confirmPassword")}
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter new password"
              className="w-full px-4 py-2.5 rounded-xl border border-navy-200 bg-white text-navy-950 placeholder:text-mist/60 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition text-sm pr-11"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-navy-950 transition-colors p-1"
              aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-danger">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="gold"
          size="lg"
          className="w-full"
          loading={isPending}
          disabled={isPending}
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Password Updated!
            </>
          ) : (
            "Update Password"
          )}
        </Button>
      </form>
    </div>
  );
}
