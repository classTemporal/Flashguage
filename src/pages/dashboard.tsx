"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage, StatCardSkeleton, DeckCardSkeleton, EmptyState } from "@/components/ui/loading";
import { OfflineBanner } from "@/components/offline-banner";
import { useSyncQueue } from "@/hooks/use-sync";
import { QuickAddDeckModal } from "@/components/deck/quick-add-deck-modal";
import { useToast } from "@/components/ui/toast";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to load");
  }
  return res.json();
};

interface Deck {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  _count: {
    cards: number;
  };
}

interface DueReviewItem {
  id: string;
  cardId: string;
  dueDate: string;
  card?: {
    id: string;
    front: string;
    back: string;
    deckId: string;
    deck?: {
      id: string;
      name: string;
    };
  };
}

interface Stats {
  streak: number;
  totalCards: number;
  cardsLearned: number;
  mastery: {
    level: number;
    title: string;
    xp: number;
    nextLevelXp: number;
  };
  weeklyActivity: { day: string; count: number }[];
  dailyGoal: {
    current: number;
    goal: number;
    percentage: number;
  };
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary text-base" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          {value}
        </p>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function WeeklyChart({ data }: { data: Stats["weeklyActivity"] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Weekly Practice</h3>
          <p className="text-sm font-semibold text-foreground mt-0.5">Cards reviewed over 7 days</p>
        </div>
        <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          Activity
        </span>
      </div>
      <div className="flex items-end justify-between gap-2 h-28 pt-4" role="img" aria-label="Weekly activity chart">
        {data.map((d, i) => {
          const heightPct = Math.round((d.count / max) * 100);
          return (
            <div key={i} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group" title={`${d.day}: ${d.count} cards`}>
              <div className="w-full flex justify-center items-end flex-1">
                <div
                  className="w-full max-w-[32px] rounded-t-md bg-gradient-to-t from-primary/70 to-primary group-hover:brightness-110 transition-all duration-300"
                  style={{
                    height: `${Math.max(heightPct, 10)}%`,
                    opacity: d.count > 0 ? 1 : 0.2,
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GoalProgress({
  current,
  goal,
  percentage,
  onUpdateGoal,
}: {
  current: number;
  goal: number;
  percentage: number;
  onUpdateGoal: (newGoal: number) => Promise<void>;
}) {
  const clampedPct = Math.min(percentage, 100);
  const [isEditing, setIsEditing] = useState(false);
  const [customGoal, setCustomGoal] = useState(goal);
  const [isSaving, setIsSaving] = useState(false);

  const goalPresets = [5, 10, 15, 20, 30, 50];

  const handleSaveGoal = async (target: number) => {
    setIsSaving(true);
    try {
      await onUpdateGoal(target);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily Goal</h3>
              <button
                type="button"
                onClick={() => setIsEditing((prev) => !prev)}
                className="text-xs text-primary hover:underline font-semibold"
                aria-label="Edit Daily Goal target"
              >
                {isEditing ? "Cancel" : "✏️ Edit"}
              </button>
            </div>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              Target: {goal} cards today
            </p>
          </div>
          <span className="text-sm font-bold text-foreground">
            {current} / {goal}
          </span>
        </div>

        {/* Inline Goal Editor */}
        {isEditing && (
          <div className="mt-3 p-3 rounded-xl border border-border bg-muted/30 space-y-2.5 animate-in fade-in">
            <p className="text-xs text-muted-foreground font-medium">Select or enter your daily card target:</p>
            <div className="flex flex-wrap gap-1.5">
              {goalPresets.map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveGoal(val)}
                  className={`px-3 py-1 text-xs rounded-lg font-bold transition-all ${
                    goal === val
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-card border border-border text-foreground hover:bg-accent"
                  }`}
                >
                  {val} cards
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="1"
                max="500"
                value={customGoal}
                onChange={(e) => setCustomGoal(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveGoal(customGoal)}
                className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:opacity-90"
              >
                Set Custom Target
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 h-3.5 w-full rounded-full bg-muted/80 overflow-hidden p-0.5 border border-border/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${clampedPct}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs font-medium">
        <span className="text-muted-foreground">{percentage}% completed</span>
        {percentage >= 100 ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            Goal achieved! 🎯
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-primary font-semibold">{Math.max(goal - current, 0)} cards left</span>
            <Button href="/study" as="link" size="sm" className="h-6 text-[11px] px-2 py-0">
              Study Now →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const { pendingCount, isSyncing, isOnline, sync } = useSyncQueue();
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);

  const { data: decks, error: decksError, isLoading: decksLoading, mutate: mutateDecks } = useSWR<Deck[]>(
    status === "authenticated" ? "/api/decks" : null,
    fetcher
  );

  const { data: stats, isLoading: statsLoading, mutate: mutateStats } = useSWR<Stats>(
    status === "authenticated" ? "/api/stats" : null,
    fetcher
  );

  const { data: dueReviews } = useSWR<DueReviewItem[]>(
    status === "authenticated" ? "/api/reviews/due" : null,
    fetcher
  );

  const { data: progressData } = useSWR<{
    stats: {
      totalCount: number;
      dueCount: number;
      inProgressCount: number;
      masteredCount: number;
      averageMastery: number;
    };
  }>(status === "authenticated" ? "/api/cards/progress" : null, fetcher);

  const pendingByDeck = useMemo(() => {
    if (!Array.isArray(dueReviews) || dueReviews.length === 0) return [];
    const map = new Map<string, { deckId: string; deckName: string; count: number }>();
    dueReviews.forEach((item) => {
      const dId = item.card?.deckId || "";
      if (!dId) return;
      const dName = item.card?.deck?.name || "Vocabulary Deck";
      const existing = map.get(dId) || { deckId: dId, deckName: dName, count: 0 };
      existing.count++;
      map.set(dId, existing);
    });
    return Array.from(map.values());
  }, [dueReviews]);

  const handleUpdateGoal = async (newGoal: number) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyGoal: newGoal }),
      });
      if (!res.ok) throw new Error("Failed to update goal");
      mutateStats();
      showToast(`Daily goal updated to ${newGoal} cards!`, "success");
    } catch {
      showToast("Could not update daily goal", "error");
    }
  };

  if (status === "loading") {
    return <LoadingPage message="Loading your dashboard..." />;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-20 lg:pb-0">
      <OfflineBanner
        pendingCount={pendingCount}
        isOnline={isOnline}
        isSyncing={isSyncing}
        onSync={sync}
      />
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 space-y-8">
        {/* Welcome Banner Card with Quick Actions */}
        <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <span>👋 Welcome Back</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
                {session?.user?.name || session?.user?.email?.split("@")[0]}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
                Ready to level up your language vocabulary? Review your daily flashcards and maintain your streak.
              </p>
            </div>

            {/* Desktop quick action buttons (hidden on mobile to eliminate duplication with bottom navigation) */}
            <div className="hidden sm:flex flex-wrap items-center gap-3">
              <Button
                href="/study"
                as="link"
                size="md"
                className="font-bold shadow-xs bg-primary text-primary-foreground hover:opacity-90 gap-1.5"
              >
                <span>🧠</span>
                <span>Study Now</span>
              </Button>
              <Button href="/decks" as="link" variant="secondary" size="md" className="gap-1.5">
                <span>🗂️</span>
                <span>View All Decks</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Learning Statistics Section */}
        <section aria-label="Learning Statistics" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Performance & Progress
            </h2>
          </div>

          {statsLoading && !stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </div>
            </div>
          ) : stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  title="Daily Streak"
                  value={`${stats.streak}d`}
                  icon="🔥"
                  subtitle="Consecutive study days"
                />
                <StatCard
                  title="Cards Learned"
                  value={stats.cardsLearned}
                  icon="✓"
                  subtitle={`of ${stats.totalCards} total cards`}
                />
                <StatCard
                  title="Daily Goal"
                  value={`${stats.dailyGoal.percentage}%`}
                  icon="🎯"
                  subtitle={`${stats.dailyGoal.current} / ${stats.dailyGoal.goal} target`}
                />
                <StatCard
                  title="Mastery Level"
                  value={`Lvl ${stats.mastery.level}`}
                  icon="⭐"
                  subtitle={`${stats.mastery.xp} / ${stats.mastery.nextLevelXp} XP`}
                />
              </div>

              {/* Learning Progress Highlight Card (Primary element high on Dashboard) */}
              <div className="rounded-3xl border border-primary/25 bg-gradient-to-r from-card via-card to-primary/5 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📈</span>
                      <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                        Learning Progress & Retention
                      </h2>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {progressData?.stats?.averageMastery ?? 0}% Average Mastery
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Track individual card progress %, view countdowns for next reviews, or adjust learning pace.
                    </p>
                  </div>

                  <Button
                    href="/progress"
                    as="link"
                    size="md"
                    className="font-bold gap-2 text-xs shadow-xs bg-primary text-primary-foreground hover:opacity-90 shrink-0"
                  >
                    <span>📈</span>
                    <span>View All Progress →</span>
                  </Button>
                </div>

                {/* Progress Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/70">
                  <div className="rounded-xl bg-muted/40 p-3 border border-border/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">In Progress</span>
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                      {progressData?.stats?.inProgressCount ?? 0} cards
                    </p>
                    <span className="text-[10px] text-muted-foreground">Active learning (1-99%)</span>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3 border border-border/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ready to Review</span>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                      {progressData?.stats?.dueCount ?? 0} cards
                    </p>
                    <span className="text-[10px] text-muted-foreground">Due for review today</span>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3 border border-border/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fully Mastered</span>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {progressData?.stats?.masteredCount ?? 0} cards
                    </p>
                    <span className="text-[10px] text-muted-foreground">100% learned ✨</span>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3 border border-border/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Average Mastery</span>
                    <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {progressData?.stats?.averageMastery ?? 0}%
                    </p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${progressData?.stats?.averageMastery ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <WeeklyChart data={stats.weeklyActivity} />
                <GoalProgress
                  current={stats.dailyGoal.current}
                  goal={stats.dailyGoal.goal}
                  percentage={stats.dailyGoal.percentage}
                  onUpdateGoal={handleUpdateGoal}
                />
              </div>
            </div>
          ) : null}
        </section>

        {/* Pending Reviews Breakdown by Deck (addresses User Point 5) */}
        {pendingByDeck.length > 0 && (
          <section aria-label="Pending Reviews by Deck" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card/60 border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base">⏰</span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pending Reviews
                  </h2>
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    {dueReviews?.length} {dueReviews?.length === 1 ? "card" : "cards"} waiting
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Scheduled for spaced repetition review today to strengthen your memory retention.
                </p>
              </div>
              <Button
                href="/study/all"
                as="link"
                size="md"
                className="font-bold gap-2 text-xs shadow-xs bg-primary text-primary-foreground hover:opacity-90 w-full sm:w-auto shrink-0 justify-center"
              >
                <span>🧠</span>
                <span>Study All Due Cards</span>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pendingByDeck.map((deck) => (
                <div
                  key={deck.deckId}
                  className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs hover:border-primary/40 hover:shadow-sm transition-all gap-3"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="font-bold text-foreground text-sm truncate" title={deck.deckName}>
                      {deck.deckName}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                      ⚡ {deck.count} due
                    </span>
                  </div>
                  <Button
                    href={`/study/${deck.deckId}`}
                    as="link"
                    size="sm"
                    variant="secondary"
                    className="font-bold text-xs shrink-0"
                  >
                    Study Deck →
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tools & Shortcuts Grid */}
        <section aria-label="Tools and Shortcuts" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tools & Shortcuts
            </h2>
            <Link href="/progress" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              <span>📈 Learning Progress</span>
              <span>→</span>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/progress"
              className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📈</div>
              <p className="text-sm font-bold text-foreground">Learning Progress</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">Track word mastery %, review countdown timers, and adjust intervals</p>
            </Link>
            <Link
              href="/context-picker"
              className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🔍</div>
              <p className="text-sm font-bold text-foreground">Context Picker</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">Select reading material and generate cards instantly with AI</p>
            </Link>
            <Link
              href="/import"
              className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📥</div>
              <p className="text-sm font-bold text-foreground">Import Flashcards</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">Bulk upload word lists from CSV, Anki decks, or JSON</p>
            </Link>
            <Link
              href="/community"
              className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🌐</div>
              <p className="text-sm font-bold text-foreground">Community Decks</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">Explore and clone community-shared vocabulary sets</p>
            </Link>
          </div>
        </section>

        {/* Decks Grid Section */}
        <section aria-label="Your Decks" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Your Decks</h2>
              <p className="text-xs text-muted-foreground">Select a deck to practice or manage flashcards</p>
            </div>
            {decks && decks.length > 0 && (
              <Button href="/deck/new" as="link" variant="secondary" size="sm">
                + Add Deck
              </Button>
            )}
          </div>

          {decksError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
              Failed to load decks. Please refresh the page to try again.
            </div>
          )}

          {decksLoading && !decks && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DeckCardSkeleton />
              <DeckCardSkeleton />
              <DeckCardSkeleton />
            </div>
          )}

          {!decksLoading && !decksError && decks && decks.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs">
              <EmptyState
                icon="📚"
                title="No decks found"
                description="Get started by creating your first flashcard deck or importing existing cards."
                action={
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button href="/deck/new" as="link">
                      Create Deck
                    </Button>
                    <Button href="/import" as="link" variant="secondary">
                      Import Cards
                    </Button>
                  </div>
                }
              />
            </div>
          )}

          {!decksLoading && !decksError && decks && decks.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  className="group flex flex-col justify-between bg-card border border-border rounded-2xl p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/deck/${deck.id}`}
                        className="font-bold text-lg text-foreground group-hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded line-clamp-1"
                      >
                        {deck.name}
                      </Link>
                      <span className="shrink-0 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                        {deck._count.cards} {deck._count.cards === 1 ? "card" : "cards"}
                      </span>
                    </div>
                    {deck.description ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                        {deck.description}
                      </p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground/60">
                        No description provided
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                    <Link
                      href={`/deck/${deck.id}`}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View cards →
                    </Link>
                    <Button
                      href={`/deck/${deck.id}`}
                      as="link"
                      size="sm"
                      className="gap-1.5 font-semibold"
                    >
                      <span>Study</span>
                      <span aria-hidden="true">→</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        {/* Quick Add Deck Modal */}
        <QuickAddDeckModal
          isOpen={isCreateDeckOpen}
          onClose={() => setIsCreateDeckOpen(false)}
          onDeckCreated={() => mutateDecks()}
        />
      </main>

      <Footer />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
};
