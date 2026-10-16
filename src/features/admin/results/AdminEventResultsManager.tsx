"use client";

import React, { useState } from "react";
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
  addQuickPodiumAction,
  addBatchAwardAction,
  swapPodiumResultsAction,
  publishResultsAction,
  unpublishResultsAction,
  markEventCompletedAction,
} from "@/features/admin/results.actions";
import {
  uploadCertificateAction,
  removeCertificateAction,
} from "@/features/admin/certificates.actions";
import {
  PODIUM_AWARDS,
  RUNNER_AWARD_PRESETS,
  getAutomaticAwardForPosition,
  validateAwardForPosition,
  validateRankUniqueness,
  validateParticipantUniqueness,
  validateQuickPodiumPayload,
  validateBatchAwardPayload,
  validateEventPublishability,
  type QuickPodiumPayload,
  type QuickPodiumSlot,
  type ExistingResultItem,
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
  ExternalLink,
  Upload,
  Award,
  Loader2,
  Lock,
  Layers,
  Medal,
  CheckSquare,
  Square,
  Sparkles,
  ArrowLeftRight,
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

function formatOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function AdminEventResultsManager({
  event,
  initialResults,
  approvedRegistrations,
}: AdminEventResultsManagerProps) {
  const [results, setResults] = useState<AdminResultDetail[]>(initialResults);
  const [eventStatus, setEventStatus] = useState<string>(event.status);
  const [isPublished, setIsPublished] = useState<boolean>(event.resultsPublished);

  // Tab: Editor vs Live Podium Preview
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");

  // Mode for left creation panel: "single" | "quick_podium" | "batch"
  const [creationMode, setCreationMode] = useState<"single" | "quick_podium" | "batch">("single");

  // Single Result / Edit Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [participantType, setParticipantType] = useState<"REGISTERED" | "WALKIN">("REGISTERED");
  const [selectedRegId, setSelectedRegId] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [position, setPosition] = useState<number>(() => {
    const taken = new Set(initialResults.map((r) => r.position));
    let p = 1;
    while (taken.has(p)) p++;
    return p;
  });
  const [award, setAward] = useState<string>(() => {
    const taken = new Set(initialResults.map((r) => r.position));
    let p = 1;
    while (taken.has(p)) p++;
    return getAutomaticAwardForPosition(p) ?? "Honorable Mention";
  });
  const [score, setScore] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quick Podium Form states
  const [quickFirst, setQuickFirst] = useState<{
    type: "REGISTERED" | "WALKIN" | "NONE";
    regId: string;
    customName: string;
  }>({ type: "NONE", regId: "", customName: "" });
  const [quickSecond, setQuickSecond] = useState<{
    type: "REGISTERED" | "WALKIN" | "NONE";
    regId: string;
    customName: string;
  }>({ type: "NONE", regId: "", customName: "" });
  const [quickThird, setQuickThird] = useState<{
    type: "REGISTERED" | "WALKIN" | "NONE";
    regId: string;
    customName: string;
  }>({ type: "NONE", regId: "", customName: "" });
  const [quickError, setQuickError] = useState<string | null>(null);
  const [isSubmittingQuick, setIsSubmittingQuick] = useState<boolean>(false);

  // Batch Award Form states
  const [batchAward, setBatchAward] = useState<"Honorable Mention" | "Participation">("Participation");
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState<boolean>(false);

  // Status & Certificate Actions state
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [uploadingCertId, setUploadingCertId] = useState<string | null>(null);
  const [removingCertId, setRemovingCertId] = useState<string | null>(null);
  const [, setCertErrors] = useState<Record<string, string>>({});

  // Existing podium holders
  const existingFirst = results.find((r) => r.position === 1);
  const existingSecond = results.find((r) => r.position === 2);
  const existingThird = results.find((r) => r.position === 3);

  // Highest recorded position
  const maxPosition = results.reduce((max, r) => Math.max(max, r.position), 0);
  const nextAvailableBatchPosition = Math.max(4, maxPosition + 1);

  // Eligible participants for Batch Award (approved participants with no existing result)
  const unassignedRegistrations = approvedRegistrations.filter(
    (reg) => !results.some((r) => r.registrationId === reg.id)
  );

  // Position select options for Single Form
  const totalPositions = Math.max(25, maxPosition + 5);
  const positionSelectOptions = Array.from({ length: totalPositions }, (_, i) => {
    const p = i + 1;
    const holder = results.find((r) => r.position === p && r.id !== editingId);
    const ordinal = formatOrdinal(p);
    if (holder) {
      return {
        value: String(p),
        label: `${ordinal}: taken by ${holder.participantName}`,
        disabled: true,
      };
    }
    const autoAward = getAutomaticAwardForPosition(p);
    return {
      value: String(p),
      label: `${ordinal} Place${autoAward ? ` (${autoAward})` : ""}`,
      disabled: false,
    };
  });

  // Participant select options for Single Form
  const participantSelectOptions = approvedRegistrations.map((reg) => {
    const alreadyResult = results.find(
      (r) => r.registrationId === reg.id && r.id !== editingId
    );
    const baseLabel = reg.teamName
      ? `${reg.teamName} (Team • Led by ${reg.userName})`
      : `${reg.userName}${reg.rollNumber ? ` (${reg.rollNumber})` : ""}`;

    return {
      value: reg.id,
      label: alreadyResult ? `${baseLabel} (already has a result)` : baseLabel,
      disabled: Boolean(alreadyResult),
    };
  });

  // Helpers for Quick Podium slot options (disables existing result holders and selections in other slots)
  const getQuickSlotOptions = (currentSlotPos: 1 | 2 | 3) => {
    const otherSelectedRegIds = new Set<string>();
    if (currentSlotPos !== 1 && quickFirst.type === "REGISTERED" && quickFirst.regId) {
      otherSelectedRegIds.add(quickFirst.regId);
    }
    if (currentSlotPos !== 2 && quickSecond.type === "REGISTERED" && quickSecond.regId) {
      otherSelectedRegIds.add(quickSecond.regId);
    }
    if (currentSlotPos !== 3 && quickThird.type === "REGISTERED" && quickThird.regId) {
      otherSelectedRegIds.add(quickThird.regId);
    }

    return approvedRegistrations.map((reg) => {
      const alreadyResult = results.some((r) => r.registrationId === reg.id);
      const isPickedInOtherSlot = otherSelectedRegIds.has(reg.id);
      const baseLabel = reg.teamName
        ? `${reg.teamName} (Team • Led by ${reg.userName})`
        : `${reg.userName}${reg.rollNumber ? ` (${reg.rollNumber})` : ""}`;

      let disabled = false;
      let label = baseLabel;
      if (alreadyResult) {
        disabled = true;
        label = `${baseLabel} (already has a result)`;
      } else if (isPickedInOtherSlot) {
        disabled = true;
        label = `${baseLabel} (selected in another slot)`;
      }

      return {
        value: reg.id,
        label,
        disabled,
      };
    });
  };

  const handlePositionChange = (newPos: number) => {
    setPosition(newPos);
    setFormError(null);
    const auto = getAutomaticAwardForPosition(newPos);
    if (auto) {
      setAward(auto);
    } else {
      if (["Champion", "Runner-up", "Second Runner-up"].includes(award)) {
        setAward("Honorable Mention");
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setParticipantType("REGISTERED");
    setSelectedRegId("");
    setCustomName("");

    const taken = new Set(results.map((r) => r.position));
    let nextPos = 1;
    while (taken.has(nextPos)) nextPos++;

    setPosition(nextPos);
    setAward(getAutomaticAwardForPosition(nextPos) ?? "Honorable Mention");
    setScore("");
    setRemarks("");
    setFormError(null);
  };

  const handleEditClick = (res: AdminResultDetail) => {
    setEditingId(res.id);
    setCreationMode("single");
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
    setAward(res.award || (getAutomaticAwardForPosition(res.position) ?? "Honorable Mention"));
    setScore(res.score || "");
    setRemarks(res.remarks || "");
    setFormError(null);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  // Submit Single Result (Add or Edit)
  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (participantType === "REGISTERED" && !selectedRegId) {
      setFormError("Please select an approved participant or team from the list.");
      return;
    }
    if (participantType === "WALKIN" && !customName.trim()) {
      setFormError("Please enter the name of the walk-in participant.");
      return;
    }

    const finalAward = getAutomaticAwardForPosition(position) || award.trim();
    const awardCheck = validateAwardForPosition(position, finalAward);
    if (!awardCheck.valid) {
      setFormError(awardCheck.error || "Invalid award label.");
      return;
    }

    const existingItems: ExistingResultItem[] = results.map((r) => ({
      id: r.id,
      position: r.position,
      participantName: r.participantName,
      registrationId: r.registrationId,
      customParticipantName: r.customParticipantName,
    }));

    const participantCheck = validateParticipantUniqueness(
      participantType,
      participantType === "REGISTERED" ? selectedRegId : null,
      participantType === "WALKIN" ? customName.trim() : null,
      existingItems,
      editingId ?? undefined
    );
    if (!participantCheck.valid) {
      setFormError(participantCheck.error || "Duplicate participant.");
      return;
    }

    const rankCheck = validateRankUniqueness(position, existingItems, editingId ?? undefined);
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
          award: finalAward,
          score: score.trim() || null,
          remarks: remarks.trim() || null,
          isTie: false,
        });

        if (!res.ok) {
          setFormError(res.error);
          return;
        }

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
                    award: finalAward,
                    score: score.trim() || null,
                    remarks: remarks.trim() || null,
                    isTie: false,
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
          award: finalAward,
          score: score.trim() || null,
          remarks: remarks.trim() || null,
          isTie: false,
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
          award: finalAward,
          score: score.trim() || null,
          remarks: remarks.trim() || null,
          certificateUrl: null,
          isTie: false,
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

  // Submit Quick Podium
  const handleQuickPodiumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError(null);

    const existingItems: ExistingResultItem[] = results.map((r) => ({
      id: r.id,
      position: r.position,
      participantName: r.participantName,
      registrationId: r.registrationId,
      customParticipantName: r.customParticipantName,
    }));

    const slotFirst: QuickPodiumSlot | null =
      quickFirst.type === "NONE"
        ? null
        : {
            participantType: quickFirst.type,
            registrationId: quickFirst.type === "REGISTERED" ? quickFirst.regId : null,
            customParticipantName:
              quickFirst.type === "WALKIN" ? quickFirst.customName.trim() : null,
          };

    const slotSecond: QuickPodiumSlot | null =
      quickSecond.type === "NONE"
        ? null
        : {
            participantType: quickSecond.type,
            registrationId: quickSecond.type === "REGISTERED" ? quickSecond.regId : null,
            customParticipantName:
              quickSecond.type === "WALKIN" ? quickSecond.customName.trim() : null,
          };

    const slotThird: QuickPodiumSlot | null =
      quickThird.type === "NONE"
        ? null
        : {
            participantType: quickThird.type,
            registrationId: quickThird.type === "REGISTERED" ? quickThird.regId : null,
            customParticipantName:
              quickThird.type === "WALKIN" ? quickThird.customName.trim() : null,
          };

    const payload: QuickPodiumPayload = {
      eventId: event.id,
      first: slotFirst,
      second: slotSecond,
      third: slotThird,
    };

    const validation = validateQuickPodiumPayload(payload, existingItems);
    if (!validation.valid) {
      setQuickError(validation.error || "Please select at least one valid podium slot.");
      return;
    }

    setIsSubmittingQuick(true);
    try {
      const res = await addQuickPodiumAction(payload);
      if (!res.ok) {
        setQuickError(res.error);
        return;
      }

      toast.success(`Successfully saved ${res.data.savedCount} podium standing(s)!`);
      window.location.reload();
    } catch {
      setQuickError("An unexpected error occurred while saving podium.");
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  // Submit Batch Award
  const handleBatchAwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError(null);

    if (batchSelectedIds.length === 0) {
      setBatchError("Please tick at least one participant.");
      return;
    }

    const existingItems: ExistingResultItem[] = results.map((r) => ({
      id: r.id,
      position: r.position,
      participantName: r.participantName,
      registrationId: r.registrationId,
      customParticipantName: r.customParticipantName,
    }));

    const validation = validateBatchAwardPayload(
      batchSelectedIds,
      batchAward,
      existingItems
    );
    if (!validation.valid) {
      setBatchError(validation.error || "Selected participants conflict with existing results.");
      return;
    }

    setIsSubmittingBatch(true);
    try {
      const res = await addBatchAwardAction(
        event.id,
        batchSelectedIds,
        batchAward,
        validation.startingPosition
      );

      if (!res.ok) {
        setBatchError(res.error);
        return;
      }

      toast.success(`Awarded "${batchAward}" to ${res.data.addedCount} participant(s)!`);
      window.location.reload();
    } catch {
      setBatchError("An unexpected error occurred while saving batch awards.");
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const handleSwapPodium = async (idA: string, idB: string) => {
    setIsSwapping(true);
    try {
      const res = await swapPodiumResultsAction(event.id, idA, idB);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Podium positions swapped successfully!");
      window.location.reload();
    } catch {
      toast.error("Failed to swap podium positions.");
    } finally {
      setIsSwapping(false);
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

  const handleCertificateUpload = async (
    resultId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";
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

  const previewResults: RankedResultItem[] = results.map((r) => ({
    id: r.id,
    position: r.position,
    award: r.award,
    certificateUrl: r.certificateUrl,
    remarks: r.remarks,
    score: r.score,
    isTie: false,
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
          {/* Left Column: Result Creation & Entry */}
          <div className="lg:col-span-5 space-y-4">
            {/* Mode Selector Tabs (Only visible when NOT editing an existing result) */}
            {!editingId && (
              <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-navy-50 border border-navy-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCreationMode("single")}
                  className={`py-2 px-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                    creationMode === "single"
                      ? "bg-white text-navy-950 shadow-xs border border-navy-100"
                      : "text-mist hover:text-navy-900"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                  <span className="truncate">Single Entry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode("quick_podium")}
                  className={`py-2 px-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                    creationMode === "quick_podium"
                      ? "bg-white text-navy-950 shadow-xs border border-navy-100"
                      : "text-mist hover:text-navy-900"
                  }`}
                >
                  <Medal className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                  <span className="truncate">Quick Podium</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode("batch")}
                  className={`py-2 px-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                    creationMode === "batch"
                      ? "bg-white text-navy-950 shadow-xs border border-navy-100"
                      : "text-mist hover:text-navy-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-navy-700 shrink-0" />
                  <span className="truncate">Batch Award</span>
                </button>
              </div>
            )}

            {/* FORM 1: Single Result / Edit Form */}
            {(creationMode === "single" || Boolean(editingId)) && (
              <Card className="p-6 sm:p-7 bg-white border border-navy-100 rounded-2xl shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-navy-50 pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-gold-500" />
                    <h3 className="font-heading text-base font-bold text-navy-950">
                      {editingId ? "Edit Standings Entry" : "Record Single Result"}
                    </h3>
                  </div>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      Cancel Edit
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
                          No approved registrations found for this event.
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

                  {/* Position Select */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-navy-950">Position / Rank</label>
                      <span className="text-[10px] text-mist">
                        Positions 1-3 are strictly unique
                      </span>
                    </div>
                    <Select
                      options={positionSelectOptions}
                      value={String(position)}
                      onChange={(val) => handlePositionChange(parseInt(val, 10))}
                    />
                  </div>

                  {/* Award Field */}
                  {position <= 3 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-navy-950">Award Label</label>
                        <span className="text-[10px] font-bold text-gold-700 bg-gold-50 px-2 py-0.5 rounded border border-gold-300 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Locked: Automatic for Podium</span>
                        </span>
                      </div>
                      <Input
                        value={PODIUM_AWARDS[position] || "Champion"}
                        readOnly
                        disabled
                        className="bg-navy-50/80 text-navy-950 font-bold cursor-not-allowed border-navy-200"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-navy-950">Award Label</label>
                        <span className="text-[10px] text-mist font-medium">Click a preset</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {RUNNER_AWARD_PRESETS.map((preset) => (
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
                        placeholder="e.g. Honorable Mention, Participation, Best Speaker"
                        value={award}
                        onChange={(e) => setAward(e.target.value)}
                      />
                      {["champion", "runner-up", "second runner-up"].includes(award.trim().toLowerCase()) && (
                        <p className="text-[11px] text-danger font-medium">
                          Positions 4+ cannot be Champion or Runner-up.
                        </p>
                      )}
                    </div>
                  )}

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
            )}

            {/* FORM 2: Quick Podium Form */}
            {creationMode === "quick_podium" && !editingId && (
              <Card className="p-6 sm:p-7 bg-white border border-navy-100 rounded-2xl shadow-sm space-y-5">
                <div className="border-b border-navy-50 pb-3">
                  <div className="flex items-center gap-2">
                    <Medal className="w-4 h-4 text-gold-500" />
                    <h3 className="font-heading text-base font-bold text-navy-950">
                      Quick Podium Setup (1st - 3rd)
                    </h3>
                  </div>
                  <p className="text-xs text-mist mt-1 leading-relaxed">
                    Assign 1st, 2nd, and 3rd place in one shot. Slots can be left empty if not yet determined. Saved in one atomic transaction.
                  </p>
                </div>

                {quickError && (
                  <div className="p-3.5 rounded-xl bg-danger-bg border border-danger/20 text-danger text-xs font-medium">
                    {quickError}
                  </div>
                )}

                <form onSubmit={handleQuickPodiumSubmit} className="space-y-5">
                  {/* Slot 1: Champion */}
                  <div className="p-3.5 rounded-xl bg-gold-50/50 border border-gold-200/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-gold-500 text-navy-950 font-black text-xs flex items-center justify-center">
                          #1
                        </span>
                        <span className="font-heading font-extrabold text-xs text-navy-950">
                          1st Place: Champion
                        </span>
                      </div>
                      {existingFirst && (
                        <span className="text-[10px] font-bold text-gold-800 bg-gold-100 px-2 py-0.5 rounded-full border border-gold-300">
                          Already Assigned
                        </span>
                      )}
                    </div>

                    {existingFirst ? (
                      <p className="text-xs text-navy-900 font-semibold bg-white p-2.5 rounded-lg border border-gold-200">
                        Current Holder: <strong>{existingFirst.participantName}</strong>
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQuickFirst((prev) => ({ ...prev, type: "REGISTERED" }))}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer ${
                              quickFirst.type === "REGISTERED"
                                ? "bg-navy-900 text-ivory border-navy-900"
                                : "bg-white text-mist border-navy-100"
                            }`}
                          >
                            Approved
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickFirst((prev) => ({ ...prev, type: "WALKIN" }))}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer ${
                              quickFirst.type === "WALKIN"
                                ? "bg-navy-900 text-ivory border-navy-900"
                                : "bg-white text-mist border-navy-100"
                            }`}
                          >
                            Walk-in
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickFirst({ type: "NONE", regId: "", customName: "" })}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer ${
                              quickFirst.type === "NONE"
                                ? "bg-slate-200 text-slate-800 border-slate-300"
                                : "bg-white text-mist border-navy-100"
                            }`}
                          >
                            Leave Empty
                          </button>
                        </div>

                        {quickFirst.type === "REGISTERED" && (
                          <Select
                            placeholder="Choose 1st place winner..."
                            options={getQuickSlotOptions(1)}
                            value={quickFirst.regId}
                            onChange={(val) => setQuickFirst((prev) => ({ ...prev, regId: val }))}
                          />
                        )}
                        {quickFirst.type === "WALKIN" && (
                          <Input
                            placeholder="Walk-in Champion name..."
                            value={quickFirst.customName}
                            onChange={(e) =>
                              setQuickFirst((prev) => ({ ...prev, customName: e.target.value }))
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Slot 2: Runner-up */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-300 text-slate-800 font-black text-xs flex items-center justify-center">
                          #2
                        </span>
                        <span className="font-heading font-extrabold text-xs text-navy-950">
                          2nd Place: Runner-up
                        </span>
                      </div>
                      {existingSecond && (
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full border border-slate-300">
                          Already Assigned
                        </span>
                      )}
                    </div>

                    {existingSecond ? (
                      <p className="text-xs text-navy-900 font-semibold bg-white p-2.5 rounded-lg border border-slate-200">
                        Current Holder: <strong>{existingSecond.participantName}</strong>
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQuickSecond((prev) => ({ ...prev, type: "REGISTERED" }))}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer ${
                              quickSecond.type === "REGISTERED"
                                ? "bg-navy-900 text-ivory border-navy-900"
                                : "bg-white text-mist border-navy-100"
                            }`}
                          >
                            Approved
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickSecond((prev) => ({ ...prev, type: "WALKIN" }))}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer ${
                              quickSecond.type === "WALKIN"
                                ? "bg-navy-900 text-ivory border-navy-900"
                                : "bg-white text-mist border-navy-100"
                            }`}
                          >
                            Walk-in
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickSecond({ type: "NONE", regId: "", customName: "" })}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer ${
                              quickSecond.type === "NONE"
                                ? "bg-slate-200 text-slate-800 border-slate-300"
                                : "bg-white text-mist border-navy-100"
                            }`}
                          >
                            Leave Empty
                          </button>
                        </div>

                        {quickSecond.type === "REGISTERED" && (
                          <Select
                            placeholder="Choose 2nd place winner..."
                            options={getQuickSlotOptions(2)}
                            value={quickSecond.regId}
                            onChange={(val) => setQuickSecond((prev) => ({ ...prev, regId: val }))}
                          />
                        )}
                        {quickSecond.type === "WALKIN" && (
                          <Input
                            placeholder="Walk-in Runner-up name..."
                            value={quickSecond.customName}
                            onChange={(e) =>
                              setQuickSecond((prev) => ({ ...prev, customName: e.target.value }))
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Slot 3: Second Runner-up */}
                  <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-700 text-amber-50 font-black text-xs flex items-center justify-center">
                          #3
                        </span>
                        <span className="font-heading font-extrabold text-xs text-navy-950">
                          3rd Place: Second Runner-up
                        </span>
                      </div>
                      {existingThird && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                          Already Assigned
                        </span>
                      )}
                    </div>

                    {existingThird ? (
                      <p className="text-xs text-navy-900 font-semibold bg-white p-2.5 rounded-lg border border-amber-200">
                        Current Holder: <strong>{existingThird.participantName}</strong>
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQuickThird((prev) => ({ ...prev, type: "REGISTERED" }))}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer ${
                              quickThird.type === "REGISTERED"
                                ? "bg-navy-900 text-ivory border-navy-900"
                                : "bg-white text-mist border-navy-100"
                            }`}
                          >
                            Approved
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickThird((prev) => ({ ...prev, type: "WALKIN" }))}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer ${
                              quickThird.type === "WALKIN"
                                ? "bg-navy-900 text-ivory border-navy-900"
                                : "bg-white text-mist border-navy-100"
                            }`}
                          >
                            Walk-in
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickThird({ type: "NONE", regId: "", customName: "" })}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer ${
                              quickThird.type === "NONE"
                                ? "bg-slate-200 text-slate-800 border-slate-300"
                                : "bg-white text-mist border-navy-100"
                            }`}
                          >
                            Leave Empty
                          </button>
                        </div>

                        {quickThird.type === "REGISTERED" && (
                          <Select
                            placeholder="Choose 3rd place winner..."
                            options={getQuickSlotOptions(3)}
                            value={quickThird.regId}
                            onChange={(val) => setQuickThird((prev) => ({ ...prev, regId: val }))}
                          />
                        )}
                        {quickThird.type === "WALKIN" && (
                          <Input
                            placeholder="Walk-in Second Runner-up name..."
                            value={quickThird.customName}
                            onChange={(e) =>
                              setQuickThird((prev) => ({ ...prev, customName: e.target.value }))
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="gold"
                    className="w-full font-bold shadow-sm"
                    isLoading={isSubmittingQuick}
                  >
                    <Medal className="w-4 h-4 mr-1.5" />
                    <span>Save Podium Standings</span>
                  </Button>
                </form>
              </Card>
            )}

            {/* FORM 3: Batch Award Form */}
            {creationMode === "batch" && !editingId && (
              <Card className="p-6 sm:p-7 bg-white border border-navy-100 rounded-2xl shadow-sm space-y-5">
                <div className="border-b border-navy-50 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gold-500" />
                    <h3 className="font-heading text-base font-bold text-navy-950">
                      Add Several With Same Award
                    </h3>
                  </div>
                  <p className="text-xs text-mist mt-1 leading-relaxed">
                    Tick approved participants and assign them an award in one transaction. Consecutive positions will automatically start at rank #{nextAvailableBatchPosition}.
                  </p>
                </div>

                {batchError && (
                  <div className="p-3.5 rounded-xl bg-danger-bg border border-danger/20 text-danger text-xs font-medium">
                    {batchError}
                  </div>
                )}

                <form onSubmit={handleBatchAwardSubmit} className="space-y-4">
                  {/* Award Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-navy-950">Award To Grant</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBatchAward("Participation")}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          batchAward === "Participation"
                            ? "bg-navy-900 text-ivory border-navy-900 shadow-xs"
                            : "bg-navy-50 text-mist hover:text-navy-950 border-navy-100"
                        }`}
                      >
                        Participation
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchAward("Honorable Mention")}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          batchAward === "Honorable Mention"
                            ? "bg-navy-900 text-ivory border-navy-900 shadow-xs"
                            : "bg-navy-50 text-mist hover:text-navy-950 border-navy-100"
                        }`}
                      >
                        Honorable Mention
                      </button>
                    </div>
                  </div>

                  {/* Participants List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-navy-950">
                        Select Participants ({batchSelectedIds.length} of {unassignedRegistrations.length})
                      </label>
                      {unassignedRegistrations.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (batchSelectedIds.length === unassignedRegistrations.length) {
                              setBatchSelectedIds([]);
                            } else {
                              setBatchSelectedIds(unassignedRegistrations.map((r) => r.id));
                            }
                          }}
                          className="text-[11px] font-bold text-gold-600 hover:text-gold-700 cursor-pointer"
                        >
                          {batchSelectedIds.length === unassignedRegistrations.length
                            ? "Deselect All"
                            : "Select All"}
                        </button>
                      )}
                    </div>

                    {unassignedRegistrations.length === 0 ? (
                      <div className="p-6 text-center text-xs text-mist bg-navy-50/50 rounded-xl border border-navy-100">
                        All approved participants already have results recorded for this event.
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto border border-navy-100 rounded-xl divide-y divide-navy-50 bg-white">
                        {unassignedRegistrations.map((reg) => {
                          const isSelected = batchSelectedIds.includes(reg.id);
                          const name = reg.teamName
                            ? `${reg.teamName} (Team • Led by ${reg.userName})`
                            : `${reg.userName}${reg.rollNumber ? ` (${reg.rollNumber})` : ""}`;

                          return (
                            <label
                              key={reg.id}
                              className={`flex items-center gap-3 p-2.5 text-xs font-medium cursor-pointer transition-colors ${
                                isSelected ? "bg-gold-50/50 text-navy-950" : "hover:bg-navy-50/60 text-navy-900"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setBatchSelectedIds((prev) =>
                                    isSelected ? prev.filter((id) => id !== reg.id) : [...prev, reg.id]
                                  );
                                }}
                                className="shrink-0 text-navy-900"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-gold-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-mist" />
                                )}
                              </button>
                              <span className="truncate">{name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="gold"
                    className="w-full font-bold shadow-sm"
                    isLoading={isSubmittingBatch}
                    disabled={unassignedRegistrations.length === 0 || batchSelectedIds.length === 0}
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    <span>
                      Grant &ldquo;{batchAward}&rdquo; to {batchSelectedIds.length} Participant(s)
                    </span>
                  </Button>
                </form>
              </Card>
            )}
          </div>

          {/* Right Column: Existing Results List & Certificate Manager */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-navy-100">
              <h3 className="font-heading text-lg font-extrabold text-navy-950 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-gold-500" />
                <span>Current Standings ({results.length})</span>
              </h3>
              <span className="text-xs text-mist">Sorted by rank</span>
            </div>

            {/* Quick Podium Swap Bar (only visible when at least 2 podium positions are assigned) */}
            {((existingFirst && existingSecond) ||
              (existingSecond && existingThird) ||
              (existingFirst && existingThird)) && (
              <div className="p-3 bg-navy-50/70 border border-navy-100 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-navy-950">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-gold-500" />
                  <span>Swap Podium Ranks:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {existingFirst && existingSecond && (
                    <button
                      type="button"
                      disabled={isSwapping}
                      onClick={() => handleSwapPodium(existingFirst.id, existingSecond.id)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-navy-200 text-navy-900 font-semibold hover:bg-gold-50 hover:border-gold-300 transition-colors cursor-pointer text-[11px] disabled:opacity-50"
                    >
                      Swap 1st & 2nd
                    </button>
                  )}
                  {existingSecond && existingThird && (
                    <button
                      type="button"
                      disabled={isSwapping}
                      onClick={() => handleSwapPodium(existingSecond.id, existingThird.id)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-navy-200 text-navy-900 font-semibold hover:bg-gold-50 hover:border-gold-300 transition-colors cursor-pointer text-[11px] disabled:opacity-50"
                    >
                      Swap 2nd & 3rd
                    </button>
                  )}
                  {existingFirst && existingThird && (
                    <button
                      type="button"
                      disabled={isSwapping}
                      onClick={() => handleSwapPodium(existingFirst.id, existingThird.id)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-navy-200 text-navy-900 font-semibold hover:bg-gold-50 hover:border-gold-300 transition-colors cursor-pointer text-[11px] disabled:opacity-50"
                    >
                      Swap 1st & 3rd
                    </button>
                  )}
                </div>
              </div>
            )}

            {results.length === 0 ? (
              <Card className="p-12 text-center text-mist bg-white rounded-2xl border border-navy-100 space-y-2">
                <p className="font-semibold text-sm">No results recorded yet.</p>
                <p className="text-xs">
                  Use the options on the left to add podium winners or batch participation results.
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
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-mist pt-0.5">
                              <span className="font-semibold text-navy-800">
                                {res.award || "Award"}
                              </span>
                              {res.score && (
                                <span>
                                  • Score: <strong className="font-mono text-navy-900">{res.score}</strong>
                                </span>
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
                            className="p-1.5 rounded-lg text-mist hover:text-navy-950 hover:bg-navy-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(res.id)}
                            title="Delete Result"
                            className="p-1.5 rounded-lg text-mist hover:text-danger hover:bg-rose-50 transition-colors cursor-pointer"
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

                              <button
                                type="button"
                                onClick={() => handleCertificateRemove(res.id)}
                                disabled={uploadingCertId === res.id || removingCertId === res.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                {removingCertId === res.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Removing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Remove</span>
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <label
                              htmlFor={`cert-upload-${res.id}`}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-navy-900 text-ivory hover:bg-navy-800 transition-colors shadow-2xs cursor-pointer ${
                                uploadingCertId === res.id ? "opacity-50 pointer-events-none" : ""
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
                                  <span>Upload Certificate</span>
                                </>
                              )}
                            </label>
                          )}
                        </div>
                      </div>
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
