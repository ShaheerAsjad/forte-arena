"use client";

import { useState, useTransition, useId } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  eventBaseSchema,
  type EventFormValues,
} from "../events.schemas";
import {
  createEventAction,
  updateEventAction,
  deleteEventAction,
  cancelEventAction,
} from "../events.actions";
import { uploadPosterAction } from "../poster.actions";
import { slugify } from "../admin.utils";
import { decorateEvent, type EventCardItem } from "@/features/events/events.derived";
import { EventCard } from "@/components/shared/EventCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { toast } from "sonner";
import {
  Upload,
  Calendar,
  Sparkles,
  Trash2,
  AlertTriangle,
  Ban,
  Eye,
  Loader2,
  X,
} from "lucide-react";

interface EventFormProps {
  initialData?: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    description: string;
    rules: string;
    eligibility: string;
    prizes: string;
    venue: string;
    category: "TECHNICAL" | "SPORTS" | "CULTURAL" | "ACADEMIC" | "GAMING" | "OTHER";
    status: "DRAFT" | "PUBLISHED" | "CLOSED" | "COMPLETED" | "CANCELLED";
    participationType: "INDIVIDUAL" | "TEAM";
    minTeamSize: number;
    maxTeamSize: number;
    maxParticipants: number | null;
    startsAt: Date | string;
    endsAt?: Date | string | null;
    registrationDeadline: Date | string;
    posterUrl?: string | null;
    _count?: {
      registrations: number;
    };
  };
  isEdit?: boolean;
}

function formatDateForInput(date?: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function EventForm({ initialData, isEdit = false }: EventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEdit);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const fileInputId = useId();

  const registrationCount = initialData?._count?.registrations ?? 0;
  const canDelete = registrationCount === 0;

  const defaultValues: Partial<EventFormValues> = {
    title: initialData?.title ?? "",
    slug: initialData?.slug ?? "",
    summary: initialData?.summary ?? "",
    description: initialData?.description ?? "",
    rules: initialData?.rules ?? "",
    eligibility: initialData?.eligibility ?? "",
    prizes: initialData?.prizes ?? "",
    venue: initialData?.venue ?? "",
    category: initialData?.category ?? "TECHNICAL",
    status: initialData?.status ?? "DRAFT",
    participationType: initialData?.participationType ?? "INDIVIDUAL",
    minTeamSize: initialData?.minTeamSize ?? 1,
    maxTeamSize: initialData?.maxTeamSize ?? 1,
    maxParticipants: initialData?.maxParticipants ?? null,
    startsAt: formatDateForInput(initialData?.startsAt),
    endsAt: formatDateForInput(initialData?.endsAt),
    registrationDeadline: formatDateForInput(initialData?.registrationDeadline),
  };

  const [fallbackDates] = useState(() => {
    const now = Date.now();
    return {
      startsAt: new Date(now + 7 * 24 * 3600 * 1000),
      deadline: new Date(now + 5 * 24 * 3600 * 1000),
    };
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventBaseSchema),
    defaultValues: defaultValues as EventFormValues,
    mode: "onBlur",
  });

  // Watch form fields for live preview and slug sync using useWatch
  const watchedValues = useWatch({ control });
  const currentTitle = watchedValues?.title ?? defaultValues?.title ?? "";
  const currentSlug = watchedValues?.slug ?? defaultValues?.slug ?? "";
  const currentSummary = watchedValues?.summary ?? defaultValues?.summary ?? "";
  const currentCategory = watchedValues?.category ?? defaultValues?.category;
  const currentStatus = watchedValues?.status ?? defaultValues?.status;
  const currentParticipationType = watchedValues?.participationType ?? defaultValues?.participationType;
  const currentMinTeamSize = watchedValues?.minTeamSize ?? defaultValues?.minTeamSize;
  const currentMaxTeamSize = watchedValues?.maxTeamSize ?? defaultValues?.maxTeamSize;
  const currentMaxParticipants = watchedValues?.maxParticipants ?? defaultValues?.maxParticipants;
  const currentStartsAt = watchedValues?.startsAt ?? defaultValues?.startsAt;
  const currentEndsAt = watchedValues?.endsAt ?? defaultValues?.endsAt;
  const currentDeadline = watchedValues?.registrationDeadline ?? defaultValues?.registrationDeadline;
  const currentPosterUrl = watchedValues?.posterUrl ?? defaultValues?.posterUrl;
  const currentVenue = watchedValues?.venue ?? defaultValues?.venue;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue("title", val, { shouldValidate: true });
    if (!slugManuallyEdited) {
      setValue("slug", slugify(val), { shouldValidate: true });
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setValue("slug", e.target.value, { shouldValidate: true });
  };

  // Handle poster file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size exceeds 2 MB limit.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const result = await uploadPosterAction(formData);
      if (result.ok) {
        setValue("posterUrl", result.data.url, { shouldValidate: true });
        toast.success("Poster image uploaded successfully!");
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to upload poster.");
    } finally {
      setIsUploading(false);
    }
  };

  // Submit Handler
  const onSubmit = (values: EventFormValues) => {
    startTransition(async () => {
      try {
        if (isEdit && initialData?.id) {
          const res = await updateEventAction(initialData.id, values);
          if (res.ok) {
            toast.success("Event updated successfully!");
            router.push("/admin/events");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        } else {
          const res = await createEventAction(values);
          if (res.ok) {
            toast.success("Event created successfully!");
            router.push("/admin/events");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "An error occurred while saving the event."
        );
      }
    });
  };

  // Delete / Cancel Actions
  const handleDelete = () => {
    if (!initialData?.id) return;
    startTransition(async () => {
      const res = await deleteEventAction(initialData.id);
      if (res.ok) {
        toast.success("Event deleted permanently.");
        router.push("/admin/events");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleCancelEvent = () => {
    if (!initialData?.id) return;
    startTransition(async () => {
      const res = await cancelEventAction(initialData.id);
      if (res.ok) {
        toast.success("Event cancelled successfully.");
        setValue("status", "CANCELLED");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  // Construct live preview card item
  const previewItem: EventCardItem = {
    id: initialData?.id || "preview-id",
    slug: currentSlug || "preview-event",
    title: currentTitle || "Event Title Preview",
    summary:
      currentSummary ||
      "Brief overview and competitive highlights of this arena will appear here.",
    category: currentCategory || "TECHNICAL",
    status: currentStatus || "DRAFT",
    participationType: currentParticipationType || "INDIVIDUAL",
    minTeamSize: Number(currentMinTeamSize) || 1,
    maxTeamSize: Number(currentMaxTeamSize) || 1,
    maxParticipants: currentMaxParticipants ? Number(currentMaxParticipants) : null,
    startsAt: currentStartsAt
      ? new Date(currentStartsAt)
      : fallbackDates.startsAt,
    endsAt: currentEndsAt ? new Date(currentEndsAt) : null,
    registrationDeadline: currentDeadline
      ? new Date(currentDeadline)
      : fallbackDates.deadline,
    posterUrl: currentPosterUrl?.trim() || null,
    venue: currentVenue || "Campus Venue / Arena Stage",
    _count: {
      registrations: registrationCount,
    },
  };

  const previewEvent = decorateEvent(previewItem);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Form Area (7 Cols) */}
      <div className="lg:col-span-7 space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Card: Basics */}
          <Card className="p-6 bg-white border border-navy-100 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-base font-bold text-navy-950 font-heading border-b border-navy-50 pb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-500" />
              <span>Event Details</span>
            </h2>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                Event Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={currentTitle}
                onChange={handleTitleChange}
                placeholder="e.g. RoboWars: 15kg Combat Robot Championship"
                className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              {errors.title && (
                <p className="text-xs text-danger mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Slug */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                URL Slug <span className="text-danger">*</span>
              </label>
              <div className="flex items-center rounded-xl border border-navy-200 overflow-hidden bg-navy-50/50">
                <span className="px-3 text-xs text-mist border-r border-navy-200 select-none">
                  /events/
                </span>
                <input
                  type="text"
                  value={currentSlug}
                  onChange={handleSlugChange}
                  placeholder="auto-generated-slug"
                  className="w-full px-3 py-2.5 bg-transparent text-sm font-mono focus:outline-none"
                />
              </div>
              {errors.slug && (
                <p className="text-xs text-danger mt-1">{errors.slug.message}</p>
              )}
            </div>

            {/* Summary */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                Summary (Card subtitle) <span className="text-danger">*</span>
              </label>
              <textarea
                rows={2}
                {...register("summary")}
                placeholder="A compelling 1-2 sentence hook displayed on event cards."
                className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              {errors.summary && (
                <p className="text-xs text-danger mt-1">{errors.summary.message}</p>
              )}
            </div>

            {/* Category & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Category"
                  required
                  value={currentCategory}
                  onChange={(val) =>
                    setValue("category", val as EventFormValues["category"], {
                      shouldValidate: true,
                    })
                  }
                  options={[
                    { value: "TECHNICAL", label: "Technical" },
                    { value: "SPORTS", label: "Sports" },
                    { value: "CULTURAL", label: "Cultural" },
                    { value: "ACADEMIC", label: "Academic" },
                    { value: "GAMING", label: "Gaming" },
                    { value: "OTHER", label: "Other" },
                  ]}
                  error={errors.category?.message}
                />
              </div>

              <div>
                <Select
                  label="Status"
                  required
                  value={currentStatus}
                  onChange={(val) =>
                    setValue("status", val as EventFormValues["status"], {
                      shouldValidate: true,
                    })
                  }
                  options={[
                    { value: "DRAFT", label: "DRAFT (Hidden)" },
                    { value: "PUBLISHED", label: "PUBLISHED (Open for registration)" },
                    { value: "CLOSED", label: "CLOSED (Registrations stopped)" },
                    { value: "COMPLETED", label: "COMPLETED (Event ended)" },
                    { value: "CANCELLED", label: "CANCELLED (Archived)" },
                  ]}
                  error={errors.status?.message}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                Full Description <span className="text-danger">*</span>
              </label>
              <textarea
                rows={4}
                {...register("description")}
                placeholder="Comprehensive overview of the tournament structure, objectives, and schedule."
                className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              {errors.description && (
                <p className="text-xs text-danger mt-1">{errors.description.message}</p>
              )}
            </div>
          </Card>

          {/* Card: Poster Upload */}
          <Card className="p-6 bg-white border border-navy-100 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-base font-bold text-navy-950 font-heading border-b border-navy-50 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-gold-500" />
                <span>Event Poster</span>
              </span>
              <span className="text-xs font-normal text-mist">Max 2 MB (PNG, JPG, WebP)</span>
            </h2>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label
                  htmlFor={fileInputId}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-navy-900 text-ivory text-xs font-semibold hover:bg-navy-800 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                      <span>Uploading to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-gold-400" />
                      <span>Upload Poster Image</span>
                    </>
                  )}
                </label>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />

                {currentPosterUrl && (
                  <button
                    type="button"
                    onClick={() => setValue("posterUrl", "")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-danger/30 text-danger hover:bg-danger-bg text-xs font-semibold transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove Poster</span>
                  </button>
                )}
              </div>

              {/* Direct URL alternative */}
              <div>
                <label className="block text-[11px] font-semibold text-mist mb-1">
                  Or enter direct image URL:
                </label>
                <input
                  type="url"
                  {...register("posterUrl")}
                  placeholder="https://.../poster.webp"
                  className="w-full px-3.5 py-2 rounded-xl border border-navy-200 text-xs focus:outline-none focus:ring-2 focus:ring-gold-400 font-mono"
                />
                {errors.posterUrl && (
                  <p className="text-xs text-danger mt-1">{errors.posterUrl.message}</p>
                )}
              </div>

              <p className="text-[11px] text-mist italic">
                * Note: When a poster image is present, it replaces the code-made artwork on the EventCard. The category badge always stays on top.
              </p>
            </div>
          </Card>

          {/* Card: Schedule & Logistics */}
          <Card className="p-6 bg-white border border-navy-100 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-base font-bold text-navy-950 font-heading border-b border-navy-50 pb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold-500" />
              <span>Schedule & Venue</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Start Date & Time <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  {...register("startsAt")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
                {errors.startsAt && (
                  <p className="text-xs text-danger mt-1">{errors.startsAt.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  End Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  {...register("endsAt")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
                {errors.endsAt && (
                  <p className="text-xs text-danger mt-1">{errors.endsAt.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Registration Deadline <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  {...register("registrationDeadline")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
                {errors.registrationDeadline && (
                  <p className="text-xs text-danger mt-1">
                    {errors.registrationDeadline.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Venue / Location <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  {...register("venue")}
                  placeholder="e.g. Sports Complex - Arena A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
                {errors.venue && (
                  <p className="text-xs text-danger mt-1">{errors.venue.message}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Card: Participation & Team Limits */}
          <Card className="p-6 bg-white border border-navy-100 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-base font-bold text-navy-950 font-heading border-b border-navy-50 pb-2">
              Participation & Capacity
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Participation Format"
                  required
                  value={currentParticipationType}
                  onChange={(val) =>
                    setValue(
                      "participationType",
                      val as EventFormValues["participationType"],
                      { shouldValidate: true }
                    )
                  }
                  options={[
                    { value: "INDIVIDUAL", label: "Solo / Individual" },
                    { value: "TEAM", label: "Team" },
                  ]}
                  error={errors.participationType?.message}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Max Participants / Teams (Capacity)
                </label>
                <input
                  type="number"
                  min={1}
                  {...register("maxParticipants", {
                    setValueAs: (v) =>
                      v === "" || v === null || isNaN(Number(v)) ? null : Number(v),
                  })}
                  placeholder="Leave empty for unlimited"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
                {errors.maxParticipants && (
                  <p className="text-xs text-danger mt-1">
                    {errors.maxParticipants.message}
                  </p>
                )}
              </div>
            </div>

            {currentParticipationType === "TEAM" && (
              <div className="p-4 rounded-xl bg-navy-50/70 border border-navy-100 space-y-3">
                <p className="text-xs font-bold text-navy-900">
                  Team Size Constraints (including team leader)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-mist mb-1">
                      Min Team Size
                    </label>
                    <input
                      type="number"
                      min={1}
                      {...register("minTeamSize", { valueAsNumber: true })}
                      className="w-full px-3 py-2 rounded-xl border border-navy-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold-400"
                    />
                    {errors.minTeamSize && (
                      <p className="text-xs text-danger mt-1">
                        {errors.minTeamSize.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-mist mb-1">
                      Max Team Size
                    </label>
                    <input
                      type="number"
                      min={1}
                      {...register("maxTeamSize", { valueAsNumber: true })}
                      className="w-full px-3 py-2 rounded-xl border border-navy-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold-400"
                    />
                    {errors.maxTeamSize && (
                      <p className="text-xs text-danger mt-1">
                        {errors.maxTeamSize.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Card: Rules, Eligibility & Prizes */}
          <Card className="p-6 bg-white border border-navy-100 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-base font-bold text-navy-950 font-heading border-b border-navy-50 pb-2">
              Rules & Rewards
            </h2>

            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                Competition Rules <span className="text-danger">*</span>
              </label>
              <textarea
                rows={3}
                {...register("rules")}
                placeholder="1. Standard regulations apply.&#10;2. Specific match timings or scoring criteria."
                className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              {errors.rules && (
                <p className="text-xs text-danger mt-1">{errors.rules.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                Eligibility <span className="text-danger">*</span>
              </label>
              <textarea
                rows={2}
                {...register("eligibility")}
                placeholder="Open to currently enrolled undergraduate students."
                className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              {errors.eligibility && (
                <p className="text-xs text-danger mt-1">{errors.eligibility.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                Prizes & Awards <span className="text-danger">*</span>
              </label>
              <textarea
                rows={2}
                {...register("prizes")}
                placeholder="1st Place: 50,000 PKR + Trophy&#10;2nd Place: 25,000 PKR"
                className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              {errors.prizes && (
                <p className="text-xs text-danger mt-1">{errors.prizes.message}</p>
              )}
            </div>
          </Card>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-navy-100">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="submit"
                variant="gold"
                size="lg"
                disabled={isPending || isUploading}
                className="w-full sm:w-auto font-bold shadow-md shadow-gold-500/20"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Saving Event...</span>
                  </>
                ) : (
                  <span>{isEdit ? "Update Event" : "Create & Publish Event"}</span>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => router.back()}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>

            {/* Delete / Cancel buttons in Edit Mode */}
            {isEdit && initialData && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {canDelete ? (
                  deleteConfirmOpen ? (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={isPending}
                        onClick={handleDelete}
                      >
                        Confirm Delete
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmOpen(false)}
                      >
                        Nevermind
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="danger"
                      size="md"
                      onClick={() => setDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      <span>Delete Event</span>
                    </Button>
                  )
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      disabled={isPending || currentStatus === "CANCELLED"}
                      onClick={handleCancelEvent}
                      className="border-danger/30 text-danger hover:bg-danger-bg"
                    >
                      <Ban className="w-4 h-4 mr-1.5" />
                      <span>{currentStatus === "CANCELLED" ? "Archived" : "Cancel / Archive"}</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Audit notice for non-deletable events */}
          {isEdit && !canDelete && (
            <div className="p-3.5 rounded-xl bg-navy-50 border border-navy-100 text-xs text-mist flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-navy-950">
                  Deletion restricted ({registrationCount} existing registration{registrationCount > 1 ? "s" : ""})
                </p>
                <p className="text-[11px] text-mist mt-0.5">
                  To protect participant records and certificates, an event with submitted applications cannot be permanently erased. Use <strong>Cancel / Archive</strong> to withdraw it from the public schedule.
                </p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Live Preview Area (5 Cols, Sticky) */}
      <div className="lg:col-span-5 sticky top-20 space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold uppercase tracking-wider text-mist flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-gold-500" />
            <span>Live Card Preview</span>
          </p>
          <span className="text-[11px] text-mist font-medium">Updates in real time</span>
        </div>

        <div className="max-w-sm mx-auto lg:max-w-none">
          <EventCard event={previewEvent} />
        </div>

        <div className="p-3 rounded-xl bg-white border border-navy-100 text-xs text-mist space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-navy-900">Derived Status:</span>
            <span className="font-bold text-navy-950">{previewEvent.derivedStatus}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-navy-900">Seats Remaining:</span>
            <span className="font-bold text-navy-950">
              {previewEvent.remainingSeats === null
                ? "Unlimited"
                : `${previewEvent.remainingSeats} seats`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
