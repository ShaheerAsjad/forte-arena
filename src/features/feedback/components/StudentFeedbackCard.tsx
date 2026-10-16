"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Star, MessageSquareQuote, CheckCircle2, AlertCircle, Edit3, X } from "lucide-react";
import { submitFeedbackAction } from "../feedback.actions";

interface SavedFeedback {
  id: string;
  rating: number;
  comment: string | null;
  updatedAt: Date | string;
}

interface StudentFeedbackCardProps {
  eventId: string;
  eventTitle: string;
  initialFeedback?: SavedFeedback | null;
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export function StudentFeedbackCard({
  eventId,
  eventTitle,
  initialFeedback = null,
}: StudentFeedbackCardProps) {
  const [feedback, setFeedback] = useState<SavedFeedback | null>(initialFeedback);
  const [isEditing, setIsEditing] = useState<boolean>(!initialFeedback);
  const [rating, setRating] = useState<number>(initialFeedback?.rating ?? 5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>(initialFeedback?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeRating = hoverRating ?? rating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5 stars.");
      return;
    }

    startTransition(async () => {
      const res = await submitFeedbackAction({
        eventId,
        rating,
        comment: comment.trim() || null,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      setFeedback({
        id: res.data.id,
        rating: res.data.rating,
        comment: res.data.comment,
        updatedAt: res.data.updatedAt,
      });
      setIsEditing(false);
      setSuccessNotice("Thank you! Your feedback has been recorded.");
    });
  };

  const handleCancelEdit = () => {
    if (feedback) {
      setRating(feedback.rating);
      setComment(feedback.comment ?? "");
      setIsEditing(false);
      setError(null);
    }
  };

  return (
    <Card id="feedback" className="p-6 bg-white border border-navy-100 shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-3 border-b border-navy-50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gold-100 border border-gold-300 flex items-center justify-center text-gold-700 shrink-0">
            <MessageSquareQuote className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy-950 font-heading">
              Event Experience & Feedback
            </h2>
            <p className="text-xs text-mist">
              Share your honest feedback to help improve future editions of {eventTitle}.
            </p>
          </div>
        </div>

        {feedback && !isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsEditing(true);
              setSuccessNotice(null);
            }}
            className="text-xs gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Feedback</span>
          </Button>
        )}
      </div>

      {successNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-danger-bg border border-danger/20 text-danger text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {feedback && !isEditing ? (
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= feedback.rating
                      ? "text-gold-500 fill-gold-500"
                      : "text-navy-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-navy-950">
              {feedback.rating} / 5 · {RATING_LABELS[feedback.rating]}
            </span>
            <span className="text-[11px] text-mist ml-auto">
              Submitted{" "}
              {new Date(feedback.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-navy-50/60 border border-navy-100 text-sm text-navy-900 leading-relaxed whitespace-pre-line">
            {feedback.comment || (
              <span className="text-mist italic text-xs">No written comment provided.</span>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-mist">
              Rating (1 to 5 Stars) *
            </label>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1"
                onMouseLeave={() => setHoverRating(null)}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    className="p-1 rounded-lg hover:bg-gold-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400"
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`w-6 h-6 transition-all ${
                        star <= activeRating
                          ? "text-gold-500 fill-gold-500 scale-105"
                          : "text-navy-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-navy-900">
                {activeRating} / 5 · {RATING_LABELS[activeRating]}
              </span>
            </div>
          </div>

          {/* Comment textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-mist">
                Optional Comment
              </label>
              <span className="text-[11px] text-mist font-mono">
                {comment.length} / 1000
              </span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              placeholder="What did you think of the tournament organization, judges, rules, and venue?"
              rows={4}
              maxLength={1000}
              className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 bg-white text-navy-950 text-sm focus:outline-none focus:ring-2 focus:ring-navy-900 transition-shadow resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            {feedback && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isPending}
                className="gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </Button>
            )}
            <Button
              type="submit"
              variant="gold"
              size="sm"
              disabled={isPending}
              className="font-bold shadow-xs"
            >
              {isPending
                ? "Saving..."
                : feedback
                ? "Update Feedback"
                : "Submit Feedback"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
