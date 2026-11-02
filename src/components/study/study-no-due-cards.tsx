"use client";

import Link from "next/link";
import { getLanguage } from "@/lib/languages";

interface NoDueCardsProps {
  deckId: string;
  deckName: string;
  activeLanguage?: string;
  onAdvanceDay: () => void;
  isAdvancing: boolean;
  dailyGoalTarget?: number;
  dailyGoalCurrent?: number;
}

export function NoDueCards({
  deckId,
  deckName,
  activeLanguage = "en",
  onAdvanceDay,
  isAdvancing,
  dailyGoalTarget = 20,
  dailyGoalCurrent = 0,
}: NoDueCardsProps) {
  const currentLang = getLanguage(activeLanguage);
  const backUrl = deckId === "all" ? `/dashboard?lang=${encodeURIComponent(activeLanguage)}` : `/deck/${deckId}`;
  const backLabel = deckId === "all" ? `${currentLang.name} Dashboard` : "Deck";
  const remainingGoal = Math.max(0, dailyGoalTarget - dailyGoalCurrent);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center animate-in fade-in duration-300">
      <div className="mb-4 text-6xl">{remainingGoal > 0 ? "🎯" : "🎉"}</div>
      <span className="inline-block rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">
        {currentLang.flag} {currentLang.name} Track
      </span>
      <h1 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
        {remainingGoal > 0 ? "Daily Goal in Progress" : "All cards caught up!"}
      </h1>
      <p className="text-muted-foreground mb-4 max-w-sm text-sm">
        {remainingGoal > 0
          ? `You have studied ${dailyGoalCurrent} cards today. Study ${remainingGoal} more card${remainingGoal === 1 ? "" : "s"} to complete your daily goal of ${dailyGoalTarget}.`
          : deckId === "all"
          ? `According to your spaced repetition schedule, all cards in your ${currentLang.name} track are currently up to date.`
          : `According to your spaced repetition memory schedule, all vocabulary in ${deckName} is currently reviewed.`}
      </p>

      {remainingGoal > 0 ? (
        <div className="mb-6 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3 max-w-sm text-xs text-foreground font-medium flex items-center justify-between gap-3">
          <span>🎯 Daily Goal Progress:</span>
          <span className="font-bold text-primary font-mono">
            {dailyGoalCurrent} / {dailyGoalTarget} ({remainingGoal} left to reach goal)
          </span>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
          ✨ 100% Daily Goal Achieved!
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href={deckId === "all" ? `/study/all?lang=${encodeURIComponent(activeLanguage)}&mode=all` : `/study/${deckId}?mode=all`}
          className="w-full rounded-2xl bg-primary hover:opacity-90 py-3.5 text-primary-foreground font-bold text-center transition-opacity shadow-md flex items-center justify-center gap-2"
        >
          <span>🎯</span> {remainingGoal > 0 ? `Study Remaining to Reach Goal (${remainingGoal} left)` : "Free Practice Mode"}
        </Link>

        <Link
          href={`/decks?lang=${encodeURIComponent(activeLanguage)}`}
          className="w-full rounded-2xl border border-border bg-card py-3 text-foreground font-semibold hover:bg-muted transition-colors text-sm flex items-center justify-center gap-2"
        >
          <span>🗂️</span> Manage {currentLang.name} Decks
        </Link>

        <button
          onClick={onAdvanceDay}
          disabled={isAdvancing}
          className="w-full rounded-2xl border border-dashed border-border bg-card py-2.5 text-foreground font-semibold hover:bg-muted transition-colors text-xs flex items-center justify-center gap-2"
        >
          <span>⏩</span> {isAdvancing ? "Advancing day..." : "Simulate Next Day (+1 Day)"}
        </button>

        <Link
          href={backUrl}
          className="w-full rounded-2xl border border-border py-3 text-muted-foreground hover:text-foreground font-medium text-sm text-center transition-colors"
        >
          ← Back to {backLabel}
        </Link>
      </div>
    </div>
  );
}
