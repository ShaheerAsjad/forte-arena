"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { registerIndividual, registerTeam } from "@/features/registrations/registrations.actions";
import { Button } from "@/components/ui/Button";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  User,
  AlertCircle,
  PartyPopper,
  LayoutDashboard,
  Clock,
} from "lucide-react";
import { getDepartmentLabel } from "@/features/profile/academic.config";

// ────────────────────────────────────────────────────────────────
// Types & Schemas
// ────────────────────────────────────────────────────────────────

interface EventInfo {
  id: string;
  slug: string;
  title: string;
  participationType: "INDIVIDUAL" | "TEAM";
  minTeamSize: number;
  maxTeamSize: number;
  venue: string;
  registrationDeadline: Date;
}

interface UserProfile {
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  phone: string;
}

interface RegisterStepperProps {
  event: EventInfo;
  profile: UserProfile;
  isReapplication?: boolean;
  existingRegistration?: { id: string; status: string } | null;
}

const teamMemberSchema = z.object({
  fullName: z.string().min(2, "Full name required").max(100),
  rollNumber: z.string().min(1, "Roll number required").max(30),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
});

const teamFormSchema = z.object({
  teamName: z.string().min(2, "Team name must be at least 2 chars").max(60),
  members: z.array(teamMemberSchema).min(1),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

// ────────────────────────────────────────────────────────────────
// Step indicators
// ────────────────────────────────────────────────────────────────

const INDIVIDUAL_STEPS = ["Confirm Profile", "Review & Submit"];
const TEAM_STEPS = ["Confirm Profile", "Team Details", "Review & Submit"];

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <div className="flex items-center gap-0 w-full mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < currentStep
                  ? "bg-success text-white"
                  : i === currentStep
                  ? "bg-navy-900 text-ivory ring-2 ring-gold-400 ring-offset-2"
                  : "bg-navy-100 text-mist"
              }`}
            >
              {i < currentStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-[10px] font-semibold text-center leading-tight ${
                i === currentStep ? "text-navy-950" : "text-mist"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 flex-1 mx-1 mt-[-12px] transition-all ${
                i < currentStep ? "bg-success" : "bg-navy-100"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main stepper
// ────────────────────────────────────────────────────────────────

export function RegisterStepper({
  event,
  profile,
  isReapplication = false,
  existingRegistration = null,
}: RegisterStepperProps) {
  const isTeam = event.participationType === "TEAM";
  const steps = isTeam ? TEAM_STEPS : INDIVIDUAL_STEPS;
  const totalSteps = steps.length;

  interface SubmittedSummary {
    registrationId: string;
    participationType: "INDIVIDUAL" | "TEAM";
    teamName?: string;
    members?: Array<{ fullName: string; rollNumber: string; email?: string; phone?: string }>;
  }

  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [submittedSummary, setSubmittedSummary] = useState<SubmittedSummary | null>(null);

  const header = (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-wider text-mist mb-1">
        Registering for
      </p>
      <h1 className="text-xl font-bold text-navy-950 font-heading">
        {event.title}
      </h1>
    </div>
  );

  const reapplicationBanner = isReapplication ? (
    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5">
      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">You withdrew from this once before.</p>
        <p className="text-xs text-amber-700/90 mt-0.5">
          You are now submitting your second and final registration attempt for this competition.
        </p>
      </div>
    </div>
  ) : null;

  // Team form
  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      teamName: "",
      members: [{ fullName: "", rollNumber: "", email: "", phone: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "members",
  });

  const maxAdditional = event.maxTeamSize - 1; // leader is 1

  if (submittedSummary) {
    return (
      <SuccessScreen
        summary={submittedSummary}
        event={event}
        profile={profile}
      />
    );
  }

  if (existingRegistration && existingRegistration.status !== "WITHDRAWN") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4 py-2">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-navy-950 font-heading">
              Already Registered
            </h2>
            <p className="text-mist text-sm max-w-sm mx-auto">
              You already have an active registration ({existingRegistration.status}) for{" "}
              <span className="font-semibold text-navy-950">{event.title}</span>.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gold-400 text-navy-950 text-sm font-bold hover:bg-gold-300 transition shadow-sm"
            >
              <LayoutDashboard className="w-4 h-4" />
              Go to Dashboard
            </Link>
            <Link
              href={`/dashboard/${existingRegistration.id}`}
              className="text-xs text-mist hover:text-navy-950 font-medium transition py-1 text-center"
            >
              View Registration Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (step < totalSteps - 1) setStep((s) => s + 1);
  };
  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const submitIndividual = () => {
    startTransition(async () => {
      const result = await registerIndividual({ eventSlug: event.slug });
      if (result.ok) {
        setSubmittedSummary({
          registrationId: result.data.registrationId,
          participationType: "INDIVIDUAL",
        });
      } else {
        toast.error(result.error);
      }
    });
  };

  const submitTeam = (values: TeamFormValues) => {
    startTransition(async () => {
      const result = await registerTeam({
        eventSlug: event.slug,
        teamName: values.teamName,
        members: values.members,
      });
      if (result.ok) {
        setSubmittedSummary({
          registrationId: result.data.registrationId,
          participationType: "TEAM",
          teamName: values.teamName,
          members: values.members,
        });
      } else {
        toast.error(result.error);
      }
    });
  };

  // ────────────── Step 0: Confirm Profile ──────────────
  if (step === 0) {
    return (
      <div className="space-y-6">
        {header}
        {reapplicationBanner}
        <StepIndicator steps={steps} currentStep={0} />
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-navy-950">Your Profile</h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: "Name", value: profile.name },
              { label: "Email", value: profile.email },
              { label: "Roll Number", value: profile.rollNumber },
              { label: "Department", value: getDepartmentLabel(profile.department) ?? profile.department },
              { label: "Phone", value: profile.phone },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-navy-50 border border-navy-100"
              >
                <span className="text-sm font-medium text-mist">{label}</span>
                <span className="text-sm font-semibold text-navy-950">{value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-mist">
            This information will be shown to event organisers.{" "}
            <Link
              href="/profile"
              className="text-navy-700 font-semibold underline"
            >
              Edit Profile
            </Link>
          </p>
        </div>
        <Button
          variant="gold"
          size="lg"
          className="w-full"
          onClick={handleNext}
        >
          Looks Good
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  // ────────────── Step 1 (team only): Team Details ──────────────
  if (isTeam && step === 1) {
    return (
      <div className="space-y-6">
        {header}
        {reapplicationBanner}
        <StepIndicator steps={steps} currentStep={1} />
        <div className="space-y-5">
          <h2 className="text-lg font-bold text-navy-950">Team Details</h2>
          <p className="text-sm text-mist">
            You are the team leader. Add{" "}
            {event.minTeamSize - 1}–{maxAdditional} additional member(s).
          </p>

          {/* Team Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-navy-950">
              Team Name <span className="text-danger">*</span>
            </label>
            <input
              {...register("teamName")}
              placeholder="e.g. Team Phoenix"
              className="w-full px-4 py-2.5 rounded-xl border border-navy-200 bg-white text-navy-950 placeholder:text-mist/60 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm"
            />
            {errors.teamName && (
              <p className="text-xs text-danger">{errors.teamName.message}</p>
            )}
          </div>

          {/* Leader (read-only) */}
          <div className="p-3 rounded-xl bg-gold-50 border border-gold-200">
            <p className="text-xs font-bold uppercase tracking-wider text-gold-700 mb-1">
              Team Leader (You)
            </p>
            <p className="font-semibold text-navy-950">{profile.name}</p>
            <p className="text-sm text-mist">
              {profile.rollNumber} · {profile.department}
            </p>
          </div>

          {/* Members */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-navy-950">
              Additional Members
            </p>
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="p-4 rounded-xl border border-navy-100 bg-navy-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-700">
                    Member {idx + 2}
                  </span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="text-danger hover:text-danger/70 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      {...register(`members.${idx}.fullName`)}
                      placeholder="Full Name *"
                      className="w-full px-3 py-2 rounded-lg border border-navy-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                    />
                    {errors.members?.[idx]?.fullName && (
                      <p className="text-[10px] text-danger mt-0.5">
                        {errors.members[idx]?.fullName?.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      {...register(`members.${idx}.rollNumber`)}
                      placeholder="Roll Number *"
                      className="w-full px-3 py-2 rounded-lg border border-navy-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                    />
                    {errors.members?.[idx]?.rollNumber && (
                      <p className="text-[10px] text-danger mt-0.5">
                        {errors.members[idx]?.rollNumber?.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      {...register(`members.${idx}.email`)}
                      placeholder="Email (optional)"
                      type="email"
                      className="w-full px-3 py-2 rounded-lg border border-navy-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                    />
                  </div>
                  <div>
                    <input
                      {...register(`members.${idx}.phone`)}
                      placeholder="Phone (optional)"
                      className="w-full px-3 py-2 rounded-lg border border-navy-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                    />
                  </div>
                </div>
              </div>
            ))}

            {fields.length < maxAdditional && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ fullName: "", rollNumber: "", email: "", phone: "" })
                }
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Member
              </Button>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            variant="gold"
            onClick={handleSubmit(() => handleNext())}
            className="flex-1"
          >
            Review
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ────────────── Final Step: Review & Submit ──────────────
  const reviewStepIndex = isTeam ? 2 : 1;
  if (step === reviewStepIndex) {
    const teamValues = isTeam ? getValues() : null;
    return (
      <div className="space-y-6">
        {header}
        {reapplicationBanner}
        <StepIndicator steps={steps} currentStep={reviewStepIndex} />
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-navy-950">Review & Submit</h2>

          {/* Event Summary */}
          <div className="p-4 rounded-xl bg-navy-950 text-ivory space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-gold-400">
              {isTeam ? "Team" : "Individual"} Registration
            </p>
            <p className="font-bold text-lg">{event.title}</p>
            <p className="text-sm text-ivory/70">{event.venue}</p>
          </div>

          {/* Profile summary */}
          <div className="p-4 rounded-xl bg-navy-50 border border-navy-100 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mist mb-2">
              <User className="w-3.5 h-3.5" />
              Your Info
            </div>
            <p className="font-semibold text-navy-950">{profile.name}</p>
            <p className="text-sm text-mist">
              {profile.rollNumber} · {profile.department}
            </p>
          </div>

          {/* Team summary */}
          {isTeam && teamValues && (
            <div className="p-4 rounded-xl bg-navy-50 border border-navy-100 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mist mb-2">
                <Users className="w-3.5 h-3.5" />
                Team: {teamValues.teamName}
              </div>
              {teamValues.members.map((m, i) => (
                <div key={i} className="text-sm text-navy-950">
                  <span className="font-semibold">{m.fullName}</span>{" "}
                  <span className="text-mist">({m.rollNumber})</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-xl bg-info-bg border border-info/20">
            <AlertCircle className="w-4 h-4 text-info shrink-0 mt-0.5" />
            <p className="text-xs text-info font-medium">
              Your registration will be reviewed by an organiser. You&apos;ll
              see the status in your dashboard.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {isTeam ? (
            <Button
              variant="gold"
              loading={isPending}
              onClick={handleSubmit(submitTeam)}
              className="flex-1"
            >
              Submit Registration
            </Button>
          ) : (
            <Button
              variant="gold"
              loading={isPending}
              onClick={submitIndividual}
              className="flex-1"
            >
              Submit Registration
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ────────────────────────────────────────────────────────────────
// Success Screen
// ────────────────────────────────────────────────────────────────

interface SuccessSummary {
  registrationId: string;
  participationType: "INDIVIDUAL" | "TEAM";
  teamName?: string;
  members?: Array<{ fullName: string; rollNumber: string; email?: string; phone?: string }>;
}

function SuccessScreen({
  summary,
  event,
  profile,
}: {
  summary: SuccessSummary;
  event: EventInfo;
  profile: UserProfile;
}) {
  return (
    <div className="space-y-6 py-2">
      {/* Celebration Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-sm">
          <PartyPopper className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Review
          </span>
          <h2 className="text-2xl font-bold text-navy-950 font-heading pt-1">
            Registration Submitted!
          </h2>
          <p className="text-mist text-sm max-w-sm mx-auto">
            Your registration for{" "}
            <span className="font-semibold text-navy-950">{event.title}</span> has
            been received and is now awaiting organiser review.
          </p>
        </div>
      </div>

      {/* Submitted Details Summary Card */}
      <div className="rounded-2xl border border-navy-100 bg-navy-50/50 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-navy-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-mist">
              Event
            </p>
            <p className="font-bold text-navy-950 text-base">{event.title}</p>
            <p className="text-xs text-mist">{event.venue}</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-navy-200 text-navy-800">
            {summary.participationType === "TEAM" ? "Team Registration" : "Individual (Solo)"}
          </span>
        </div>

        {/* Profile Info */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-mist flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {summary.participationType === "TEAM" ? "Team Leader (You)" : "Participant"}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-xl border border-navy-100">
            <div>
              <span className="text-mist block text-[10px]">Name</span>
              <span className="font-semibold text-navy-950">{profile.name}</span>
            </div>
            <div>
              <span className="text-mist block text-[10px]">Roll Number</span>
              <span className="font-semibold text-navy-950">{profile.rollNumber}</span>
            </div>
            <div>
              <span className="text-mist block text-[10px]">Department</span>
              <span className="font-semibold text-navy-950">{profile.department}</span>
            </div>
            <div>
              <span className="text-mist block text-[10px]">Phone</span>
              <span className="font-semibold text-navy-950">{profile.phone}</span>
            </div>
          </div>
        </div>

        {/* Team Members if applicable */}
        {summary.participationType === "TEAM" && summary.teamName && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-mist flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Team: {summary.teamName}
              </p>
              <span className="text-xs text-mist font-medium">
                {1 + (summary.members?.length || 0)} members
              </span>
            </div>
            <div className="space-y-1.5 bg-white p-3 rounded-xl border border-navy-100">
              <div className="text-xs flex items-center justify-between py-1 border-b border-navy-50">
                <span className="font-medium text-navy-950">{profile.name} (Leader)</span>
                <span className="text-mist text-[11px]">{profile.rollNumber}</span>
              </div>
              {summary.members?.map((m, idx) => (
                <div key={idx} className="text-xs flex items-center justify-between py-1">
                  <span className="font-medium text-navy-950">{m.fullName}</span>
                  <span className="text-mist text-[11px]">{m.rollNumber}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Prominent Go to Dashboard Button & View Details */}
      <div className="space-y-2.5 pt-1">
        <Link href="/dashboard" className="block w-full">
          <Button
            variant="gold"
            size="lg"
            className="w-full py-5 text-sm font-bold shadow-md shadow-gold-500/20"
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
        </Link>
        <Link
          href={`/dashboard/${summary.registrationId}`}
          className="block w-full"
        >
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs text-mist hover:text-navy-950"
          >
            View Registration Details
          </Button>
        </Link>
      </div>
    </div>
  );
}
