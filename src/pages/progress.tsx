"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { AdjustProgressModal } from "@/components/card/adjust-progress-modal";
import { useToast } from "@/components/ui/toast";
import { invalidateAppCache } from "@/lib/cache";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to load data");
  }
  return res.json();
};

interface Deck {
  id: string;
  name: string;
}

interface CardProgressItem {
  id: string;
  deckId: string;
  deckName: string;
  front: string;
  back: string;
  tags: string[];
  media?: {
    imageUrl?: string;
    phonetic?: string;
    partOfSpeech?: string;
    examples?: string[];
  } | null;
  createdAt: string;
  review: {
    id: string | null;
    repetitions: number;
    interval: number;
    easeFactor: number;
    dueDate: string;
    lastReview: string | null;
    isDue: boolean;
    timeUntilDue: string;
    masteryPercentage: number;
    masteryLabel: string;
    masteryColorClass: string;
    badgeBg: string;
    badgeText: string;
  };
}

interface ProgressResponse {
  cards: CardProgressItem[];
  stats: {
    totalCount: number;
    dueCount: number;
    inProgressCount: number;
    masteredCount: number;
    newCount: number;
    averageMastery: number;
  };
}

export default function ProgressPage() {
  const { showToast } = useToast();

  const [selectedDeckId, setSelectedDeckId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "due" | "in_progress" | "mastered" | "new">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"due" | "mastery_asc" | "mastery_desc" | "alpha">("due");

  const [adjustingCard, setAdjustingCard] = useState<CardProgressItem | null>(null);
  const [actingCardId, setActingCardId] = useState<string | null>(null);

  // Fetch decks for filtering dropdown
  const { data: decks } = useSWR<Deck[]>("/api/decks", fetcher);

  // Fetch progress cards
  const progressUrl = `/api/cards/progress?deckId=${encodeURIComponent(selectedDeckId)}&status=${encodeURIComponent(
    statusFilter
  )}&search=${encodeURIComponent(searchQuery)}`;

  const { data, error, isLoading, mutate } = useSWR<ProgressResponse>(progressUrl, fetcher);

  const cards = data?.cards || [];
  const stats = data?.stats || {
    totalCount: 0,
    dueCount: 0,
    inProgressCount: 0,
    masteredCount: 0,
    newCount: 0,
    averageMastery: 0,
  };

  // Sort processed cards
  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      if (sortBy === "due") {
        if (a.review.isDue && !b.review.isDue) return -1;
        if (!a.review.isDue && b.review.isDue) return 1;
        return new Date(a.review.dueDate).getTime() - new Date(b.review.dueDate).getTime();
      }
      if (sortBy === "mastery_asc") {
        return a.review.masteryPercentage - b.review.masteryPercentage;
      }
      if (sortBy === "mastery_desc") {
        return b.review.masteryPercentage - a.review.masteryPercentage;
      }
      if (sortBy === "alpha") {
        return a.front.localeCompare(b.front);
      }
      return 0;
    });
  }, [cards, sortBy]);

  // Audio pronunciation helper
  const handleSpeak = useCallback((text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Card progress action handler
  const handleCardAction = async (cardId: string, action: string, successMessage: string) => {
    setActingCardId(cardId);
    try {
      const res = await fetch("/api/cards/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, action }),
      });

      if (!res.ok) throw new Error("Failed to update card");

      await invalidateAppCache();
      await mutate();
      showToast(successMessage, "success");
    } catch {
      showToast("Error updating card schedule", "error");
    } finally {
      setActingCardId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* Title Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📈</span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Learning Progress
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Track mastery percentages, review timers, and customize repetition intervals.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {stats.dueCount > 0 ? (
              <Button
                href="/study"
                as="link"
                size="md"
                className="font-bold gap-2 text-xs shadow-xs bg-primary text-primary-foreground hover:opacity-90"
              >
                <span>🧠</span>
                <span>Study Due Cards ({stats.dueCount})</span>
              </Button>
            ) : (
              <Button
                href="/decks"
                as="link"
                variant="secondary"
                size="md"
                className="font-bold text-xs"
              >
                Browse Decks
              </Button>
            )}
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-8">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Cards</span>
            <p className="text-2xl font-black text-foreground mt-2">{stats.totalCount}</p>
            <span className="text-[11px] text-muted-foreground">All vocabulary</span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">In Progress</span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">{stats.inProgressCount}</p>
            <span className="text-[11px] text-muted-foreground">Active learning (1-99%)</span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ready to Review</span>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{stats.dueCount}</p>
            <span className="text-[11px] text-muted-foreground">Due for review today</span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mastered</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{stats.masteredCount}</p>
            <span className="text-[11px] text-muted-foreground">100% learned ✨</span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg Mastery</span>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{stats.averageMastery}%</p>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${stats.averageMastery}%` }}
              />
            </div>
          </div>
        </div>

        {/* Controls, Filters & Search */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 mb-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by word, definition, or tag..."
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Deck Selector */}
            <div className="sm:w-56 shrink-0">
              <select
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">📁 All Decks ({decks?.length || 0})</option>
                {decks?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="sm:w-52 shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="due">🕒 Due: Soonest First</option>
                <option value="mastery_asc">📈 Mastery: Lowest First</option>
                <option value="mastery_desc">✨ Mastery: Highest First</option>
                <option value="alpha">🔤 Word: A to Z</option>
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60">
            {[
              { id: "all", label: "All Cards", count: stats.totalCount },
              { id: "due", label: "⚡ Ready to Review", count: stats.dueCount },
              { id: "in_progress", label: "📈 In Progress", count: stats.inProgressCount },
              { id: "mastered", label: "✨ Mastered", count: stats.masteredCount },
              { id: "new", label: "🆕 New", count: stats.newCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === tab.id ? "bg-white/20 text-white" : "bg-background/80 text-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Card List / Grid */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse bg-card border border-border rounded-2xl p-5 h-56" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
            Failed to load progress data. Please refresh to try again.
          </div>
        )}

        {!isLoading && !error && sortedCards.length === 0 && (
          <div className="bg-card border border-border rounded-3xl p-12 text-center shadow-xs space-y-4">
            <div className="text-4xl">🌱</div>
            <h3 className="text-lg font-bold text-foreground">No cards found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {searchQuery || statusFilter !== "all" || selectedDeckId !== "all"
                ? "Try adjusting your filters or search query to see other cards."
                : "You don't have any cards yet. Create a deck or add cards from the dictionary to start learning!"}
            </p>
            {(searchQuery || statusFilter !== "all" || selectedDeckId !== "all") && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setSelectedDeckId("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {!isLoading && !error && sortedCards.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedCards.map((item) => {
              const isActing = actingCardId === item.id;
              const isMastered = item.review.masteryPercentage === 100;

              return (
                <div
                  key={item.id}
                  className={`bg-card border rounded-2xl p-5 shadow-xs transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
                    item.review.isDue
                      ? "border-amber-500/40 dark:border-amber-500/30"
                      : isMastered
                      ? "border-emerald-500/30 dark:border-emerald-500/20"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Word, Pronounce, and Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-black tracking-tight text-foreground truncate">
                            {item.front}
                          </h3>
                          <button
                            type="button"
                            onClick={() => handleSpeak(item.front)}
                            className="text-muted-foreground hover:text-primary transition-colors text-sm"
                            title="Pronounce word"
                          >
                            🔊
                          </button>
                        </div>
                        {item.media?.phonetic && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {item.media.phonetic}
                          </span>
                        )}
                      </div>

                      {/* Part of Speech or Deck badge */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                          {item.deckName}
                        </span>
                        {item.media?.partOfSpeech && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                            {item.media.partOfSpeech.toLowerCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Image preview thumbnail if available */}
                    {item.media?.imageUrl && (
                      <div className="relative h-28 w-full rounded-xl overflow-hidden border border-border/60 bg-muted/30">
                        <img
                          src={item.media.imageUrl}
                          alt={item.front}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Meaning / Definition */}
                    <p className="text-xs text-foreground/90 font-medium line-clamp-3 leading-relaxed">
                      {item.back}
                    </p>

                    {/* Example sentence if available */}
                    {item.media?.examples && item.media.examples[0] && (
                      <div className="text-[11px] italic text-muted-foreground border-l-2 border-primary/40 pl-2.5 py-0.5 line-clamp-2">
                        &ldquo;{item.media.examples[0]}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Progress & Next Review Countdown Section */}
                  <div className="mt-4 pt-3.5 border-t border-border/70 space-y-3">
                    {/* Mastery Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className={`inline-block h-2 w-2 rounded-full ${item.review.masteryColorClass}`} />
                          <span className="text-foreground">{item.review.masteryLabel}</span>
                        </span>
                        <span className="text-foreground">{item.review.masteryPercentage}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${item.review.masteryColorClass}`}
                          style={{ width: `${item.review.masteryPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Due Countdown & Stats */}
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {item.review.isDue ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            ⚡ Ready now
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            🕒 Next: {item.review.timeUntilDue}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px]">
                        {item.review.repetitions} review{item.review.repetitions !== 1 ? "s" : ""} • int: {item.review.interval}d
                      </span>
                    </div>

                    {/* Action Controls */}
                    <div className="pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!item.review.isDue && (
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() =>
                              handleCardAction(
                                item.id,
                                "review_now",
                                `⚡ "${item.front}" is now due for review today!`
                              )
                            }
                            className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
                            title="Bring card to review immediately today"
                          >
                            ⚡ Review Now
                          </button>
                        )}

                        {isMastered && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            ✨ Mastered
                          </span>
                        )}
                      </div>

                      {/* Edit Learning Progress Modal Button */}
                      <button
                        type="button"
                        onClick={() => setAdjustingCard(item)}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all flex items-center gap-1 active:scale-95"
                        title="Adjust mastery percentage, schedule frequency, or mark mastered"
                      >
                        <span>⚙️</span>
                        <span>Adjust Progress</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Adjust Learning Progress Modal */}
      {adjustingCard && (
        <AdjustProgressModal
          isOpen={!!adjustingCard}
          card={adjustingCard}
          onClose={() => setAdjustingCard(null)}
          onUpdated={async () => {
            setAdjustingCard(null);
            await invalidateAppCache();
            await mutate();
            showToast("Learning progress updated successfully!", "success");
          }}
        />
      )}

      <Footer />
    </div>
  );
}
