"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";

interface DailyGoalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activeLanguage?: string;
  current?: number;
  goal?: number;
}

export function DailyGoalDialog({
  isOpen,
  onClose,
  activeLanguage = "en",
  current = 20,
  goal = 20,
}: DailyGoalDialogProps) {
  const router = useRouter();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleContinuePractice = () => {
    onClose();
    router.push(`/study/all?lang=${encodeURIComponent(activeLanguage)}&mode=all`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-primary/10 animate-in zoom-in-95 duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with celebratory icon & badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 text-2xl">
              🎯
            </div>
            <div>
              <span className="inline-block rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                Daily Goal Complete!
              </span>
              <h2 id="goal-dialog-title" className="text-lg font-bold text-foreground mt-0.5">
                Ready for Practice?
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Current status pill */}
        <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-2.5 mb-4 text-xs">
          <span className="text-muted-foreground font-medium">Daily Target Achieved</span>
          <span className="font-bold text-foreground">
            {current} / {goal} cards today (100%)
          </span>
        </div>

        {/* Cognitive Science Advisory Box */}
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 mb-5 text-xs text-muted-foreground leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400 mb-1.5 text-xs">
            <span>🧠</span>
            <span>Cognitive Science & Memory Spacing</span>
          </div>
          <p className="mb-2">
            Long-term memory retention relies on <strong>synaptic consolidation</strong>, which occurs when your brain is resting or during sleep — not during excessive repetition.
          </p>
          <p>
            Spaced repetition research shows that studying beyond your target in the same 24-hour cycle yields <em>diminishing returns</em> and mental fatigue. Taking a break now optimizes recall efficiency.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-primary hover:bg-primary/90 py-3 text-sm font-bold text-primary-foreground transition-all shadow-md shadow-primary/25 flex items-center justify-center gap-2"
          >
            <span>☕</span>
            <span>Take a Break (Recommended)</span>
          </button>

          <button
            type="button"
            onClick={handleContinuePractice}
            className="w-full rounded-xl border border-border bg-card hover:bg-accent py-2.5 text-xs font-semibold text-foreground transition-colors flex items-center justify-center gap-2"
          >
            <span>⚡</span>
            <span>Continue with Free Practice</span>
          </button>
        </div>
      </div>
    </div>
  );
}
