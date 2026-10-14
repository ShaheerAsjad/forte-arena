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
} from "lucide-react";

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

export function RegisterStepper({ event, profile }: RegisterStepperProps) {
  const isTeam = event.participationType === "TEAM";
  const steps = isTeam ? TEAM_STEPS : INDIVIDUAL_STEPS;
  const totalSteps = steps.length;

  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [successRegistrationId, setSuccessRegistrationId] = useState<
    string | null
  >(null);

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

  if (successRegistrationId) {
    return <SuccessScreen registrationId={successRegistrationId} eventTitle={event.title} />;
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
        setSuccessRegistrationId(result.data.registrationId);
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
        setSuccessRegistrationId(result.data.registrationId);
      } else {
        toast.error(result.error);
      }
    });
  };

  // ────────────── Step 0: Confirm Profile ──────────────
  if (step === 0) {
    return (
      <div className="space-y-6">
        <StepIndicator steps={steps} currentStep={0} />
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-navy-950">Your Profile</h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: "Name", value: profile.name },
              { label: "Email", value: profile.email },
              { label: "Roll Number", value: profile.rollNumber },
              { label: "Department", value: profile.department },
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

function SuccessScreen({
  registrationId,
  eventTitle,
}: {
  registrationId: string;
  eventTitle: string;
}) {
  return (
    <div className="text-center space-y-6 py-6">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-success-bg flex items-center justify-center">
          <PartyPopper className="w-10 h-10 text-success" />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-navy-950 font-heading">
          You&apos;re Registered!
        </h2>
        <p className="text-mist text-sm max-w-xs mx-auto">
          Your registration for <span className="font-semibold text-navy-950">{eventTitle}</span> is submitted and pending organiser review.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Link
          href={`/dashboard/${registrationId}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-navy-900 text-ivory text-sm font-semibold hover:bg-navy-800 transition"
        >
          <LayoutDashboard className="w-4 h-4" />
          View Registration
        </Link>
        <Link
          href="/dashboard"
          className="text-sm text-mist hover:text-navy-950 transition font-medium"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
