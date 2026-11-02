"use client";

import Link from "next/link";
import { getLanguage } from "@/lib/languages";

interface NoDueCardsProps {
  deckId: string;
  deckName: string;
  activeLanguage?: string;
  onAdvanceDay: () => void;
  isAdvancing: boolean;
}

export function NoDueCards({
  deckId,
  deckName,
  activeLanguage = "en",
  onAdvanceDay,
  isAdvancing,
}: NoDueCardsProps) {
  const currentLang = getLanguage(activeLanguage);
  const backUrl = deckId === "all" ? `/dashboard?lang=${encodeURIComponent(activeLanguage)}` : `/deck/${deckId}`;
  const backLabel = deckId === "all" ? `${currentLang.name} Dashboard` : "Deck";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center animate-in fade-in duration-300">
      <div className="mb-4 text-6xl">🎉</div>
      <span className="inline-block rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">
        {currentLang.flag} {currentLang.name} Track
      </span>
      <h1 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
        All cards caught up!
      </h1>
      <p className="text-muted-foreground mb-8 max-w-sm text-sm">
        {deckId === "all"
          ? `According to your spaced repetition schedule, all cards in your ${currentLang.name} track are currently up to date.`
          : `According to your spaced repetition memory schedule, all vocabulary in ${deckName} is currently reviewed.`}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href={deckId === "all" ? `/study/all?lang=${encodeURIComponent(activeLanguage)}&mode=all` : `/study/${deckId}?mode=all`}
          className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 py-3.5 text-white font-bold text-center transition-colors shadow-md flex items-center justify-center gap-2"
        >
          <span>🎯</span> Free Practice Mode
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
