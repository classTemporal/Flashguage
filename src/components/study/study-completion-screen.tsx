"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getLanguage } from "@/lib/languages";

interface CompletionScreenProps {
  deckId: string;
  deckName: string;
  activeLanguage?: string;
  totalReviewed: number;
  streak: number;
  againCount: number;
  reviewLimit?: number;
  sessionBreakMinutes?: number;
  dailyGoalTarget?: number;
  initialDailyGoalCurrent?: number;
  onAdvanceDay: () => void;
  isAdvancing: boolean;
  isCramMode: boolean;
}

export function CompletionScreen({
  deckId,
  deckName,
  activeLanguage = "en",
  totalReviewed,
  streak,
  againCount,
  reviewLimit = 20,
  sessionBreakMinutes = 5,
  dailyGoalTarget = 20,
  initialDailyGoalCurrent = 0,
  onAdvanceDay,
  isAdvancing,
  isCramMode,
}: CompletionScreenProps) {
  const currentLang = getLanguage(activeLanguage);
  const retainedPct = totalReviewed > 0 ? Math.round(((totalReviewed - againCount) / totalReviewed) * 100) : 100;
  const isGoalReached = !isCramMode && initialDailyGoalCurrent + totalReviewed >= dailyGoalTarget;
  const backUrl = deckId === "all" ? `/dashboard?lang=${encodeURIComponent(activeLanguage)}` : `/deck/${deckId}`;
  const backLabel = deckId === "all" ? `Back to ${currentLang.name} Dashboard` : "Back to Deck";

  const [remainingSecs, setRemainingSecs] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(`flashguage_cooldown_${activeLanguage}`);
      if (raw) return Math.max(0, Math.ceil((parseInt(raw, 10) - Date.now()) / 1000));
    } catch {}
    return sessionBreakMinutes * 60;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      try {
        const raw = localStorage.getItem(`flashguage_cooldown_${activeLanguage}`);
        if (raw) {
          const diff = Math.max(0, Math.ceil((parseInt(raw, 10) - Date.now()) / 1000));
          setRemainingSecs(diff);
        }
      } catch {}
    }, 1000);
    return () => clearInterval(timer);
  }, [activeLanguage]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleSkipBreak = () => {
    try {
      localStorage.removeItem(`flashguage_cooldown_${activeLanguage}`);
      window.dispatchEvent(new Event("storage"));
    } catch {}
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center animate-in fade-in duration-300">
      <div className="relative mb-6">
        <div className="text-7xl animate-bounce">{isGoalReached ? "🏆" : "🧠"}</div>
      </div>

      <span className="inline-block rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">
        {isCramMode
          ? "Free Practice Complete"
          : isGoalReached
          ? "🎉 Daily Goal Achieved (100%)"
          : "Session Batch Completed 🎉"}
      </span>

      <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-2 tracking-tight">
        {isGoalReached ? "Daily Goal Completed! 🎉" : "Great study session!"}
      </h1>
      <p className="text-muted-foreground mb-6 max-w-md text-sm">
        {isGoalReached ? (
          <>
            You completed your daily target of <strong className="text-foreground">{dailyGoalTarget} cards</strong> today! Time to rest and let your memory consolidate.
          </>
        ) : (
          <>
            You reviewed <strong className="text-foreground">{totalReviewed}</strong> cards from <strong className="text-foreground">{deckName}</strong>.
          </>
        )}
      </p>

      {/* Brain Break Cooldown Card */}
      {!isCramMode && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 max-w-sm w-full mb-6 text-center space-y-2.5 shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <span>☕</span>
            <span>Brain Break Active (Cooldown)</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You completed your study batch of <strong>{totalReviewed}</strong> card{totalReviewed === 1 ? "" : "s"} (session limit: {reviewLimit}). Take a short <strong>{sessionBreakMinutes}-minute</strong> cognitive break to prevent mental fatigue and consolidate memory before your next batch.
          </p>

          {remainingSecs > 0 ? (
            <div className="pt-2">
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-wider font-mono block">
                ⏳ {formatTimer(remainingSecs)}
              </span>
              <p className="text-[10px] text-muted-foreground mt-1">until your next study batch</p>
            </div>
          ) : (
            <div className="pt-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              🎉 Break complete! You are ready for your next study batch.
            </div>
          )}
        </div>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6">
        <div className="rounded-2xl bg-card border border-border p-3.5 flex flex-col items-center">
          <span className="text-xs text-muted-foreground font-semibold">Reviewed</span>
          <span className="text-2xl font-black text-foreground mt-1">{totalReviewed}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">cards</span>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3.5 flex flex-col items-center">
          <span className="text-xs text-muted-foreground font-semibold">Best Streak</span>
          <span className="text-2xl font-black text-amber-500 mt-1">🔥 {streak}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">consecutive</span>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3.5 flex flex-col items-center">
          <span className="text-xs text-muted-foreground font-semibold">Retention</span>
          <span className="text-2xl font-black text-emerald-500 mt-1">{retainedPct}%</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">accuracy</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2.5 w-full max-w-sm">
        <Link
          href={backUrl}
          className="w-full rounded-2xl bg-primary py-3.5 text-primary-foreground font-bold text-center hover:opacity-90 transition-opacity shadow-md"
        >
          {backLabel}
        </Link>

        {remainingSecs > 0 && !isCramMode && (
          <button
            type="button"
            onClick={handleSkipBreak}
            className="w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 py-3 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/20 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <span>⚡</span> Skip Break & Start Next Batch Now
          </button>
        )}

        <button
          onClick={onAdvanceDay}
          disabled={isAdvancing}
          className="w-full rounded-2xl border border-border bg-card py-3 text-foreground font-semibold hover:bg-muted transition-colors text-sm flex items-center justify-center gap-2"
        >
          <span>⏩</span> {isAdvancing ? "Simulating next day..." : "Simulate Time (+1 Day)"}
        </button>

        <Link
          href={deckId === "all" ? `/study/all?lang=${encodeURIComponent(activeLanguage)}&mode=all` : `/study/${deckId}?mode=all`}
          className="w-full rounded-2xl border border-transparent py-2.5 text-muted-foreground hover:text-foreground font-medium text-xs transition-colors"
        >
          Review Again in Free Practice Mode
        </Link>
      </div>
    </div>
  );
}
