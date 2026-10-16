"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ResultsPodium } from "@/components/shared/ResultsPodium";
import {
  addResultAction,
  updateResultAction,
  deleteResultAction,
  addAllApprovedAsParticipationAction,
  publishResultsAction,
  unpublishResultsAction,
  markEventCompletedAction,
} from "@/features/admin/results.actions";
import {
  uploadCertificateAction,
  removeCertificateAction,
} from "@/features/admin/certificates.actions";
import {
  AWARD_PRESETS,
  validateRankUniqueness,
  validateEventPublishability,
} from "@/features/results/results.rules";
import type {
  AdminResultDetail,
  AdminApprovedRegistration,
  RankedResultItem,
} from "@/features/results/repositories/results.repository";
import {
  Trophy,
  ArrowLeft,
  Calendar,
  Users,
  Plus,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Upload,
  Award,
  Loader2,
} from "lucide-react";

interface AdminEventResultsManagerProps {
  event: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    category: string;
    status: string;
    participationType: string;
    startsAt: Date | string;
    endsAt?: Date | string | null;
    venue: string;
    resultsPublished: boolean;
  };
  initialResults: AdminResultDetail[];
  approvedRegistrations: AdminApprovedRegistration[];
}

export function AdminEventResultsManager({
  event,
  initialResults,
  approvedRegistrations,
}: AdminEventResultsManagerProps) {
  const [, startTransition] = useTransition();

  const [results, setResults] = useState<AdminResultDetail[]>(initialResults);
  const [eventStatus, setEventStatus] = useState<string>(event.status);
  const [isPublished, setIsPublished] = useState<boolean>(event.resultsPublished);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [participantType, setParticipantType] = useState<"REGISTERED" | "WALKIN">("REGISTERED");
  const [selectedRegId, setSelectedRegId] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [position, setPosition] = useState<number>(results.length + 1);
  const [isTie, setIsTie] = useState<boolean>(false);
  const [award, setAward] = useState<string>("Champion");
  const [score, setScore] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isBulkAdding, setIsBulkAdding] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");

  // Certificate upload & removal state per result row
  const [uploadingCertId, setUploadingCertId] = useState<string | null>(null);
  const [removingCertId, setRemovingCertId] = useState<string | null>(null);
  const [certErrors, setCertErrors] = useState<Record<string, string>>({});

  // Filter approved participants who do not yet have a result
  const registeredIdsWithResults = new Set(
    results.map((r) => r.registrationId).filter(Boolean)
  );
  const unassignedRegistrations = approvedRegistrations.filter(
    (reg) => !registeredIdsWithResults.has(reg.id) || reg.id === selectedRegId
  );

  const participantSelectOptions = unassignedRegistrations.map((reg) => ({
    value: reg.id,
    label: reg.teamName
      ? `${reg.teamName} (Team • Led by ${reg.userName})`
      : `${reg.userName}${reg.rollNumber ? ` (${reg.rollNumber})` : ""}`,
  }));

  // Auto-fill preset award when position changes
  const handlePositionChange = (newPos: number) => {
    setPosition(newPos);
    setFormError(null);
    if (!editingId) {
      if (newPos === 1) setAward("Champion");
      else if (newPos === 2) setAward("Runner-up");
      else if (newPos === 3) setAward("Second Runner-up");
      else if (newPos === 4) setAward("Honorable Mention");
      else setAward("Participation");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setParticipantType("REGISTERED");
    setSelectedRegId("");
    setCustomName("");
    const nextPos = results.length + 1;
    setPosition(nextPos);
    setIsTie(false);
    if (nextPos === 1) setAward("Champion");
    else if (nextPos === 2) setAward("Runner-up");
    else if (nextPos === 3) setAward("Second Runner-up");
    else setAward("Honorable Mention");
    setScore("");
    setRemarks("");
    setFormError(null);
  };

  const handleEditClick = (res: AdminResultDetail) => {
    setEditingId(res.id);
    if (res.registrationId) {
      setParticipantType("REGISTERED");
      setSelectedRegId(res.registrationId);
      setCustomName("");
    } else {
      setParticipantType("WALKIN");
      setSelectedRegId("");
      setCustomName(res.customParticipantName || res.participantName);
    }
    setPosition(res.position);
    setIsTie(res.isTie);
    setAward(res.award || "Champion");
    setScore(res.score || "");
    setRemarks(res.remarks || "");
    setFormError(null);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (participantType === "REGISTERED" && !selectedRegId) {
      setFormError("Please select an approved participant or team from the list.");
      return;
    }
    if (participantType === "WALKIN" && !customName.trim()) {
      setFormError("Please enter the name of the walk-in participant.");
      return;
    }
    if (!award.trim()) {
      setFormError("Please provide an award title (e.g. Champion, Runner-up).");
      return;
    }

    // Rank uniqueness validation
    const existingItems = results.map((r) => ({
      id: r.id,
      position: r.position,
      isTie: r.isTie,
      participantName: r.participantName,
      registrationId: r.registrationId,
    }));

    const rankCheck = validateRankUniqueness(position, isTie, existingItems, editingId ?? undefined);
    if (!rankCheck.valid) {
      setFormError(rankCheck.error || "Rank conflict.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingId) {
        const res = await updateResultAction(editingId, {
          eventId: event.id,
          participantType,
          registrationId: participantType === "REGISTERED" ? selectedRegId : null,
          customParticipantName: participantType === "WALKIN" ? customName.trim() : null,
          position,
          award: award.trim(),
          score: score.trim() || null,
          remarks: remarks.trim() || null,
          isTie,
        });

        if (!res.ok) {
          setFormError(res.error);
          return;
        }

        // Update local results
        const regInfo = approvedRegistrations.find((r) => r.id === selectedRegId);
        setResults((prev) =>
          prev
            .map((r) =>
              r.id === editingId
                ? {
                    ...r,
                    registrationId: participantType === "REGISTERED" ? selectedRegId : null,
                    customParticipantName:
                      participantType === "WALKIN" ? customName.trim() : null,
                    participantName:
                      participantType === "REGISTERED"
                        ? regInfo?.userName || "Participant"
                        : customName.trim(),
                    teamName: participantType === "REGISTERED" ? regInfo?.teamName || null : null,
                    position,
                    award: award.trim(),
                    score: score.trim() || null,
                    remarks: remarks.trim() || null,
                    isTie,
                  }
                : r
            )
            .sort((a, b) => a.position - b.position)
        );

        toast.success("Result updated successfully!");
        resetForm();
      } else {
        const res = await addResultAction({
          eventId: event.id,
          participantType,
          registrationId: participantType === "REGISTERED" ? selectedRegId : null,
          customParticipantName: participantType === "WALKIN" ? customName.trim() : null,
          position,
          award: award.trim(),
          score: score.trim() || null,
          remarks: remarks.trim() || null,
          isTie,
        });

        if (!res.ok) {
          setFormError(res.error);
          return;
        }

        const regInfo = approvedRegistrations.find((r) => r.id === selectedRegId);
        const newRecord: AdminResultDetail = {
          id: res.data.id,
          eventId: event.id,
          registrationId: participantType === "REGISTERED" ? selectedRegId : null,
          customParticipantName:
            participantType === "WALKIN" ? customName.trim() : null,
          participantName:
            participantType === "REGISTERED"
              ? regInfo?.userName || "Participant"
              : customName.trim(),
          teamName: participantType === "REGISTERED" ? regInfo?.teamName || null : null,
          rollNumber: participantType === "REGISTERED" ? regInfo?.rollNumber || null : null,
          position,
          award: award.trim(),
          score: score.trim() || null,
          remarks: remarks.trim() || null,
          certificateUrl: null,
          isTie,
        };

        setResults((prev) => [...prev, newRecord].sort((a, b) => a.position - b.position));
        toast.success("Result recorded successfully!");
        resetForm();
      }
    } catch {
      setFormError("An unexpected error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (resultId: string) => {
    if (!confirm("Are you sure you want to delete this result?")) return;

    try {
      const res = await deleteResultAction(resultId, event.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResults((prev) => prev.filter((r) => r.id !== resultId));
      toast.success("Result deleted.");
      if (editingId === resultId) resetForm();
    } catch {
      toast.error("Failed to delete result.");
    }
  };

  const handleBulkAddParticipation = async () => {
    setIsBulkAdding(true);
    try {
      const res = await addAllApprovedAsParticipationAction(event.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data.addedCount === 0) {
        toast.info("All approved participants are already listed in the results.");
      } else {
        toast.success(`Added ${res.data.addedCount} participant(s) as Participation!`);
        // Refresh page data
        startTransition(() => {
          window.location.reload();
        });
      }
    } catch {
      toast.error("Failed to bulk-add participation results.");
    } finally {
      setIsBulkAdding(false);
    }
  };

  const handlePublishToggle = async () => {
    setIsPublishing(true);
    try {
      if (isPublished) {
        const res = await unpublishResultsAction(event.id);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setIsPublished(false);
        toast.success("Results unpublished. They are now hidden from the public site.");
      } else {
        const res = await publishResultsAction(event.id);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setIsPublished(true);
        toast.success("Results published! They are now live on the public leaderboard.");
      }
    } catch {
      toast.error("Failed to toggle publish status.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCertificateUpload = async (
    resultId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so the same file could be selected again if needed
    e.target.value = "";

    // Clear previous error for this result
    setCertErrors((prev) => {
      const next = { ...prev };
      delete next[resultId];
      return next;
    });

    if (file.size > 3 * 1024 * 1024) {
      const errorMsg = `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 3 MB limit for certificates.`;
      setCertErrors((prev) => ({ ...prev, [resultId]: errorMsg }));
      toast.error(errorMsg);
      return;
    }

    setUploadingCertId(resultId);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await uploadCertificateAction(resultId, event.id, formData);
      if (!response.ok) {
        setCertErrors((prev) => ({ ...prev, [resultId]: response.error }));
        toast.error(response.error);
      } else {
        toast.success("Certificate uploaded successfully");
        setResults((prev) =>
          prev.map((r) =>
            r.id === resultId ? { ...r, certificateUrl: response.data.certificateUrl } : r
          )
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setCertErrors((prev) => ({ ...prev, [resultId]: msg }));
      toast.error(msg);
    } finally {
      setUploadingCertId(null);
    }
  };

  const handleCertificateRemove = async (resultId: string) => {
    if (!window.confirm("Remove this certificate image? The storage file will also be deleted.")) {
      return;
    }

    setCertErrors((prev) => {
      const next = { ...prev };
      delete next[resultId];
      return next;
    });

    setRemovingCertId(resultId);
    try {
      const response = await removeCertificateAction(resultId, event.id);
      if (!response.ok) {
        setCertErrors((prev) => ({ ...prev, [resultId]: response.error }));
        toast.error(response.error);
      } else {
        toast.success("Certificate removed");
        setResults((prev) =>
          prev.map((r) => (r.id === resultId ? { ...r, certificateUrl: null } : r))
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Removal failed";
      setCertErrors((prev) => ({ ...prev, [resultId]: msg }));
      toast.error(msg);
    } finally {
      setRemovingCertId(null);
    }
  };

  const handleMarkCompleted = async () => {
    try {
      const res = await markEventCompletedAction(event.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setEventStatus("COMPLETED");
      toast.success("Event status marked as Completed! You can now publish results.");
    } catch {
      toast.error("Failed to update event status.");
    }
  };

  // Convert results for preview
  const previewResults: RankedResultItem[] = results.map((r) => ({
    id: r.id,
    position: r.position,
    award: r.award,
    certificateUrl: r.certificateUrl,
    remarks: r.remarks,
    score: r.score,
    isTie: r.isTie,
    winnerName: r.participantName,
    teamName: r.teamName,
    department: null,
  }));

  const isEventCompleted = eventStatus === "COMPLETED";
  const publishValidation = validateEventPublishability(eventStatus, results.length);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Top Navigation & Status Bar */}
      <div className="space-y-4">
        <Link
          href="/admin/results"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-mist hover:text-navy-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Completed Events</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white border border-navy-100 rounded-3xl shadow-sm">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gold-600 bg-gold-50 px-2.5 py-0.5 rounded-full border border-gold-300">
                {event.category} Arena
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  isPublished
                    ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                    : "bg-amber-100 text-amber-900 border-amber-200"
                }`}
              >
                {isPublished ? "Publicly Published" : "Draft (Unpublished)"}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                  isEventCompleted ? "bg-navy-900 text-ivory" : "bg-slate-100 text-slate-700"
                }`}
              >
                Status: {eventStatus}
              </span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-navy-950 truncate">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-mist pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gold-500" />
                <span>Starts: {new Date(event.startsAt).toLocaleDateString()}</span>
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-navy-700" />
                <span>{approvedRegistrations.length} Approved Participants</span>
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-gold-500" />
                <span>{results.length} Results Recorded</span>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isPublished && (
              <Link href={`/results/${event.slug}`} target="_blank">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <span>View Public Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </Link>
            )}

            {isPublished ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePublishToggle}
                isLoading={isPublishing}
                className="border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold"
              >
                Unpublish Results
              </Button>
            ) : (
              <Button
                variant="gold"
                size="sm"
                onClick={handlePublishToggle}
                isLoading={isPublishing}
                disabled={!publishValidation.canPublish}
                className="font-bold shadow-md shadow-gold-500/20"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                <span>Publish Results</span>
              </Button>
            )}
          </div>
        </div>

        {/* Completion Notice if not completed */}
        {!isEventCompleted && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Event is currently marked as &quot;{eventStatus}&quot;.</p>
                <p className="text-amber-800 text-xs mt-0.5">
                  Publishing results requires the event to be formally completed. You can record draft standings now and mark as completed when ready.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMarkCompleted}
              className="border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold whitespace-nowrap self-start sm:self-auto"
            >
              Mark as Completed
            </Button>
          </div>
        )}
      </div>

      {/* Tab Switcher: Editor vs Live Podium Preview */}
      <div className="flex items-center gap-3 border-b border-navy-100 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("editor")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "editor"
              ? "bg-navy-950 text-ivory shadow-xs"
              : "text-mist hover:text-navy-950 hover:bg-navy-50"
          }`}
        >
          Manage & Add Standings ({results.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "preview"
              ? "bg-navy-950 text-ivory shadow-xs"
              : "text-mist hover:text-navy-950 hover:bg-navy-50"
          }`}
        >
          <Eye className="w-4 h-4 text-gold-400" />
          <span>Live Podium Preview</span>
        </button>
      </div>

      {activeTab === "preview" ? (
        /* Live Preview Tab */
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-navy-50 border border-navy-100 text-navy-900 text-xs flex items-center justify-between">
            <span className="font-semibold">
              Live Preview: This is exactly how public viewers see the standings on /results/{event.slug}.
            </span>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab("editor")}>
              Return to Editor
            </Button>
          </div>

          {previewResults.length === 0 ? (
            <Card className="p-12 text-center text-mist bg-white rounded-3xl">
              No results entered yet. Add at least 1st, 2nd, or 3rd place to view the podium.
            </Card>
          ) : (
            <div className="p-6 sm:p-10 rounded-3xl bg-white border border-navy-100 shadow-sm">
              <ResultsPodium results={previewResults} eventSlug={event.slug} />
            </div>
          )}
        </div>
      ) : (
        /* Editor Tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 sm:p-7 bg-white border border-navy-100 rounded-2xl shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-navy-50 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gold-500" />
                  <h3 className="font-heading text-base font-bold text-navy-950">
                    {editingId ? "Edit Standings Entry" : "Record New Result"}
                  </h3>
                </div>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs font-semibold text-mist hover:text-navy-950"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {formError && (
                <div className="p-3.5 rounded-xl bg-danger-bg border border-danger/20 text-danger text-xs font-medium">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmitResult} className="space-y-4">
                {/* Participant Source Toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-mist">
                    Participant Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setParticipantType("REGISTERED")}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        participantType === "REGISTERED"
                          ? "bg-navy-900 text-ivory border-navy-900 shadow-xs"
                          : "bg-navy-50 text-mist hover:text-navy-950 border-navy-100"
                      }`}
                    >
                      Approved Roster
                    </button>
                    <button
                      type="button"
                      onClick={() => setParticipantType("WALKIN")}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        participantType === "WALKIN"
                          ? "bg-navy-900 text-ivory border-navy-900 shadow-xs"
                          : "bg-navy-50 text-mist hover:text-navy-950 border-navy-100"
                      }`}
                    >
                      Walk-in Candidate
                    </button>
                  </div>
                </div>

                {/* Participant Selector */}
                {participantType === "REGISTERED" ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-navy-950">
                      Approved Participant / Team
                    </label>
                    {participantSelectOptions.length === 0 && !editingId ? (
                      <p className="text-xs text-mist italic">
                        All approved registrations are already listed in the results.
                      </p>
                    ) : (
                      <Select
                        placeholder="Choose approved student or team..."
                        options={participantSelectOptions}
                        value={selectedRegId}
                        onChange={(val) => {
                          setSelectedRegId(val);
                          setFormError(null);
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-navy-950">
                      Walk-in Participant Name
                    </label>
                    <Input
                      placeholder="e.g. John Doe (Walk-in)"
                      value={customName}
                      onChange={(e) => {
                        setCustomName(e.target.value);
                        setFormError(null);
                      }}
                    />
                  </div>
                )}

                {/* Position & Tie */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-navy-950">
                      Position / Rank
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={position}
                      onChange={(e) =>
                        handlePositionChange(Math.max(1, parseInt(e.target.value, 10) || 1))
                      }
                    />
                  </div>

                  <div className="pb-2.5">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-navy-900">
                      <input
                        type="checkbox"
                        checked={isTie}
                        onChange={(e) => {
                          setIsTie(e.target.checked);
                          setFormError(null);
                        }}
                        className="w-4 h-4 rounded text-gold-500 focus:ring-gold-400"
                      />
                      <span>Shared Tie (Joint Rank)</span>
                    </label>
                  </div>
                </div>

                {/* Award Presets & Label */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-navy-950">Award Title</label>
                    <span className="text-[10px] text-mist font-medium">Click a preset</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {AWARD_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAward(preset)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          award === preset
                            ? "bg-gold-500 text-navy-950 border-gold-600 font-bold shadow-xs"
                            : "bg-navy-50/80 text-ink/80 hover:bg-navy-100 border-navy-100"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <Input
                    placeholder="e.g. Champion, Runner-up, Best Speaker"
                    value={award}
                    onChange={(e) => setAward(e.target.value)}
                  />
                </div>

                {/* Optional Score & Remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-mist">
                      Score / Points (Optional)
                    </label>
                    <Input
                      placeholder="e.g. 98.5 pts or 3 - 1"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-mist">
                      Judge Note (Optional)
                    </label>
                    <Input
                      placeholder="e.g. Outstanding debate"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>
                </div>

                {/* Submit action */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="gold"
                    className="w-full font-bold shadow-sm"
                    isLoading={isSubmitting}
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    <span>{editingId ? "Update Result Entry" : "Save Result"}</span>
                  </Button>
                </div>
              </form>
            </Card>

            {/* Bulk Action Card */}
            <Card className="p-5 bg-navy-50/50 border border-navy-100 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-500" />
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-navy-950">
                  Bulk Participation Utility
                </h4>
              </div>
              <p className="text-xs text-mist leading-relaxed">
                Automatically add all remaining approved participants with the &quot;Participation&quot; award. Existing winners are kept untouched.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full font-semibold border-navy-200"
                onClick={handleBulkAddParticipation}
                isLoading={isBulkAdding}
              >
                Add All Approved as Participation
              </Button>
            </Card>
          </div>

          {/* Right Column: Existing Results List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-navy-100">
              <h3 className="font-heading text-lg font-extrabold text-navy-950 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-gold-500" />
                <span>Current Standings ({results.length})</span>
              </h3>
              <span className="text-xs text-mist">Sorted by rank</span>
            </div>

            {results.length === 0 ? (
              <Card className="p-12 text-center text-mist bg-white rounded-2xl border border-navy-100 space-y-2">
                <p className="font-semibold text-sm">No results recorded yet.</p>
                <p className="text-xs">
                  Fill in the form on the left to assign 1st, 2nd, and 3rd place winners.
                </p>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {results.map((res) => {
                  const isTopRank = res.position <= 3;
                  const rankColors = [
                    "bg-gold-500 text-navy-950",
                    "bg-slate-300 text-slate-800",
                    "bg-amber-700 text-amber-50",
                  ];
                  const rankBadgeColor = isTopRank
                    ? rankColors[res.position - 1]
                    : "bg-navy-100 text-navy-800";

                  return (
                    <Card
                      key={res.id}
                      className="p-4 bg-white border border-navy-100 hover:border-gold-300 transition-colors shadow-xs rounded-xl space-y-3"
                    >
                      {/* Top Row: Rank, Participant & Result details */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Rank Badge */}
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-heading font-black text-sm shrink-0 shadow-2xs ${rankBadgeColor}`}
                          >
                            #{res.position}
                          </div>

                          {/* Participant & Award info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-extrabold text-sm text-navy-950 truncate">
                                {res.participantName}
                              </span>
                              {res.isTie && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded">
                                  TIE
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-mist pt-0.5">
                              <span className="font-semibold text-navy-800">
                                {res.award || "Award"}
                              </span>
                              {res.score && (
                                <span>• Score: <strong className="font-mono text-navy-900">{res.score}</strong></span>
                              )}
                              {res.remarks && (
                                <span className="italic truncate max-w-[200px]">
                                  • &ldquo;{res.remarks}&rdquo;
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Edit / Delete Result */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditClick(res)}
                            title="Edit Result"
                            className="p-1.5 rounded-lg text-mist hover:text-navy-950 hover:bg-navy-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(res.id)}
                            title="Delete Result"
                            className="p-1.5 rounded-lg text-mist hover:text-danger hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Certificate Management Area */}
                      <div className="pt-2.5 border-t border-navy-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-navy-50/50 p-2.5 rounded-lg">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail preview */}
                          {res.certificateUrl ? (
                            <a
                              href={res.certificateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative group w-14 h-10 rounded-md overflow-hidden border border-navy-200 bg-slate-100 shrink-0 shadow-2xs block"
                              title="Click to preview certificate image"
                            >
                              <Image
                                src={res.certificateUrl}
                                alt={`Certificate for ${res.participantName}`}
                                fill
                                sizes="56px"
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            </a>
                          ) : (
                            <div className="w-14 h-10 rounded-md border border-dashed border-navy-200 bg-white flex items-center justify-center text-mist shrink-0">
                              <Award className="w-4 h-4 text-navy-300" />
                            </div>
                          )}

                          {/* Status Badge */}
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {res.certificateUrl ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Uploaded</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  <span>Missing</span>
                                </span>
                              )}
                              <span className="text-[11px] font-medium text-mist">
                                {res.certificateUrl ? "Certificate image attached" : "No certificate uploaded"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons with loading states */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {/* Hidden file input */}
                          <input
                            type="file"
                            id={`cert-upload-${res.id}`}
                            accept=".png,.jpg,.jpeg,.webp"
                            className="hidden"
                            disabled={uploadingCertId === res.id || removingCertId === res.id}
                            onChange={(e) => handleCertificateUpload(res.id, e)}
                          />

                          {res.certificateUrl ? (
                            <>
                              <label
                                htmlFor={`cert-upload-${res.id}`}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-navy-200 bg-white hover:bg-navy-50 text-navy-950 transition-colors shadow-2xs cursor-pointer ${
                                  uploadingCertId === res.id || removingCertId === res.id
                                    ? "opacity-50 pointer-events-none"
                                    : ""
                                }`}
                              >
                                {uploadingCertId === res.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Replacing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-3.5 h-3.5 text-navy-700" />
                                    <span>Replace</span>
                                  </>
                                )}
                              </label>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-danger hover:text-danger hover:bg-rose-50 text-xs px-2.5 py-1 h-auto"
                                disabled={uploadingCertId === res.id || removingCertId === res.id}
                                onClick={() => handleCertificateRemove(res.id)}
                              >
                                {removingCertId === res.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                    <span>Removing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                    <span>Remove</span>
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <label
                              htmlFor={`cert-upload-${res.id}`}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-navy-950 hover:bg-navy-900 text-ivory transition-colors shadow-2xs cursor-pointer ${
                                uploadingCertId === res.id || removingCertId === res.id
                                  ? "opacity-50 pointer-events-none"
                                  : ""
                              }`}
                            >
                              {uploadingCertId === res.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3.5 h-3.5 text-gold-400" />
                                  <span>Upload</span>
                                </>
                              )}
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Error state alert */}
                      {certErrors[res.id] && (
                        <div className="p-2 rounded-lg bg-danger-bg border border-danger/20 text-danger text-xs font-medium flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{certErrors[res.id]}</span>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
