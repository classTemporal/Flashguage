"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { BackButton } from "@/components/ui/back-button";
import { DeckCardSkeleton, EmptyState } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { QuickAddDeckModal } from "@/components/deck/quick-add-deck-modal";
import { ExploreStarterDeckModal } from "@/components/deck/explore-starter-deck-modal";
import { getLanguage, getStoredActiveLanguage } from "@/lib/languages";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Deck {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  targetLanguage?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { cards: number };
}

interface StarterTemplateItem {
  id: string;
  name: string;
  description: string;
  targetLanguage: string;
  category: string;
  icon: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  totalCards: number;
  isImported: boolean;
  matchingUserDeckId?: string;
  cards: { front: string; back: string }[];
}

export default function DecksPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeLanguage, setActiveLanguage] = useState<string>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = router.query.lang as string;
      const stored = getStoredActiveLanguage();
      if (q && q.trim()) setActiveLanguage(q.trim());
      else if (stored && stored.trim()) setActiveLanguage(stored.trim());
    }
  }, [router.query.lang]);

  const currentLang = getLanguage(activeLanguage);
  const decksUrl = activeLanguage ? `/api/decks?lang=${encodeURIComponent(activeLanguage)}` : "/api/decks";
  const { data: decks, error, isLoading, mutate } = useSWR<Deck[]>(decksUrl, fetcher);

  const starterUrl = `/api/decks/starter-templates?lang=${encodeURIComponent(activeLanguage)}`;
  const {
    data: starterTemplates,
    isLoading: isStarterLoading,
    mutate: mutateStarter,
  } = useSWR<StarterTemplateItem[]>(starterUrl, fetcher);

  // Offline decks cache
  const [offlineDecks, setOfflineDecks] = useState<Deck[]>([]);

  useEffect(() => {
    if (Array.isArray(decks) && decks.length > 0) {
      try {
        localStorage.setItem(`flashguage_offline_decks_${activeLanguage}`, JSON.stringify(decks));
      } catch {}
    } else if (error) {
      try {
        const stored = localStorage.getItem(`flashguage_offline_decks_${activeLanguage}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOfflineDecks(parsed);
          }
        }
      } catch {}
    }
  }, [decks, error, activeLanguage]);

  const effectiveDecks = (Array.isArray(decks) && decks.length > 0) ? decks : offlineDecks;

  // Tab & search state
  const [activeTab, setActiveTab] = useState<"my-decks" | "starter-kits">("my-decks");
  const [isImportingId, setIsImportingId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Edit Deck state
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Deck state
  const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [pinnedDeckIds, setPinnedDeckIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("flashguage_pinned_decks");
        if (raw) setPinnedDeckIds(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const handleTogglePinDeck = (id: string, name: string) => {
    setPinnedDeckIds((prev) => {
      const isPinned = prev.includes(id);
      const updated = isPinned ? prev.filter((d) => d !== id) : [...prev, id];
      try {
        localStorage.setItem("flashguage_pinned_decks", JSON.stringify(updated));
      } catch {}
      if (isPinned) {
        showToast(`Unpinned "${name}"`, "info");
      } else {
        showToast(`📌 Pinned "${name}" to favorites!`, "success");
      }
      return updated;
    });
  };

  const handleImportStarter = async (templateId: string, templateName: string) => {
    setIsImportingId(templateId);
    try {
      const res = await fetch("/api/decks/starter-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to import starter deck");

      showToast(`🎉 Imported "${templateName}"!`, "success");
      await mutate();
      await mutateStarter();
      setActiveTab("my-decks");
    } catch (err: any) {
      showToast(err.message || "Could not import deck", "error");
    } finally {
      setIsImportingId(null);
    }
  };

  const filteredDecks = useMemo(() => {
    if (!effectiveDecks || effectiveDecks.length === 0) return [];
    let list = effectiveDecks;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q))
      );
    }
    // Sort: Pinned first -> Most recently updated -> Alphabetical
    return [...list].sort((a, b) => {
      const aPinned = pinnedDeckIds.includes(a.id);
      const bPinned = pinnedDeckIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;

      return a.name.localeCompare(b.name);
    });
  }, [decks, search, pinnedDeckIds]);

  const handleStartEdit = (deck: Deck) => {
    setEditingDeck(deck);
    setEditName(deck.name);
    setEditDescription(deck.description || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeck) return;

    const trimmed = editName.trim();
    if (!trimmed) {
      showToast("Deck name cannot be empty", "error");
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch("/api/decks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDeck.id,
          name: trimmed,
          description: editDescription.trim() || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update deck");
      }

      showToast("Deck updated successfully!", "success");
      setEditingDeck(null);
      mutate();
    } catch {
      showToast("Could not update deck. Please try again.", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleStartDelete = (deck: Deck) => {
    setDeletingDeck(deck);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDeck) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/decks?id=${encodeURIComponent(deletingDeck.id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete deck");
      }

      showToast(`Deleted deck "${deletingDeck.name}"`, "success");
      setDeletingDeck(null);
      mutate();
    } catch {
      showToast("Could not delete deck. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-20 md:pb-0">
      <Header title="Flashguage" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton href={activeLanguage ? `/dashboard?lang=${encodeURIComponent(activeLanguage)}` : "/dashboard"} label="Back to Dashboard" />
            <span className="text-xs font-bold text-muted-foreground bg-muted/60 px-3 py-1 rounded-xl border border-border flex items-center gap-1.5 shadow-xs">
              <span>{currentLang.flag}</span>
              <span>{currentLang.name}</span>
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 font-bold shadow-xs"
          >
            <span>⚡ + New Deck</span>
          </Button>
        </div>

        {/* Page Title & Search Bar Card */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  {activeTab === "starter-kits" ? "Starter Kits" : "My Decks"}
                </h1>
                <Button
                  href="/progress"
                  as="link"
                  variant="secondary"
                  size="sm"
                  className="font-bold text-xs gap-1 shadow-xs"
                >
                  <span>📈</span>
                  <span>Learning Progress</span>
                </Button>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTab === "starter-kits"
                  ? "Explore curated high-yield vocabulary sets ready to import in 1 click."
                  : "Organize, study, and keep your custom vocabulary decks up to date."}
              </p>
            </div>
            {activeTab === "my-decks" && (
              <div className="w-full md:w-72">
                <Input
                  placeholder="Search decks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs: My Decks vs Starter Kits */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("my-decks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "my-decks"
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <span>🗂️</span>
            <span>My Decks</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "my-decks"
                  ? "bg-primary-foreground/20 text-primary-foreground font-extrabold"
                  : "bg-muted text-muted-foreground font-semibold"
              }`}
            >
              {filteredDecks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("starter-kits")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "starter-kits"
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <span>🎁</span>
            <span>Starter Kits</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "starter-kits"
                  ? "bg-primary-foreground/20 text-primary-foreground font-extrabold"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold"
              }`}
            >
              {starterTemplates?.length ?? 4} Ready
            </span>
          </button>
        </div>

        {/* Tab 1: My Decks */}
        {activeTab === "my-decks" && (
          <>
            {/* Loading Skeletons */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <DeckCardSkeleton />
                <DeckCardSkeleton />
                <DeckCardSkeleton />
              </div>
            )}

            {/* Error State only when no cached decks are available */}
            {!isLoading && error && effectiveDecks.length === 0 && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <EmptyState
                  icon="⚠️"
                  title="Failed to load decks"
                  description="There was an error loading your decks. Please check your connection and try again."
                  action={
                    <Button onClick={() => mutate()} variant="secondary" size="sm">
                      Try Again
                    </Button>
                  }
                />
              </div>
            )}

            {/* Offline notification badge if displaying from local offline cache */}
            {error && effectiveDecks.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-500">
                <span>📶</span>
                <span>
                  <strong>Offline Mode:</strong> Displaying {effectiveDecks.length} locally saved deck(s).
                </span>
              </div>
            )}

            {/* Empty State when no decks at all */}
            {!isLoading && effectiveDecks.length === 0 && !error && (
              <div className="bg-card border border-border rounded-2xl p-8 shadow-xs">
                <EmptyState
                  icon="🗂️"
                  title="No decks found"
                  description="You haven't created any flashcard decks yet. Create your first deck, explore curated starter kits, or import cards to begin!"
                  action={
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        onClick={() => setActiveTab("starter-kits")}
                        size="md"
                        className="font-bold gap-1.5 bg-gradient-to-r from-primary to-indigo-600 text-white shadow-xs"
                      >
                        <span>🎁</span>
                        <span>Explore Starter Kits</span>
                      </Button>
                      <Button type="button" onClick={() => setIsCreateOpen(true)} variant="secondary" size="md" className="font-bold">
                        ⚡ + Create Blank Deck
                      </Button>
                      <Button as="link" href="/import" variant="ghost" size="md">
                        Import Cards
                      </Button>
                    </div>
                  }
                />
              </div>
            )}

            {/* Empty State when search has no results */}
            {!isLoading && effectiveDecks.length > 0 && filteredDecks.length === 0 && (
              <div className="bg-card border border-border rounded-2xl p-8 shadow-xs">
                <EmptyState
                  icon="🔍"
                  title="No matching decks"
                  description={`No decks match the query "${search}".`}
                  action={
                    <Button type="button" variant="secondary" onClick={() => setSearch("")}>
                      Clear Search
                    </Button>
                  }
                />
              </div>
            )}

            {/* Decks Grid */}
            {!isLoading && filteredDecks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDecks.map((deck) => {
                  const cardCount = deck._count?.cards ?? 0;
                  const isPinned = pinnedDeckIds.includes(deck.id);
                  return (
                    <div
                      key={deck.id}
                      className={`bg-card border rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group ${
                        isPinned
                          ? "border-amber-500/40 bg-gradient-to-b from-card via-card to-amber-500/5 ring-1 ring-amber-500/20"
                          : "border-border"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {deck.targetLanguage && (
                              <span className="text-base shrink-0" title={getLanguage(deck.targetLanguage).name}>
                                {getLanguage(deck.targetLanguage).flag}
                              </span>
                            )}
                            <Link
                              href={`/deck/${deck.id}`}
                              className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1"
                            >
                              {deck.name}
                            </Link>
                            {isPinned && (
                              <span className="shrink-0 text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-500 px-1.5 py-0.5 rounded-full">
                                📌
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleTogglePinDeck(deck.id, deck.name)}
                              className={`p-1.5 rounded-lg border transition-all text-xs ${
                                isPinned
                                  ? "bg-amber-500/20 border-amber-500/40 text-amber-500 shadow-xs hover:bg-amber-500/30"
                                  : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                              }`}
                              title={isPinned ? "Unpin favorite deck" : "Pin deck as favorite"}
                              aria-label={isPinned ? `Unpin ${deck.name}` : `Pin ${deck.name}`}
                            >
                              <span className="text-sm leading-none">{isPinned ? "📌" : "🤍"}</span>
                            </button>
                            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                              {cardCount} {cardCount === 1 ? "card" : "cards"}
                            </span>
                          </div>
                        </div>

                        {deck.description ? (
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {deck.description}
                          </p>
                        ) : (
                          <p className="text-sm italic text-muted-foreground/60">
                            No description
                          </p>
                        )}
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(deck)}
                            className="text-xs text-muted-foreground hover:text-foreground px-2.5"
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartDelete(deck)}
                            className="text-xs text-destructive hover:bg-destructive/10 px-2.5"
                          >
                            Delete
                          </Button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            as="link"
                            href={`/progress?deckId=${deck.id}`}
                            size="sm"
                            variant="secondary"
                            className="text-xs font-semibold px-2.5 gap-1"
                            title="View learning progress for this deck"
                          >
                            <span>📈</span>
                            <span>Progress</span>
                          </Button>
                          <Button
                            as="link"
                            href={`/deck/${deck.id}`}
                            size="sm"
                            variant="primary"
                            className="font-semibold text-xs"
                          >
                            Study →
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Tab 2: Starter Kits */}
        {activeTab === "starter-kits" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary/10 via-card to-indigo-500/10 border border-primary/20 rounded-2xl p-6 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs mb-2">
                    <span>✨</span> Pre-made Starter Decks
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    Instant Vocabulary Packs
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                    High-yield vocabulary sets with contextual practice sentences, illustrative images, and active recall definitions. Add them to your study routine with a single click.
                  </p>
                </div>
              </div>
            </div>

            {isStarterLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <DeckCardSkeleton />
                <DeckCardSkeleton />
                <DeckCardSkeleton />
              </div>
            )}

            {!isStarterLoading && starterTemplates && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {starterTemplates.map((template) => {
                  const isImporting = isImportingId === template.id;
                  return (
                    <div
                      key={template.id}
                      className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-primary/50 hover:shadow-lg transition-all"
                    >
                      <div
                        className="space-y-3.5 cursor-pointer"
                        onClick={() => setPreviewTemplate(template)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{template.icon}</span>
                            <div>
                              <h3 className="font-bold text-base text-foreground leading-snug hover:text-primary transition-colors">
                                {template.name}
                              </h3>
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                {template.category}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              template.level === "Beginner"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : template.level === "Intermediate"
                                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                                : "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                            }`}
                          >
                            {template.level}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {template.description}
                        </p>

                        {/* Words Sample Chips */}
                        <div className="space-y-1.5 pt-2 border-t border-border/50">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Sample words included:
                            </p>
                            <span className="text-[10px] font-bold text-primary hover:underline">
                              Explore all {template.totalCards} cards →
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {template.cards.slice(0, 4).map((c, i) => (
                              <span
                                key={i}
                                className="inline-block text-[11px] font-semibold bg-muted/80 px-2 py-0.5 rounded-md text-foreground"
                              >
                                {c.front}
                              </span>
                            ))}
                            {template.totalCards > 4 && (
                              <span className="inline-block text-[11px] font-medium text-muted-foreground px-1 py-0.5">
                                +{template.totalCards - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewTemplate(template)}
                          className="font-bold text-xs gap-1 text-muted-foreground hover:text-foreground border border-border/60 hover:bg-muted/80"
                        >
                          <span>👁️</span> Explore Cards ({template.totalCards})
                        </Button>

                        {template.isImported ? (
                          <Button
                            as="link"
                            href={`/deck/${template.matchingUserDeckId}`}
                            variant="secondary"
                            size="sm"
                            className="font-bold text-xs gap-1 shadow-xs text-emerald-600 dark:text-emerald-400"
                          >
                            <span>✓</span> In My Decks →
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => handleImportStarter(template.id, template.name)}
                            disabled={isImporting}
                            size="sm"
                            className="font-bold text-xs gap-1.5 bg-gradient-to-r from-primary to-indigo-600 text-white shadow-xs"
                          >
                            <span>{isImporting ? "⏳" : "⚡"}</span>
                            <span>{isImporting ? "Adding..." : "Add to Decks"}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Edit Deck Modal */}
        {editingDeck && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-deck-title"
          >
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95">
              <h2 id="edit-deck-title" className="text-lg font-bold text-foreground mb-4">
                Edit Deck Details
              </h2>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <Input
                  label="Deck Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. TOEFL Essential Vocabulary"
                  required
                />
                <Textarea
                  label="Description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional brief description"
                  rows={3}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingDeck(null)}
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSavingEdit}>
                    {isSavingEdit ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Add Deck Modal */}
        <QuickAddDeckModal
          isOpen={isCreateOpen}
          defaultLanguage={activeLanguage}
          onClose={() => setIsCreateOpen(false)}
          onDeckCreated={() => mutate()}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!deletingDeck}
          title="Delete Deck"
          description={`Are you sure you want to delete "${deletingDeck?.name}"? All cards in this deck will be permanently removed.`}
          confirmLabel="Delete Deck"
          variant="destructive"
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingDeck(null)}
        />

        {/* Explore Starter Deck Modal */}
        <ExploreStarterDeckModal
          isOpen={!!previewTemplate}
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onImport={async (id, name) => {
            await handleImportStarter(id, name);
            setPreviewTemplate(null);
          }}
          isImporting={isImportingId === previewTemplate?.id}
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
