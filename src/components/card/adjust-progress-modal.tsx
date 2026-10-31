"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface AdjustProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: {
    id: string;
    front: string;
    deckName?: string;
    review: {
      repetitions: number;
      interval: number;
      masteryPercentage: number;
      masteryLabel: string;
      isDue: boolean;
      timeUntilDue: string;
    };
  } | null;
  onUpdated: () => void;
}

export function AdjustProgressModal({
  isOpen,
  onClose,
  card,
  onUpdated,
}: AdjustProgressModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [customDays, setCustomDays] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (card) {
      const pct = card.review.masteryPercentage;
      if (pct >= 100) setSelectedLevel(4);
      else if (pct >= 75) setSelectedLevel(3);
      else if (pct >= 45) setSelectedLevel(2);
      else if (pct > 0) setSelectedLevel(1);
      else setSelectedLevel(0);

      setCustomDays(Math.max(1, card.review.interval || 1));
    }
  }, [card]);

  if (!isOpen || !card) return null;

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cards/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          action: "set_mastery_level",
          level: selectedLevel,
          daysUntilDue: selectedLevel === 0 ? 0 : customDays,
        }),
      });

      if (!res.ok) throw new Error("Failed to update progress");

      onUpdated();
      onClose();
    } catch {
      // handled by parent or toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cards/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          action,
        }),
      });

      if (!res.ok) throw new Error("Failed to apply action");

      onUpdated();
      onClose();
    } catch {
      // error handled
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              <h2 className="text-lg font-black tracking-tight text-foreground">
                Adjust Learning Progress
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Change learning percentage or control how often this card appears.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground text-sm"
          >
            ✕
          </button>
        </div>

        {/* Card Info Box */}
        <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-foreground">{card.front}</span>
            {card.deckName && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground">
                {card.deckName}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Current: <strong className="text-foreground">{card.review.masteryPercentage}%</strong> ({card.review.masteryLabel})
            </span>
            <span>
              {card.review.isDue ? (
                <span className="text-amber-500 font-bold">⚡ Ready now</span>
              ) : (
                <span>Next: {card.review.timeUntilDue}</span>
              )}
            </span>
          </div>
        </div>

        {/* Mastery Level Options */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Select Mastery Percentage:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                level: 0,
                pct: "0%",
                label: "New / Reset",
                desc: "Appear immediately in today's study queue",
                color: "border-slate-500/30 hover:border-slate-500",
                activeColor: "bg-slate-500/15 border-slate-500 text-foreground",
              },
              {
                level: 1,
                pct: "25%",
                label: "Learning",
                desc: "Appear very often (review tomorrow)",
                color: "border-amber-500/30 hover:border-amber-500",
                activeColor: "bg-amber-500/15 border-amber-500 text-foreground",
              },
              {
                level: 2,
                pct: "50%",
                label: "In Progress",
                desc: "Moderate practice pace (review in 3 days)",
                color: "border-blue-500/30 hover:border-blue-500",
                activeColor: "bg-blue-500/15 border-blue-500 text-foreground",
              },
              {
                level: 3,
                pct: "75%",
                label: "Advanced",
                desc: "Strong recall (review in 7 days)",
                color: "border-indigo-500/30 hover:border-indigo-500",
                activeColor: "bg-indigo-500/15 border-indigo-500 text-foreground",
              },
              {
                level: 4,
                pct: "100%",
                label: "Mastered ✨",
                desc: "Already learned! Stop showing in daily review",
                color: "border-emerald-500/30 hover:border-emerald-500 sm:col-span-2",
                activeColor: "bg-emerald-500/15 border-emerald-500 text-foreground sm:col-span-2",
              },
            ].map((opt) => (
              <button
                key={opt.level}
                type="button"
                onClick={() => setSelectedLevel(opt.level)}
                className={`flex flex-col text-left p-3 rounded-2xl border transition-all ${
                  selectedLevel === opt.level ? opt.activeColor : `bg-card border-border/70 ${opt.color}`
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-black">{opt.label}</span>
                  <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-background/80">
                    {opt.pct}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Customization (only if not 0% and not 100%) */}
        {selectedLevel > 0 && selectedLevel < 4 && (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3.5 space-y-2">
            <label className="block text-xs font-bold text-foreground">
              Review interval (days until next review):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="90"
                value={customDays}
                onChange={(e) => setCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground">day(s) from today</span>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting}
            className="font-bold shadow-xs bg-primary text-primary-foreground"
          >
            {isSubmitting ? "Saving..." : "Save Progress"}
          </Button>
        </div>
      </div>
    </div>
  );
}
