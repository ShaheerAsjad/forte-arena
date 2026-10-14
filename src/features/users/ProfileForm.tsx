"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { updateProfile } from "@/features/users/users.actions";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, User, Phone, BookOpen, AlertCircle } from "lucide-react";

const profileSchema = z.object({
  rollNumber: z
    .string()
    .min(2, "Roll number must be at least 2 characters")
    .max(30)
    .regex(/^[A-Za-z0-9\-\/]+$/, "Roll number contains invalid characters"),
  department: z
    .string()
    .min(2, "Department must be at least 2 characters")
    .max(100),
  phone: z
    .string()
    .min(7, "Phone number must be at least 7 digits")
    .max(20)
    .regex(/^[\+\d\s\-()]+$/, "Invalid phone number format"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialValues: {
    rollNumber: string | null;
    department: string | null;
    phone: string | null;
    name: string;
    email: string;
  };
}

export function ProfileForm({ initialValues }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      rollNumber: initialValues.rollNumber ?? "",
      department: initialValues.department ?? "",
      phone: initialValues.phone ?? "",
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    startTransition(async () => {
      const result = await updateProfile(values);
      if (result.ok) {
        toast.success("Profile updated successfully!");
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        toast.error(result.error);
      }
    });
  };

  const isComplete =
    !!initialValues.rollNumber &&
    !!initialValues.department &&
    !!initialValues.phone;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Completeness Banner */}
      {!isComplete && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-warning-bg border border-warning/30">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-warning">
            Your profile is incomplete. Please fill in all fields below before
            you can register for events.
          </p>
        </div>
      )}

      {isComplete && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-success-bg border border-success/20">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <p className="text-sm font-semibold text-success">
            Profile complete — you can register for events.
          </p>
        </div>
      )}

      {/* User Info (read-only) */}
      <div className="p-4 rounded-xl bg-navy-50 border border-navy-100 space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-mist">
          Account
        </p>
        <p className="font-semibold text-navy-950">{initialValues.name}</p>
        <p className="text-sm text-mist">{initialValues.email}</p>
      </div>

      {/* Roll Number */}
      <div className="space-y-1.5">
        <label
          htmlFor="rollNumber"
          className="flex items-center gap-2 text-sm font-semibold text-navy-950"
        >
          <User className="w-4 h-4 text-gold-600" />
          Roll Number <span className="text-danger">*</span>
        </label>
        <input
          id="rollNumber"
          {...register("rollNumber")}
          placeholder="e.g. 2021-CS-001"
          className="w-full px-4 py-2.5 rounded-xl border border-navy-200 bg-white text-navy-950 placeholder:text-mist/60 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition text-sm"
        />
        {errors.rollNumber && (
          <p className="text-xs text-danger">{errors.rollNumber.message}</p>
        )}
      </div>

      {/* Department */}
      <div className="space-y-1.5">
        <label
          htmlFor="department"
          className="flex items-center gap-2 text-sm font-semibold text-navy-950"
        >
          <BookOpen className="w-4 h-4 text-gold-600" />
          Department <span className="text-danger">*</span>
        </label>
        <input
          id="department"
          {...register("department")}
          placeholder="e.g. Computer Science"
          className="w-full px-4 py-2.5 rounded-xl border border-navy-200 bg-white text-navy-950 placeholder:text-mist/60 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition text-sm"
        />
        {errors.department && (
          <p className="text-xs text-danger">{errors.department.message}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <label
          htmlFor="phone"
          className="flex items-center gap-2 text-sm font-semibold text-navy-950"
        >
          <Phone className="w-4 h-4 text-gold-600" />
          Phone Number <span className="text-danger">*</span>
        </label>
        <input
          id="phone"
          {...register("phone")}
          type="tel"
          placeholder="e.g. +92 300 1234567"
          className="w-full px-4 py-2.5 rounded-xl border border-navy-200 bg-white text-navy-950 placeholder:text-mist/60 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition text-sm"
        />
        {errors.phone && (
          <p className="text-xs text-danger">{errors.phone.message}</p>
        )}
      </div>

      <Button
        type="submit"
        variant="gold"
        size="lg"
        className="w-full"
        loading={isPending}
        disabled={!isDirty && isComplete}
      >
        {saved ? (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" /> Saved!
          </>
        ) : (
          "Save Profile"
        )}
      </Button>
    </form>
  );
}
