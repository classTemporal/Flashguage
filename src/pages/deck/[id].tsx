"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { useRouter } from "next/router";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState, LoadingPage, CardSkeleton } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BackButton } from "@/components/ui/back-button";
import { useToast } from "@/components/ui/toast";
import { QuickAddCardModal } from "@/components/card/quick-add-card-modal";
import { EditCardModal } from "@/components/card/edit-card-modal";
import { invalidateAppCache } from "@/lib/cache";
import { getLanguage } from "@/lib/languages";
import { parseCardMedia, parseCardTags } from "@/lib/card-utils";
import { playCardSpeech } from "@/lib/speech";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to load data");
  }
  return res.json();
};

interface CardItem {
  id: string;
  front: string;
  back: string;
  tags: string;
  media?: string | null;
  source: string;
  createdAt: string;
}

interface Deck {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  targetLanguage?: string;
}

interface DueReview {
  id: string;
  cardId: string;
}

type TabType = "overview" | "cards" | "study" | "settings";

export default function DeckDetail() {
  const router = useRouter();
  const { id } = router.query;
  const deckId = typeof id === "string" ? id : "";
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Settings form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Cards filter state
  const [cardSearch, setCardSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);

  // Edit & Delete Card state
  const [editingCard, setEditingCard] = useState<CardItem | null>(null);
  const [cardToDelete, setCardToDelete] = useState<CardItem | null>(null);
  const [isDeletingCard, setIsDeletingCard] = useState(false);

  // View mode & audio state for Cards tab
  const [cardViewMode, setCardViewMode] = useState<"grid" | "list">("grid");
  const [speakingCardId, setSpeakingCardId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("flashguage_deck_view_mode");
      if (saved === "grid" || saved === "list") {
        setCardViewMode(saved);
      }
    } catch {}
  }, []);

  const handleToggleViewMode = (mode: "grid" | "list") => {
    setCardViewMode(mode);
    try {
      localStorage.setItem("flashguage_deck_view_mode", mode);
    } catch {}
  };

  const handleSpeakCard = (cardId: string, word: string) => {
    setSpeakingCardId(cardId);
    playCardSpeech(word, deckData?.targetLanguage || "en", {
      onEnd: () => setSpeakingCardId(null),
      onError: () => setSpeakingCardId(null),
    });
  };

  const { data: decks, error: decksError, mutate: mutateDecks } = useSWR<Deck[]>("/api/decks", fetcher);
  const deckData = Array.isArray(decks) ? decks.find((d) => d.id === deckId) : undefined;

  const {
    data: cards,
    error: cardsError,
    isLoading: cardsLoading,
    mutate: mutateCards,
  } = useSWR<CardItem[]>(deckId ? `/api/cards?deckId=${deckId}` : null, fetcher);

  const { data: dueReviews, mutate: mutateDueReviews } = useSWR<DueReview[]>(
    deckId ? `/api/reviews/due?deckId=${deckId}` : null,
    fetcher
  );

  const [isSimulatingDay, setIsSimulatingDay] = useState(false);
  const handleAdvanceDay = async () => {
    setIsSimulatingDay(true);
    try {
      const res = await fetch("/api/reviews/advance-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId }),
      });
      if (!res.ok) throw new Error();
      showToast("Day advanced! Due cards are refreshed for their next review cycle.", "success");
      mutateDueReviews();
    } catch {
      showToast("Failed to simulate day advancement", "error");
    } finally {
      setIsSimulatingDay(false);
    }
  };

  const handleDeleteCardConfirmed = async () => {
    if (!cardToDelete) return;
    setIsDeletingCard(true);
    try {
      const res = await fetch(`/api/cards?id=${encodeURIComponent(cardToDelete.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete card");
      await invalidateAppCache();
      showToast("Card deleted successfully", "success");
      mutateCards(undefined, { revalidate: true });
      mutateDueReviews(undefined, { revalidate: true });
      setCardToDelete(null);
    } catch {
      showToast("Could not delete card", "error");
    } finally {
      setIsDeletingCard(false);
    }
  };

  // Sync edit form fields whenever deckData changes
  useEffect(() => {
    if (deckData) {
      setEditName(deckData.name);
      setEditDescription(deckData.description || "");
      setEditIsPublic(Boolean(deckData.isPublic));
    }
  }, [deckData]);

  useEffect(() => {
    if (decksError) {
      showToast("Failed to load deck data", "error");
    }
  }, [decksError, showToast]);

  useEffect(() => {
    if (cardsError) {
      showToast("Failed to load cards for this deck", "error");
    }
  }, [cardsError, showToast]);

  // Extract all unique tags for filter
  const allTags = useMemo(() => {
    if (!Array.isArray(cards)) return ["All"];
    const tagSet = new Set<string>();
    cards.forEach((card) => {
      try {
        if (card.tags && card.tags !== "[]") {
          const parsed = JSON.parse(card.tags);
          if (Array.isArray(parsed)) {
            parsed.forEach((t) => {
              if (typeof t === "string" && t.trim()) tagSet.add(t.trim());
            });
          }
        }
      } catch {
        // ignore JSON parse error
      }
    });
    return ["All", ...Array.from(tagSet)];
  }, [cards]);

  // Filtered cards by search query & tag
  const filteredCards = useMemo(() => {
    if (!Array.isArray(cards)) return [];
    const query = cardSearch.toLowerCase().trim();

    return cards.filter((card) => {
      let cardTags: string[] = [];
      try {
        if (card.tags && card.tags !== "[]") {
          const parsed = JSON.parse(card.tags);
          if (Array.isArray(parsed)) {
            cardTags = parsed.map((t) => String(t).toLowerCase());
          }
        }
      } catch {
        cardTags = [];
      }

      const matchesTag =
        selectedTag === "All" || cardTags.includes(selectedTag.toLowerCase());

      const matchesSearch =
        !query ||
        card.front.toLowerCase().includes(query) ||
        card.back.toLowerCase().includes(query) ||
        cardTags.some((t) => t.includes(query));

      return matchesTag && matchesSearch;
    });
  }, [cards, cardSearch, selectedTag]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast("Deck name cannot be empty", "error");
      return;
    }
    setIsSavingEdit(true);
    try {
      const res = await fetch("/api/decks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: deckId,
          name: editName.trim(),
          description: editDescription.trim() || null,
          isPublic: editIsPublic,
        }),
      });
      if (!res.ok) throw new Error("Failed to update deck");
      showToast("Deck settings updated successfully!", "success");
      mutateDecks();
    } catch {
      showToast("Could not update deck settings", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteDeck = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/decks?id=${encodeURIComponent(deckId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete deck");
      }
      showToast("Deck deleted successfully", "success");
      mutateDecks();
      router.push("/dashboard");
    } catch {
      showToast("Could not delete deck", "error");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (!deckId) return null;

  if (!deckData && !decks) {
    return <LoadingPage message="Loading deck..." />;
  }

  if (!deckData) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header title="Deck Not Found" />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-12">
          <EmptyState
            icon="🔍"
            title="Deck not found"
            description="The deck you are looking for does not exist or may have been deleted."
            action={
              <Button href="/dashboard" as="link">
                Back to Dashboard
              </Button>
            }
          />
        </main>
        <Footer />
      </div>
    );
  }

  const cardCount = Array.isArray(cards) ? cards.length : 0;
  const dueCount = Array.isArray(dueReviews) ? dueReviews.length : 0;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-24 md:pb-6">
      <Header title={deckData.name} />

      <main className="mx-auto w-full max-w-5xl lg:max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <BackButton href="/dashboard" label="Back to Dashboard" />
          <div className="flex items-center gap-2">
            {deckData.isPublic ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span>🌐</span> Public
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <span>🔒</span> Private
              </span>
            )}
          </div>
        </div>

        {/* Deck Header Summary with Primary Actions at Top */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {deckData.name}
              </h1>
              {deckData.targetLanguage && (
                <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-500">
                  {getLanguage(deckData.targetLanguage).flag} {getLanguage(deckData.targetLanguage).name}
                </span>
              )}
              <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-0.5 text-xs font-bold text-primary">
                {cardCount} {cardCount === 1 ? "card" : "cards"}
              </span>
              {dueCount > 0 ? (
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  {dueCount} due
                </span>
              ) : cardCount > 0 ? (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Up to date
                </span>
              ) : null}
            </div>
            {deckData.description && (
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {deckData.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Primary Action Button (Clear CTA) */}
            {dueCount > 0 ? (
              <Button
                href={`/study/${deckId}`}
                as="link"
                size="md"
                className="font-black shadow-md bg-gradient-to-r from-primary to-indigo-600 text-white hover:opacity-95 gap-2 px-5 py-2.5"
              >
                <span className="text-base">🧠</span>
                <span>Study Now ({dueCount} Due)</span>
              </Button>
            ) : cardCount > 0 ? (
              <Button
                href={`/study/${deckId}?mode=all`}
                as="link"
                size="md"
                className="font-black shadow-md bg-gradient-to-r from-primary to-indigo-600 text-white hover:opacity-95 gap-2 px-5 py-2.5"
              >
                <span className="text-base">🎯</span>
                <span>Free Practice ({cardCount})</span>
              </Button>
            ) : null}

            {/* Quick Add Card */}
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsAddCardOpen(true)}
              className="font-bold gap-1.5 border-border/80 hover:bg-muted"
            >
              <span className="text-primary font-black">+</span>
              <span>Add Card</span>
            </Button>

            {/* Secondary Utilities */}
            {cardCount > 0 && dueCount > 0 && (
              <Button
                href={`/study/${deckId}?mode=all`}
                as="link"
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                title="Practice all cards in this deck regardless of review schedule"
              >
                🎯 Free Practice
              </Button>
            )}

            <Button
              href={`/progress?deckId=${deckId}`}
              as="link"
              variant="ghost"
              size="sm"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground gap-1"
            >
              <span>📈</span>
              <span>Progress</span>
            </Button>
          </div>
        </div>

        {/* Tabbed Navigation Bar */}
        <div className="mb-6 border-b border-border -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <nav className="-mb-px flex items-center space-x-1 sm:space-x-6 min-w-max sm:min-w-0" aria-label="Deck sections">
            {[
              { id: "overview", label: "Overview", icon: "📊" },
              { id: "cards", label: "Cards", icon: "🗂️", badge: cardCount },
              { id: "study", label: "Study", icon: "🧠", badge: dueCount > 0 ? dueCount : undefined },
              { id: "settings", label: "Settings", icon: "⚙️" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`group inline-flex items-center gap-1.5 sm:gap-2 border-b-2 py-2.5 sm:py-3 px-2.5 sm:px-3 text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="text-sm sm:text-base" aria-hidden="true">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className={`rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold ${
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground group-hover:text-foreground"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAB CONTENTS */}

        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Deck Description & Info */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-3">About this Deck</h2>
              {deckData.description ? (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {deckData.description}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground/70">
                  No description provided yet. You can add one in the Settings tab.
                </p>
              )}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Cards
                </span>
                <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                  {cardCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vocabulary entries in deck
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cards Due for Review
                </span>
                <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                  {dueCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dueCount > 0 ? "Ready to practice today" : "All caught up!"}
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Study Status
                </span>
                <p className="mt-2 text-xl font-bold tracking-tight text-foreground">
                  {cardCount === 0
                    ? "Empty Deck"
                    : dueCount > 0
                    ? "Review Needed"
                    : "Completed"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cardCount === 0
                    ? "Add cards to begin"
                    : dueCount > 0
                    ? `${dueCount} cards awaiting recall`
                    : "Next review scheduled"}
                </p>
              </div>
            </div>

            {/* Learning Progress Highlight for this Deck */}
            {cardCount > 0 && (
              <div className="bg-gradient-to-r from-card via-card to-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📈</span>
                    <h3 className="text-base font-black text-foreground">Deck Learning Progress</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    View individual card mastery percentages, countdown timers to next reviews, and customize frequency.
                  </p>
                </div>
                <Button
                  href={`/progress?deckId=${deckId}`}
                  as="link"
                  size="md"
                  className="font-bold gap-2 text-xs shadow-xs bg-primary text-primary-foreground hover:opacity-90 shrink-0"
                >
                  <span>📈</span>
                  <span>View Cards in Progress →</span>
                </Button>
              </div>
            )}

            {/* Spaced Repetition Testing Tool */}
            {cardCount > 0 && (
              <div className="flex items-center justify-between bg-card border border-dashed border-border rounded-xl p-4 text-xs text-muted-foreground">
                <span>Want to test intervals or prepare upcoming reviews?</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAdvanceDay}
                  disabled={isSimulatingDay}
                  title="Simulate advancing time by +1 day to see cards scheduled for tomorrow"
                >
                  {isSimulatingDay ? "Simulating..." : "⏩ Simulate +1 Day"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 2. CARDS TAB */}
        {activeTab === "cards" && (
          <div className="space-y-6">
            {/* Header & Search/Filter Controls Card */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Deck Cards</h2>
                  <p className="text-xs text-muted-foreground">
                    Search, filter, edit, or manage individual flashcards in this deck.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    href={`/progress?deckId=${deckId}`}
                    as="link"
                    variant="secondary"
                    size="sm"
                    className="font-bold text-xs gap-1"
                  >
                    <span>📈</span>
                    <span>Learning Progress</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsAddCardOpen(true)}
                    className="font-bold shadow-xs"
                  >
                    ⚡ + Add Card
                  </Button>
                </div>
              </div>

              {/* Search input and tag filters */}
              <div className="space-y-3 pt-2 border-t border-border">
                <Input
                  placeholder="Search cards by front, back, or tag..."
                  value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                />

                {allTags.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-muted-foreground mr-1">Filter by Tag:</span>
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTag(tag)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          selectedTag === tag
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        {tag === "All" ? "All Tags" : `#${tag}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Card List Results */}
            {cardsError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive" role="alert">
                Failed to load cards. Please refresh or try again later.
              </div>
            )}

            {cardsLoading && !cards && (
              <div className="space-y-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            )}

            {!cardsLoading && !cardsError && cards && cards.length === 0 && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <EmptyState
                  icon="📝"
                  title="No cards in this deck yet"
                  description="Add cards manually or import an existing vocabulary list to build this deck."
                  action={
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button type="button" onClick={() => setIsAddCardOpen(true)} className="font-bold">
                        ⚡ + Add First Card
                      </Button>
                      <Button href={`/import?deckId=${deckId}`} as="link" variant="secondary">
                        Import Cards
                      </Button>
                    </div>
                  }
                />
              </div>
            )}

            {!cardsLoading && !cardsError && cards && cards.length > 0 && filteredCards.length === 0 && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <EmptyState
                  icon="🔍"
                  title="No matching cards"
                  description={`No cards found matching "${cardSearch}" ${
                    selectedTag !== "All" ? `with tag #${selectedTag}` : ""
                  }.`}
                  action={
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setCardSearch("");
                        setSelectedTag("All");
                      }}
                    >
                      Clear Filters
                    </Button>
                  }
                />
              </div>
            )}

            {!cardsLoading && !cardsError && filteredCards.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                  <span>
                    Showing {filteredCards.length} of {cards?.length || 0} cards
                  </span>

                  {/* View Mode Toggle: Grid vs List */}
                  <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => handleToggleViewMode("grid")}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        cardViewMode === "grid"
                          ? "bg-card text-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Grid view (2 columns on PC)"
                    >
                      ⊞ Grid
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleViewMode("list")}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        cardViewMode === "list"
                          ? "bg-card text-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="List view (compact rows)"
                    >
                      ☰ List
                    </button>
                  </div>
                </div>

                {/* ── Grid View Layout (Optimized for PC 2-Columns & Mobile) ── */}
                {cardViewMode === "grid" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCards.map((card) => {
                      const tagsList = parseCardTags(card.tags);
                      const mediaObj = parseCardMedia(card.media);
                      const isSpeaking = speakingCardId === card.id;

                      return (
                        <div
                          key={card.id}
                          className="group bg-card border border-border hover:border-primary/40 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
                        >
                          {/* Card Header: Front, Pronunciation, POS & Action Menu */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight font-display capitalize">
                                  {card.front}
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => handleSpeakCard(card.id, card.front)}
                                  className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                                    isSpeaking
                                      ? "bg-primary text-primary-foreground animate-pulse scale-105"
                                      : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                                  }`}
                                  title="Listen to pronunciation"
                                  aria-label={`Pronounce ${card.front}`}
                                >
                                  <span className="text-xs">🔊</span>
                                </button>
                                {mediaObj.partOfSpeech && (
                                  <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                                    {mediaObj.partOfSpeech}
                                  </span>
                                )}
                              </div>
                              {mediaObj.phonetic && (
                                <p className="text-xs text-primary/80 font-medium tracking-wide">
                                  {mediaObj.phonetic}
                                </p>
                              )}
                            </div>

                            {/* Card Quick Actions: Edit & Delete */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditingCard(card)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                                title="Edit card"
                                aria-label="Edit card"
                              >
                                <span className="text-xs">✏️</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setCardToDelete(card)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Delete card"
                                aria-label="Delete card"
                              >
                                <span className="text-xs">🗑️</span>
                              </button>
                            </div>
                          </div>

                          {/* Card Body: Thumbnail & Definition + Example */}
                          <div className="flex gap-4 items-start flex-1">
                            {(mediaObj.imageUrl || mediaObj.image) && (
                              <img
                                src={mediaObj.imageUrl || mediaObj.image}
                                alt={card.front}
                                referrerPolicy="no-referrer"
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0 border border-border/80 bg-muted/40 shadow-2xs"
                              />
                            )}

                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Meaning
                                </span>
                                <p className="text-sm text-foreground/90 font-medium leading-relaxed">
                                  {card.back}
                                </p>
                              </div>

                              {/* Example sentence if available */}
                              {(mediaObj.example || (mediaObj.examples && mediaObj.examples[0])) && (
                                <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2.5 line-clamp-2">
                                  &ldquo;{mediaObj.example || mediaObj.examples[0]}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Card Footer: Tags */}
                          {tagsList.length > 0 && (
                            <div className="pt-2.5 border-t border-border/60 flex flex-wrap items-center gap-1.5">
                              {tagsList.map((tag: string, idx: number) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedTag(tag)}
                                  className="rounded-lg bg-muted/80 hover:bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  #{tag}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── List / Table View Layout (Compact Rows) ── */}
                {cardViewMode === "list" && (
                  <div className="space-y-2">
                    {filteredCards.map((card) => {
                      const tagsList = parseCardTags(card.tags);
                      const mediaObj = parseCardMedia(card.media);
                      const isSpeaking = speakingCardId === card.id;

                      return (
                        <div
                          key={card.id}
                          className="group bg-card border border-border hover:border-primary/40 rounded-xl p-3.5 sm:px-4 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3.5 flex-1 min-w-0">
                            {(mediaObj.imageUrl || mediaObj.image) && (
                              <img
                                src={mediaObj.imageUrl || mediaObj.image}
                                alt={card.front}
                                referrerPolicy="no-referrer"
                                className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border/70"
                              />
                            )}

                            <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                              <div className="sm:col-span-4 flex items-center gap-2">
                                <span className="font-bold text-foreground text-sm truncate capitalize font-display">
                                  {card.front}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSpeakCard(card.id, card.front)}
                                  className={`text-xs p-1 rounded-lg hover:bg-muted ${
                                    isSpeaking ? "text-primary animate-pulse" : "text-muted-foreground"
                                  }`}
                                  title="Listen"
                                >
                                  🔊
                                </button>
                                {mediaObj.partOfSpeech && (
                                  <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[9px] font-bold text-primary uppercase shrink-0">
                                    {mediaObj.partOfSpeech}
                                  </span>
                                )}
                              </div>

                              <p className="sm:col-span-6 text-xs text-muted-foreground line-clamp-1">
                                {card.back}
                              </p>

                              <div className="sm:col-span-2 hidden sm:flex items-center gap-1 overflow-hidden">
                                {tagsList.slice(0, 2).map((tag: string, idx: number) => (
                                  <span key={idx} className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground truncate">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingCard(card)}
                              className="text-xs h-7 px-2.5 font-semibold"
                              title="Edit"
                            >
                              ✏️ Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setCardToDelete(card)}
                              className="text-xs h-7 px-2 text-destructive hover:bg-destructive/10"
                              title="Delete"
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. STUDY TAB */}
        {activeTab === "study" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="max-w-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl text-primary">
                    🧠
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Study Session</h2>
                    <p className="text-sm text-muted-foreground">
                      Spaced repetition memory practice with SM-2 algorithm
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-xs text-muted-foreground font-medium">Cards in Deck</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{cardCount}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-xs text-muted-foreground font-medium">Due for Review</p>
                    <p className="text-2xl font-bold text-primary mt-1">{dueCount}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Start an interactive study session to review vocabulary cards that need reinforcement.
                  Rate how well you recalled each prompt to adjust your optimal review intervals automatically.
                </p>

                <div className="pt-2 flex flex-wrap gap-3">
                  {dueCount > 0 ? (
                    <Button
                      href={`/study/${deckId}`}
                      as="link"
                      size="lg"
                      className="font-bold px-8 bg-primary text-primary-foreground shadow-md"
                    >
                      🧠 Start Scheduled Review ({dueCount} Due)
                    </Button>
                  ) : null}

                  {cardCount > 0 && (
                    <Button
                      href={`/study/${deckId}?mode=all`}
                      as="link"
                      size="lg"
                      variant={dueCount > 0 ? "secondary" : "primary"}
                      className={`font-bold px-6 ${dueCount === 0 ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md" : ""}`}
                    >
                      🎯 Free Practice (All {cardCount} Cards)
                    </Button>
                  )}

                  {cardCount > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={handleAdvanceDay}
                      disabled={isSimulatingDay}
                      className="border-dashed"
                      title="Advance review dates by 1 day to preview which cards will be due"
                    >
                      {isSimulatingDay ? "Simulating..." : "⏩ Simulate +1 Day"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {cardCount === 0 && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <EmptyState
                  icon="📚"
                  title="No cards to study"
                  description="You need to add at least one card to this deck before launching a study session."
                  action={
                    <Button href={`/card/new?deckId=${deckId}`} as="link">
                      Add Card
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* 4. SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* General Settings Form */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4">Deck Details</h2>
              <form onSubmit={handleSaveEdit} className="space-y-6">
                <Input
                  label="Deck Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Intermediate Vocabulary"
                  required
                />

                <Textarea
                  label="Description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Brief summary or context about this deck"
                  rows={4}
                />

                {/* Public / Private Toggle - Single source of truth */}
                <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/20">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-foreground">Make Public to Community</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Allow other learners to discover, preview, and clone this deck in Community Decks.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editIsPublic}
                    onClick={() => setEditIsPublic((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      editIsPublic ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        editIsPublic ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" size="md" disabled={isSavingEdit}>
                    {isSavingEdit ? "Saving Changes..." : "Save Settings"}
                  </Button>
                </div>
              </form>
            </div>

            {/* Import Cards to this deck */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-2">Import Flashcards</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Add vocabulary cards in bulk into this deck from CSV, JSON, or Anki export files.
              </p>
              <Button
                href={`/import?deckId=${deckId}`}
                as="link"
                variant="secondary"
                size="md"
                className="gap-1.5"
              >
                <span>📥</span>
                <span>Import Cards to this Deck</span>
              </Button>
            </div>

            {/* Danger Zone: Delete Deck */}
            <div className="bg-card border border-destructive/30 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete this deck and all of its flashcards and review history. This action cannot be reversed.
              </p>
              <Button
                type="button"
                variant="destructive"
                size="md"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete Deck
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Quick Add Card Modal */}
      <QuickAddCardModal
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        deckId={deckId}
        targetLanguage={deckData?.targetLanguage || "en"}
        onCardAdded={async () => {
          await invalidateAppCache();
          mutateCards(undefined, { revalidate: true });
          mutateDueReviews(undefined, { revalidate: true });
        }}
      />

      {/* Edit Card Modal */}
      <EditCardModal
        isOpen={Boolean(editingCard)}
        onClose={() => setEditingCard(null)}
        card={editingCard}
        targetLanguage={deckData?.targetLanguage || "en"}
        onCardUpdated={async () => {
          await invalidateAppCache();
          mutateCards(undefined, { revalidate: true });
          mutateDueReviews(undefined, { revalidate: true });
        }}
      />

      {/* Delete Card Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cardToDelete)}
        title="Delete Flashcard"
        description={`Are you sure you want to delete "${cardToDelete?.front}"? This action cannot be reversed.`}
        confirmLabel="Delete Card"
        variant="destructive"
        isLoading={isDeletingCard}
        onConfirm={handleDeleteCardConfirmed}
        onCancel={() => setCardToDelete(null)}
      />

      {/* Delete Deck Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Deck"
        description={`Are you sure you want to delete "${deckData.name}"? This action cannot be undone and will delete all associated cards and review progress.`}
        confirmLabel="Delete Deck"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteDeck}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      <Footer />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, res, query }) => {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const { id } = query;
  if (!id || id === "all") {
    return {
      redirect: {
        destination: "/decks",
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
