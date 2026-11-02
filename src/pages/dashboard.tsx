"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { LoadingPage, StatCardSkeleton, DeckCardSkeleton, EmptyState } from "@/components/ui/loading";
import { OfflineBanner } from "@/components/offline-banner";
import { useSyncQueue } from "@/hooks/use-sync";
import { QuickAddDeckModal } from "@/components/deck/quick-add-deck-modal";
import { useToast } from "@/components/ui/toast";
import { SUPPORTED_LANGUAGES, getLanguage, getStoredActiveLanguage, setStoredActiveLanguage, recordTrackAccess } from "@/lib/languages";
import {
  CustomizeDashboardModal,
  DashboardSectionId,
  DEFAULT_SECTIONS_ORDER,
  DASHBOARD_SECTIONS,
} from "@/components/dashboard/customize-dashboard-modal";

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
  targetLanguage?: string;
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
  activeLanguage = "en",
  totalCards = 0,
  dueCount = 0,
  onCreateDeck,
  onUpdateGoal,
}: {
  current: number;
  goal: number;
  percentage: number;
  activeLanguage?: string;
  totalCards?: number;
  dueCount?: number;
  onCreateDeck?: () => void;
  onUpdateGoal: (newGoal: number) => Promise<void>;
}) {
  const clampedPct = Math.min(percentage, 100);
  const [isEditing, setIsEditing] = useState(false);
  const [customGoal, setCustomGoal] = useState(goal);
  const [isSaving, setIsSaving] = useState(false);
  const [cooldownSecs, setCooldownSecs] = useState<number>(0);

  useEffect(() => {
    const updateCooldown = () => {
      try {
        const raw = localStorage.getItem(`flashguage_cooldown_${activeLanguage}`);
        if (raw) {
          const diff = Math.max(0, Math.ceil((parseInt(raw, 10) - Date.now()) / 1000));
          setCooldownSecs(diff);
          return;
        }
      } catch {}
      setCooldownSecs(0);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    window.addEventListener("storage", updateCooldown);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", updateCooldown);
    };
  }, [activeLanguage]);

  const handleSkipBreak = () => {
    try {
      localStorage.removeItem(`flashguage_cooldown_${activeLanguage}`);
      window.dispatchEvent(new Event("storage"));
    } catch {}
    setCooldownSecs(0);
  };

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

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
          <div className="text-right">
            <span className="text-sm font-bold text-foreground">
              {current} / {goal}
            </span>
            <p className="text-[10px] text-muted-foreground">Daily Target</p>
          </div>
        </div>

        {/* Inline Goal Editor with Clear Explanation of Review Limit */}
        {isEditing && (
          <div className="mt-3 p-3.5 rounded-xl border border-border bg-muted/30 space-y-3 animate-in fade-in">
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-muted-foreground leading-relaxed">
              💡 <strong>Note:</strong> Daily Goal sets your overall daily target. Editing this goal does <strong>not</strong> change your per-session <strong>Review Limit</strong> (batch size). Review Limit and session break cooldown can be adjusted in <Link href="/settings" className="text-primary font-semibold underline">Settings</Link>.
            </div>

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

        {/* Live Session Break Cooldown Countdown Timer */}
        {cooldownSecs > 0 && (
          <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">☕</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    Brain Break Active
                  </span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded text-xs">
                    ⏳ {formatTimer(cooldownSecs)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Resting memory pathways between review batches. Next batch unlocks shortly.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSkipBreak}
              className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs transition-colors shrink-0"
            >
              ⚡ Skip Break
            </button>
          </div>
        )}

        <div className="mt-5 h-3.5 w-full rounded-full bg-muted/80 overflow-hidden p-0.5 border border-border/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${clampedPct}%` }}
          />
        </div>

        <p className="text-[11px] text-muted-foreground mt-2">
          ℹ️ Editing Daily Goal does not modify your Review Limit per batch (configured in Settings).
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs font-medium">
        <span className="text-muted-foreground">{percentage}% completed</span>
        {percentage >= 100 ? (
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              Goal achieved! 🎯
            </span>
            <Button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new Event("open-daily-goal-modal"));
                }
              }}
              size="sm"
              className="h-6 text-[11px] px-2.5 py-0 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              Practice →
            </Button>
          </div>
        ) : totalCards === 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">No cards in track yet</span>
            {onCreateDeck && (
              <Button
                type="button"
                onClick={onCreateDeck}
                size="sm"
                className="h-6 text-[11px] px-2.5 py-0 font-bold shadow-xs"
              >
                + Create Deck
              </Button>
            )}
          </div>
        ) : cooldownSecs > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono font-bold text-xs">
              ⏳ Break ({formatTimer(cooldownSecs)})
            </span>
            <Button
              href={`/study?lang=${encodeURIComponent(activeLanguage)}`}
              as="link"
              size="sm"
              className="h-6 text-[11px] px-2.5 py-0 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
            >
              Study Now →
            </Button>
          </div>
        ) : dueCount === 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">0 cards due today</span>
            <Button
              href={`/study/all?lang=${encodeURIComponent(activeLanguage)}&mode=all`}
              as="link"
              variant="secondary"
              size="sm"
              className="h-6 text-[11px] px-2 py-0"
            >
              Practice Any →
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-primary font-semibold">
              {Math.min(dueCount, Math.max(goal - current, 0))} cards due
            </span>
            <Button
              href={`/study?lang=${encodeURIComponent(activeLanguage)}`}
              as="link"
              size="sm"
              className="h-6 text-[11px] px-2 py-0"
            >
              Study Now →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickLookupWidget({ activeLanguage }: { activeLanguage: string }) {
  const currentLang = getLanguage(activeLanguage);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/dictionaries?lang=${encodeURIComponent(activeLanguage)}&q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📖</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Quick Dictionary
          </h3>
        </div>
        <span className="text-xs font-semibold text-primary">{currentLang.flag} {currentLang.name}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Look up definitions, native audio pronunciations, and create flashcards with 1 click.
      </p>
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${currentLang.name} word...`}
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button type="submit" size="sm" className="h-8 text-xs font-bold px-3">
          Lookup
        </Button>
      </form>
    </div>
  );
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const { pendingCount, isSyncing, isOnline, sync } = useSyncQueue();
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [sectionsOrder, setSectionsOrder] = useState<DashboardSectionId[]>(DEFAULT_SECTIONS_ORDER);
  const [hiddenSections, setHiddenSections] = useState<DashboardSectionId[]>([]);
  const [activeLanguage, setActiveLanguage] = useState<string>("en");

  // Load custom dashboard layout preferences from localStorage
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem("flashguage_dashboard_sections_v3");
      if (savedOrder) {
        const parsed: DashboardSectionId[] = JSON.parse(savedOrder);
        const mergedOrder = [
          ...parsed.filter((id) => DEFAULT_SECTIONS_ORDER.includes(id)),
          ...DEFAULT_SECTIONS_ORDER.filter((id) => !parsed.includes(id)),
        ];
        setSectionsOrder(mergedOrder);
      }
      const savedHidden = localStorage.getItem("flashguage_dashboard_hidden_sections_v3");
      if (savedHidden) {
        setHiddenSections(JSON.parse(savedHidden));
      }
    } catch {}
  }, []);

  const handleSaveSectionsOrder = (newOrder: DashboardSectionId[], newHidden: DashboardSectionId[]) => {
    setSectionsOrder(newOrder);
    setHiddenSections(newHidden);
    try {
      localStorage.setItem("flashguage_dashboard_sections_v3", JSON.stringify(newOrder));
      localStorage.setItem("flashguage_dashboard_hidden_sections_v3", JSON.stringify(newHidden));
      showToast("Dashboard layout saved!", "success");
    } catch {}
  };

  const handleResetSections = () => {
    setSectionsOrder(DEFAULT_SECTIONS_ORDER);
    setHiddenSections([]);
    try {
      localStorage.removeItem("flashguage_dashboard_sections_v3");
      localStorage.removeItem("flashguage_dashboard_hidden_sections_v3");
      showToast("Dashboard layout reset to default", "info");
    } catch {}
  };

  // Fetch all user decks to detect active tracks and totals
  const { data: allDecks } = useSWR<Deck[]>(
    status === "authenticated" ? "/api/decks" : null,
    fetcher
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = router.query.lang as string;
      const stored = getStoredActiveLanguage();
      if (q && q.trim()) {
        setActiveLanguage(q);
        setStoredActiveLanguage(q);
        recordTrackAccess(q);
      } else if (stored && stored.trim()) {
        setActiveLanguage(stored);
        recordTrackAccess(stored);
      } else if (allDecks && allDecks.length > 0 && allDecks[0].targetLanguage) {
        setActiveLanguage(allDecks[0].targetLanguage);
        setStoredActiveLanguage(allDecks[0].targetLanguage);
        recordTrackAccess(allDecks[0].targetLanguage);
      }
    }
  }, [router.query.lang, allDecks]);

  const handleSelectTrack = (langCode: string) => {
    setActiveLanguage(langCode);
    setStoredActiveLanguage(langCode);
    recordTrackAccess(langCode);
    router.replace(
      { pathname: router.pathname, query: { ...router.query, lang: langCode } },
      undefined,
      { shallow: true }
    );
  };

  const activeTracks = useMemo(() => {
    const langs = new Set<string>();
    if (Array.isArray(allDecks)) {
      allDecks.forEach((d) => {
        if (d.targetLanguage) langs.add(d.targetLanguage);
      });
    }
    if (activeLanguage && activeLanguage !== "all") langs.add(activeLanguage);
    if (langs.size === 0) langs.add("en");
    return Array.from(langs);
  }, [allDecks, activeLanguage]);

  const currentLang = getLanguage(activeLanguage);

  // Scoped queries to active language track
  const decksUrl = status === "authenticated" ? `/api/decks?lang=${encodeURIComponent(activeLanguage)}` : null;
  const statsUrl = status === "authenticated" ? `/api/stats?lang=${encodeURIComponent(activeLanguage)}` : null;
  const dueReviewsUrl = status === "authenticated" ? `/api/reviews/due?lang=${encodeURIComponent(activeLanguage)}` : null;
  const progressUrl = status === "authenticated" ? `/api/cards/progress?lang=${encodeURIComponent(activeLanguage)}` : null;

  const { data: decks, error: decksError, isLoading: decksLoading, mutate: mutateDecks } = useSWR<Deck[]>(
    decksUrl,
    fetcher
  );

  const { data: stats, isLoading: statsLoading, mutate: mutateStats } = useSWR<Stats>(
    statsUrl,
    fetcher
  );

  const { data: dueReviews } = useSWR<DueReviewItem[]>(
    dueReviewsUrl,
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
  }>(progressUrl, fetcher);

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

  const renderSection = (sectionId: DashboardSectionId) => {
    if (hiddenSections.includes(sectionId)) return null;

    switch (sectionId) {
      case "daily_goal":
        return (
          <div key="daily_goal" className={DASHBOARD_SECTIONS.daily_goal.defaultSpan}>
            {statsLoading && !stats ? (
              <div className="bg-card border border-border rounded-2xl p-6 h-48 animate-pulse" />
            ) : stats ? (
              <GoalProgress
                current={stats.dailyGoal.current}
                goal={stats.dailyGoal.goal}
                percentage={stats.dailyGoal.percentage}
                activeLanguage={activeLanguage}
                totalCards={stats.totalCards}
                dueCount={dueReviews?.length ?? 0}
                onCreateDeck={() => setIsCreateDeckOpen(true)}
                onUpdateGoal={handleUpdateGoal}
              />
            ) : null}
          </div>
        );

      case "reviews_queue":
        if (pendingByDeck.length === 0) return null;
        return (
          <div key="reviews_queue" className={DASHBOARD_SECTIONS.reviews_queue.defaultSpan}>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">⏰</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Reviews Due Today
                  </h3>
                </div>
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  {dueReviews?.length} due
                </span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {pendingByDeck.map((d) => (
                  <div
                    key={d.deckId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-foreground truncate">{d.deckName}</p>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        ⚡ {d.count} cards waiting
                      </span>
                    </div>
                    <Button
                      href={`/study/${d.deckId}`}
                      as="link"
                      size="sm"
                      variant="secondary"
                      className="h-6 text-[10px] px-2 py-0 font-bold shrink-0"
                    >
                      Study →
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                href={`/study/all?lang=${encodeURIComponent(activeLanguage)}`}
                as="link"
                size="sm"
                className="w-full text-xs font-bold mt-2"
              >
                Study All Due ({dueReviews?.length}) →
              </Button>
            </div>
          </div>
        );

      case "performance":
        return (
          <section key="performance" aria-label="Learning Statistics" className={`${DASHBOARD_SECTIONS.performance.defaultSpan} space-y-3`}>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Performance & Progress
              </h2>
            </div>
            {statsLoading && !stats ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            ) : null}
          </section>
        );

      case "decks":
        return (
          <section key="decks" aria-label="Your Decks" className={`${DASHBOARD_SECTIONS.decks.defaultSpan} space-y-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>{activeLanguage === "all" ? "🌐" : currentLang.flag}</span>
                  <span>{activeLanguage === "all" ? "All Decks" : `${currentLang.name} Decks`}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {decks?.length || 0}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  {activeLanguage === "all"
                    ? "Showing decks across all languages"
                    : `Dedicated decks for ${currentLang.name} vocabulary and practice`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreateDeckOpen(true)}
                >
                  + Add Deck
                </Button>
              </div>
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
                  title={`No ${activeLanguage === "all" ? "" : currentLang.name} decks found`}
                  description={`You haven't created any decks in the ${activeLanguage === "all" ? "collection" : currentLang.name + " track"} yet. Start learning by adding your first deck!`}
                  action={
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button type="button" onClick={() => setIsCreateDeckOpen(true)}>
                        + Create {activeLanguage === "all" ? "" : currentLang.name} Deck
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {decks.map((deck) => (
                  <div
                    key={deck.id}
                    className="group flex flex-col justify-between bg-card border border-border rounded-2xl p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {deck.targetLanguage && (
                            <span className="text-base shrink-0" title={getLanguage(deck.targetLanguage).name}>
                              {getLanguage(deck.targetLanguage).flag}
                            </span>
                          )}
                          <Link
                            href={`/deck/${deck.id}`}
                            className="font-bold text-base text-foreground group-hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded line-clamp-1"
                          >
                            {deck.name}
                          </Link>
                        </div>
                        <span className="shrink-0 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          {deck._count.cards} {deck._count.cards === 1 ? "card" : "cards"}
                        </span>
                      </div>
                      {deck.description ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                          {deck.description}
                        </p>
                      ) : (
                        <p className="text-xs italic text-muted-foreground/60">
                          No description provided
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-border pt-3.5">
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
                        className="gap-1 font-semibold text-xs h-7 px-2.5"
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
        );

      case "weekly_chart":
        return (
          <div key="weekly_chart" className={DASHBOARD_SECTIONS.weekly_chart.defaultSpan}>
            {statsLoading && !stats ? (
              <div className="bg-card border border-border rounded-2xl p-6 h-48 animate-pulse" />
            ) : stats ? (
              <WeeklyChart data={stats.weeklyActivity} />
            ) : null}
          </div>
        );

      case "dictionary":
        return (
          <div key="dictionary" className={DASHBOARD_SECTIONS.dictionary.defaultSpan}>
            <QuickLookupWidget activeLanguage={activeLanguage} />
          </div>
        );

      case "learning_progress":
        return (
          <section key="learning_progress" aria-label="Learning Progress & Retention" className={`${DASHBOARD_SECTIONS.learning_progress.defaultSpan}`}>
            <div className="rounded-3xl border border-primary/25 bg-gradient-to-r from-card via-card to-primary/5 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📈</span>
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                      Learning Progress & Retention
                    </h2>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {progressData?.stats?.averageMastery ?? 0}% Average Mastery
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Track individual card progress %, view countdowns for next reviews, or adjust learning pace.
                  </p>
                </div>

                <Button
                  href={activeLanguage === "all" ? "/progress" : `/progress?lang=${activeLanguage}`}
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
          </section>
        );

      case "tools":
        return (
          <section key="tools" aria-label="Tools and Shortcuts" className={`${DASHBOARD_SECTIONS.tools.defaultSpan} space-y-3`}>
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
                className="group rounded-2xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">📈</div>
                <p className="text-sm font-bold text-foreground">Learning Progress</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">Track word mastery %, review countdown timers, and adjust intervals</p>
              </Link>
              <Link
                href="/context-picker"
                className="group rounded-2xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">🔍</div>
                <p className="text-sm font-bold text-foreground">Context Picker</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">Select reading material and generate cards instantly with AI</p>
              </Link>
              <Link
                href="/import"
                className="group rounded-2xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">📥</div>
                <p className="text-sm font-bold text-foreground">Import Flashcards</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">Bulk upload word lists from CSV, Anki decks, or JSON</p>
              </Link>
              <Link
                href="/community"
                className="group rounded-2xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">🌐</div>
                <p className="text-sm font-bold text-foreground">Community Decks</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">Explore and clone community-shared vocabulary sets</p>
              </Link>
            </div>
          </section>
        );

      default:
        return null;
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
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-20 md:pb-0">
      <OfflineBanner
        pendingCount={pendingCount}
        isOnline={isOnline}
        isSyncing={isSyncing}
        onSync={sync}
      />
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Top Navigation: Switch Language & Active Indicator */}
        <div className="flex items-center justify-between -mb-2">
          <BackButton href="/tracks" label="Switch Language Track" />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCustomizeOpen(true)}
              className="text-xs h-7 px-2.5 font-semibold gap-1.5 shadow-xs"
              aria-label="Customize dashboard sections"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Customize Layout</span>
              <span className="sm:hidden">Customize</span>
            </Button>
            <span className="text-xs font-bold text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border flex items-center gap-1.5 shadow-xs">
              <span role="img" aria-label={currentLang.name}>{currentLang.flag}</span>
              <span>{currentLang.name} Track</span>
            </span>
            <Button
              href="/tracks"
              as="link"
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex text-xs h-7 px-2.5 font-semibold text-primary"
            >
              All Tracks →
            </Button>
          </div>
        </div>

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

            {/* Desktop quick action buttons */}
            <div className="hidden sm:flex flex-wrap items-center gap-3">
              {(stats?.totalCards ?? 0) === 0 ? (
                <Button
                  type="button"
                  onClick={() => setIsCreateDeckOpen(true)}
                  size="md"
                  className="font-bold shadow-xs bg-primary text-primary-foreground hover:opacity-90 gap-1.5"
                >
                  <span>✨</span>
                  <span>Create {currentLang.name} Deck</span>
                </Button>
              ) : (dueReviews?.length ?? 0) > 0 ? (
                <Button
                  href={`/study?lang=${encodeURIComponent(activeLanguage)}`}
                  as="link"
                  size="md"
                  className="font-bold shadow-xs bg-primary text-primary-foreground hover:opacity-90 gap-1.5"
                >
                  <span>🧠</span>
                  <span>Study {activeLanguage === "all" ? "Due Cards" : currentLang.name}</span>
                </Button>
              ) : (
                <Button
                  href={`/study/all?lang=${encodeURIComponent(activeLanguage)}&mode=all`}
                  as="link"
                  variant="secondary"
                  size="md"
                  className="gap-1.5 font-bold shadow-xs"
                >
                  <span>🎯</span>
                  <span>Practice {currentLang.name} (All)</span>
                </Button>
              )}
              <Button
                href={`/decks?lang=${encodeURIComponent(activeLanguage)}`}
                as="link"
                variant="secondary"
                size="md"
                className="gap-1.5"
              >
                <span>🗂️</span>
                <span>View All Decks</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Dynamic Modular Dashboard Sections ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {sectionsOrder.map((sectionId) => renderSection(sectionId))}
        </div>

        {/* Quick Add Deck Modal */}
        <QuickAddDeckModal
          isOpen={isCreateDeckOpen}
          defaultLanguage={activeLanguage === "all" ? "en" : activeLanguage}
          onClose={() => setIsCreateDeckOpen(false)}
          onDeckCreated={() => {
            mutateDecks();
            mutateStats();
          }}
        />

        {/* Customize Dashboard Layout Modal */}
        <CustomizeDashboardModal
          isOpen={isCustomizeOpen}
          onClose={() => setIsCustomizeOpen(false)}
          sectionsOrder={sectionsOrder}
          hiddenSections={hiddenSections}
          onSaveOrder={handleSaveSectionsOrder}
          onReset={handleResetSections}
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
