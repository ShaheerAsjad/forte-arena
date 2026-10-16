"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  createAnnouncementAction,
  updateAnnouncementAction,
  togglePinnedAnnouncementAction,
  toggleVisibleAnnouncementAction,
  deleteAnnouncementAction,
} from "@/features/admin/announcements.actions";
import {
  isValidHttpUrl,
  type AnnouncementFormValues,
} from "@/features/announcements/announcements.rules";
import type { AdminAnnouncementItem } from "@/features/announcements/repositories/announcements.repository";
import {
  Megaphone,
  Plus,
  Pin,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ExternalLink,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Sparkles,
} from "lucide-react";

interface AdminAnnouncementsManagerProps {
  initialAnnouncements: AdminAnnouncementItem[];
  events: Array<{ id: string; title: string; slug: string }>;
}

export function AdminAnnouncementsManager({
  initialAnnouncements,
  events,
}: AdminAnnouncementsManagerProps) {
  const [announcements, setAnnouncements] =
    useState<AdminAnnouncementItem[]>(initialAnnouncements);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [eventId, setEventId] = useState<string>("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filter / Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisibility, setFilterVisibility] = useState<"ALL" | "VISIBLE" | "HIDDEN">("ALL");

  const eventSelectOptions = [
    { value: "", label: "No Related Event (Global Bulletin)" },
    ...events.map((ev) => ({
      value: ev.id,
      label: ev.title,
    })),
  ];

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setPinned(false);
    setIsVisible(true);
    setEventId("");
    setLinkUrl("");
    setLinkLabel("");
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditClick = (item: AdminAnnouncementItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setBody(item.body);
    setPinned(item.pinned);
    setIsVisible(item.isVisible);
    setEventId(item.eventId || "");
    setLinkUrl(item.linkUrl || "");
    setLinkLabel(item.linkLabel || "");
    setFormError(null);
    setIsFormOpen(true);
    window.scrollTo({ top: 100, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    const cleanLinkUrl = linkUrl.trim();
    const cleanLinkLabel = linkLabel.trim();

    if (cleanTitle.length < 3) {
      setFormError("Title must be at least 3 characters.");
      return;
    }
    if (cleanBody.length < 5) {
      setFormError("Body must be at least 5 characters.");
      return;
    }
    if (cleanLinkUrl && !isValidHttpUrl(cleanLinkUrl)) {
      setFormError("Link URL must start with http:// or https://");
      return;
    }
    if (cleanLinkUrl && !cleanLinkLabel) {
      setFormError("Please provide a label for your link.");
      return;
    }

    const payload: AnnouncementFormValues = {
      title: cleanTitle,
      body: cleanBody,
      pinned,
      isVisible,
      eventId: eventId || null,
      linkUrl: cleanLinkUrl || null,
      linkLabel: cleanLinkLabel || null,
    };

    setIsSubmitting(true);
    try {
      if (editingId) {
        const res = await updateAnnouncementAction(editingId, payload);
        if (!res.ok) {
          setFormError(res.error);
          return;
        }

        const linkedEv = events.find((ev) => ev.id === eventId);
        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === editingId
              ? {
                  ...a,
                  title: cleanTitle,
                  body: cleanBody,
                  pinned,
                  isVisible,
                  eventId: eventId || null,
                  linkUrl: cleanLinkUrl || null,
                  linkLabel: cleanLinkLabel || null,
                  event: linkedEv
                    ? { id: linkedEv.id, title: linkedEv.title, slug: linkedEv.slug }
                    : null,
                }
              : a
          )
        );

        toast.success("Announcement updated successfully!");
        resetForm();
      } else {
        const res = await createAnnouncementAction(payload);
        if (!res.ok) {
          setFormError(res.error);
          return;
        }

        const linkedEv = events.find((ev) => ev.id === eventId);
        const newItem: AdminAnnouncementItem = {
          id: res.data.id,
          title: cleanTitle,
          body: cleanBody,
          pinned,
          isVisible,
          publishedAt: new Date(),
          createdAt: new Date(),
          eventId: eventId || null,
          linkUrl: cleanLinkUrl || null,
          linkLabel: cleanLinkLabel || null,
          event: linkedEv
            ? { id: linkedEv.id, title: linkedEv.title, slug: linkedEv.slug }
            : null,
          createdBy: {
            id: "current-user",
            name: "Organizer",
          },
        };

        setAnnouncements((prev) => [newItem, ...prev]);
        toast.success("Announcement broadcast published!");
        resetForm();
      }
    } catch {
      setFormError("An unexpected error occurred while saving announcement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePinned = async (item: AdminAnnouncementItem) => {
    setActionLoadingId(item.id);
    const newPinned = !item.pinned;
    try {
      const res = await togglePinnedAnnouncementAction(item.id, newPinned);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAnnouncements((prev) =>
        prev
          .map((a) => (a.id === item.id ? { ...a, pinned: newPinned } : a))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
      );
      toast.success(newPinned ? "Announcement pinned to top!" : "Announcement unpinned.");
    } catch {
      toast.error("Failed to update pinned state.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleVisible = async (item: AdminAnnouncementItem) => {
    setActionLoadingId(item.id);
    const newVisible = !item.isVisible;
    try {
      const res = await toggleVisibleAnnouncementAction(item.id, newVisible);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, isVisible: newVisible } : a))
      );
      toast.success(
        newVisible
          ? "Announcement is now visible to the public."
          : "Announcement hidden from public feed."
      );
    } catch {
      toast.error("Failed to update visibility.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this announcement?")) {
      return;
    }
    setActionLoadingId(id);
    try {
      const res = await deleteAnnouncementAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement deleted.");
      if (editingId === id) resetForm();
    } catch {
      toast.error("Failed to delete announcement.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered list
  const filteredAnnouncements = announcements.filter((a) => {
    if (filterVisibility === "VISIBLE" && !a.isVisible) return false;
    if (filterVisibility === "HIDDEN" && a.isVisible) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        a.event?.title.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-navy-100 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gold-600 bg-gold-50 px-2.5 py-0.5 rounded-full border border-gold-300 flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Campus Bulletins Hub</span>
            </span>
            <span className="text-xs font-semibold text-mist">
              {announcements.length} Total Notices
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-navy-950">
            Announcements & Bulletins
          </h1>
          <p className="text-xs sm:text-sm text-mist max-w-2xl">
            Broadcast competition updates, schedule changes, venue alerts, and campus notices. Visible bulletins appear on the public home page and `/announcements`.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link href="/announcements" target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5">
              <span>View Public Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Button
            variant="gold"
            size="sm"
            onClick={handleOpenCreate}
            className="font-bold shadow-md shadow-gold-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>New Announcement</span>
          </Button>
        </div>
      </div>

      {/* Form Drawer / Card */}
      {isFormOpen && (
        <Card className="p-6 sm:p-8 bg-white border-2 border-gold-400/60 rounded-3xl shadow-lg space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-navy-50 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-500" />
              <h2 className="font-heading text-lg sm:text-xl font-bold text-navy-950">
                {editingId ? "Edit Announcement" : "Create New Announcement"}
              </h2>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="p-1.5 rounded-lg text-mist hover:text-navy-950 hover:bg-navy-50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-danger-bg border border-danger/20 text-danger text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-navy-950">
                Announcement Title <span className="text-danger">*</span>
              </label>
              <Input
                placeholder="e.g. Schedule Revision: Coding Hackathon finals moved to Lab 4"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
                required
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-navy-950">
                  Bulletin Body (Plain text with line breaks) <span className="text-danger">*</span>
                </label>
                <span className="text-[11px] text-mist">{body.length} / 3000 chars</span>
              </div>
              <textarea
                rows={5}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-navy-100 bg-white text-navy-950 placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition-all font-sans leading-relaxed"
                placeholder="Write the full announcement notice. Line breaks and paragraphs are preserved cleanly for viewers."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={3000}
                required
              />
            </div>

            {/* Optional Related Event */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-navy-950">
                Related Competition / Event (Optional)
              </label>
              <Select
                placeholder="Choose linked event if specific to a competition..."
                options={eventSelectOptions}
                value={eventId}
                onChange={(val) => setEventId(val)}
              />
              <p className="text-[11px] text-mist">
                If chosen, this update will also appear in the &quot;Updates&quot; section on the event detail page.
              </p>
            </div>

            {/* Optional Link & Label */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy-950">
                  External Link URL (Optional, http:// or https://)
                </label>
                <Input
                  placeholder="https://example.com/rulebook.pdf"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy-950">
                  Link Button Label
                </label>
                <Input
                  placeholder="e.g. Download Rulebook"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>

            {/* Pinned & Visible Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div
                onClick={() => setPinned(!pinned)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  pinned
                    ? "bg-gold-50/80 border-gold-300 text-navy-950"
                    : "bg-navy-50/40 border-navy-100 text-mist hover:text-navy-950"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Pin className={`w-4 h-4 ${pinned ? "text-gold-600" : "text-mist"}`} />
                  <div>
                    <p className="text-xs font-bold">Pinned to Top</p>
                    <p className="text-[11px] text-mist">
                      {pinned ? "Notice displays first in the bulletin feed" : "Standard chronological ordering"}
                    </p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                    pinned
                      ? "bg-gold-500 text-navy-950 border-gold-600"
                      : "bg-white border-navy-200"
                  }`}
                >
                  {pinned && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>

              <div
                onClick={() => setIsVisible(!isVisible)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  isVisible
                    ? "bg-emerald-50/80 border-emerald-300 text-navy-950"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isVisible ? (
                    <Eye className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  )}
                  <div>
                    <p className="text-xs font-bold">
                      {isVisible ? "Publicly Visible" : "Draft (Hidden)"}
                    </p>
                    <p className="text-[11px] text-mist">
                      {isVisible
                        ? "Visible to all visitors on the public site"
                        : "Hidden from public; only visible to organizers"}
                    </p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                    isVisible
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : "bg-white border-slate-300"
                  }`}
                >
                  {isVisible && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-navy-50">
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gold"
                size="sm"
                className="font-bold shadow-sm"
                isLoading={isSubmitting}
              >
                <span>{editingId ? "Save Changes" : "Broadcast Announcement"}</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-navy-100 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-mist absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-navy-100 bg-navy-50/40 text-navy-950 placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setFilterVisibility("ALL")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              filterVisibility === "ALL"
                ? "bg-navy-900 text-ivory border-navy-900 shadow-2xs"
                : "bg-white text-mist border-navy-100 hover:text-navy-950"
            }`}
          >
            All ({announcements.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterVisibility("VISIBLE")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              filterVisibility === "VISIBLE"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                : "bg-white text-mist border-navy-100 hover:text-navy-950"
            }`}
          >
            Visible ({announcements.filter((a) => a.isVisible).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterVisibility("HIDDEN")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              filterVisibility === "HIDDEN"
                ? "bg-slate-700 text-white border-slate-700 shadow-2xs"
                : "bg-white text-mist border-navy-100 hover:text-navy-950"
            }`}
          >
            Hidden ({announcements.filter((a) => !a.isVisible).length})
          </button>
        </div>
      </div>

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <Card className="p-12 text-center text-mist bg-white rounded-3xl border border-navy-100 space-y-2">
          <p className="font-semibold text-sm">No announcements found.</p>
          <p className="text-xs">
            {searchQuery
              ? "Try adjusting your search query."
              : "Click \"New Announcement\" to broadcast your first campus update."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAnnouncements.map((item) => {
            const formattedDate = new Date(item.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Card
                key={item.id}
                className={`p-5 sm:p-6 bg-white border transition-all rounded-2xl shadow-xs space-y-4 ${
                  item.pinned
                    ? "border-gold-300 ring-1 ring-gold-200/50"
                    : "border-navy-100 hover:border-navy-200"
                }`}
              >
                {/* Header row: Badges, Date, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.pinned && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-800 bg-gold-100 px-2.5 py-0.5 rounded-full border border-gold-300">
                        <Pin className="w-3 h-3 text-gold-600" />
                        <span>Pinned</span>
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        item.isVisible
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-300"
                      }`}
                    >
                      {item.isVisible ? (
                        <>
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span>Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-slate-500" />
                          <span>Hidden (Draft)</span>
                        </>
                      )}
                    </span>

                    {item.event && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy-800 bg-navy-50 px-2.5 py-0.5 rounded-full border border-navy-100">
                        <Layers className="w-3 h-3 text-navy-500" />
                        <span>Event: {item.event.title}</span>
                      </span>
                    )}

                    <span className="text-xs text-mist flex items-center gap-1 ml-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formattedDate}</span>
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={actionLoadingId === item.id}
                      onClick={() => handleTogglePinned(item)}
                      title={item.pinned ? "Unpin notice" : "Pin notice to top"}
                      className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        item.pinned
                          ? "bg-gold-50 text-gold-700 border-gold-300 hover:bg-gold-100"
                          : "bg-white text-mist border-navy-100 hover:text-navy-950 hover:bg-navy-50"
                      }`}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={actionLoadingId === item.id}
                      onClick={() => handleToggleVisible(item)}
                      title={item.isVisible ? "Hide from public" : "Make visible to public"}
                      className="p-1.5 rounded-lg border border-navy-100 bg-white text-mist hover:text-navy-950 hover:bg-navy-50 transition-colors cursor-pointer"
                    >
                      {item.isVisible ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEditClick(item)}
                      title="Edit announcement"
                      className="p-1.5 rounded-lg border border-navy-100 bg-white text-mist hover:text-navy-950 hover:bg-navy-50 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={actionLoadingId === item.id}
                      onClick={() => handleDelete(item.id)}
                      title="Delete announcement"
                      className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-heading text-base sm:text-lg font-bold text-navy-950">
                  {item.title}
                </h3>

                {/* Body (rendered safely as plain text preserving whitespace) */}
                <p className="text-xs sm:text-sm text-ink/80 leading-relaxed whitespace-pre-line">
                  {item.body}
                </p>

                {/* Optional Link */}
                {item.linkUrl && item.linkLabel && (
                  <div className="pt-1">
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-900 bg-navy-50 hover:bg-gold-50 border border-navy-200 hover:border-gold-300 px-3 py-1.5 rounded-xl transition-all"
                    >
                      <span>{item.linkLabel}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-gold-600" />
                    </a>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
