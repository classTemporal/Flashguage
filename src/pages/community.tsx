"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Spinner, DeckCardSkeleton } from "@/components/ui/loading";
import { BackButton } from "@/components/ui/back-button";
import { useToast } from "@/components/ui/toast";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to load community decks");
  }
  return res.json();
};

interface CommunityDeck {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  isDictionaryPack?: boolean;
  author: string;
  cardCount: number;
  rating: number;
  tags: string[];
  previewCards: { id: string; front: string; back: string }[];
}

export default function CommunityPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [clonedIds, setClonedIds] = useState<Set<string>>(new Set());
  const [previewDeck, setPreviewDeck] = useState<CommunityDeck | null>(null);

  const { data: communityDecks, error, isLoading, mutate } = useSWR<CommunityDeck[]>(
    "/api/community",
    fetcher
  );

  const allTags = useMemo(() => {
    if (!Array.isArray(communityDecks)) return ["All"];
    const tags = new Set<string>();
    communityDecks.forEach((d) => d.tags.forEach((t) => tags.add(t)));
    return ["All", ...Array.from(tags)];
  }, [communityDecks]);

  const filteredDecks = useMemo(() => {
    if (!Array.isArray(communityDecks)) return [];
    return communityDecks.filter((deck) => {
      const matchesTag = selectedTag === "All" || deck.tags.includes(selectedTag);
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        deck.name.toLowerCase().includes(q) ||
        deck.description?.toLowerCase().includes(q) ||
        deck.author.toLowerCase().includes(q) ||
        deck.tags.some((t) => t.toLowerCase().includes(q));
      return matchesTag && matchesSearch;
    });
  }, [communityDecks, search, selectedTag]);

  const handleCloneDeck = async (deck: CommunityDeck) => {
    setCloningId(deck.id);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId: deck.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to clone community deck");
      }

      const result = await res.json();
      setClonedIds((prev) => new Set([...Array.from(prev), deck.id]));
      showToast(`Installed "${deck.name}" with ${result.cardCount} cards!`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error installing deck";
      showToast(msg, "error");
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-20 lg:pb-0">
      <Header title="Community Decks" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 space-y-6">
        <div className="flex items-center justify-between">
          <BackButton href="/dashboard" label="Back to Dashboard" />
          <Button href="/decks" as="link" variant="secondary" size="sm">
            My Decks
          </Button>
        </div>

        {/* Hero Header & Search Card */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🌐</span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Community Decks
                </h1>
              </div>
              <p className="text-sm text-muted-foreground max-w-xl">
                Discover, preview, and clone flashcard collections shared publicly by students and teachers worldwide.
              </p>
            </div>
            <div className="w-full md:w-80">
              <Input
                placeholder="Search by topic, keyword, or author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Tag Filter Pills */}
          {allTags.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
                Tags:
              </span>
              {allTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTag(t)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    selectedTag === t
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {t === "All" ? "All Topics" : `#${t}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Community Deck List / Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <DeckCardSkeleton />
            <DeckCardSkeleton />
            <DeckCardSkeleton />
            <DeckCardSkeleton />
          </div>
        )}

        {!isLoading && filteredDecks.length === 0 && (
          <div className="bg-card border border-border rounded-3xl p-8 shadow-xs">
            <EmptyState
              icon="🌐"
              title="No community decks found"
              description={
                search || selectedTag !== "All"
                  ? "Try adjusting your search terms or filter tags."
                  : "No public community decks yet. Be the first to share one of your decks with the community!"
              }
              action={
                <div className="flex gap-2">
                  {search || selectedTag !== "All" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setSelectedTag("All");
                      }}
                    >
                      Reset filters
                    </Button>
                  ) : (
                    <Button href="/decks" as="link" size="sm">
                      Go to Your Decks to Make One Public
                    </Button>
                  )}
                </div>
              }
            />
          </div>
        )}

        {!isLoading && filteredDecks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredDecks.map((deck) => {
              const isCloned = clonedIds.has(deck.id);
              const isCloning = cloningId === deck.id;

              return (
                <div
                  key={deck.id}
                  className="bg-card border border-border rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:border-primary/50 hover:shadow-lg transition-all duration-200 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block mb-1.5 ${
                          deck.isDictionaryPack
                            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                            : "text-primary bg-primary/10"
                        }`}>
                          {deck.isDictionaryPack ? "📖 Official Dictionary Pack" : "Community Deck"}
                        </span>
                        <h2 className="text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                          {deck.name}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full">
                        <span>★</span>
                        <span>{deck.rating}</span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {deck.description || "Shared community flashcard collection."}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {deck.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      <p className="font-bold text-foreground">{deck.cardCount} cards</p>
                      <p className="text-[11px]">By @{deck.author}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setPreviewDeck(deck)}
                      >
                        Preview
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleCloneDeck(deck)}
                        disabled={isCloning || isCloned}
                        className={isCloned ? "bg-emerald-600 hover:bg-emerald-600 font-semibold" : "font-semibold"}
                      >
                        {isCloning ? "Cloning..." : isCloned ? "✓ Saved to Decks" : "📥 Clone Deck"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Deck Preview Modal */}
        {previewDeck && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 space-y-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Preview Deck</span>
                  <h3 className="text-xl font-black text-foreground mt-0.5">{previewDeck.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Shared by @{previewDeck.author} • {previewDeck.cardCount} cards</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewDeck(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              {previewDeck.description && (
                <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/50">
                  {previewDeck.description}
                </p>
              )}

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sample Cards
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {previewDeck.previewCards?.map((card, idx) => (
                    <div key={card.id || idx} className="rounded-xl border border-border bg-muted/20 p-3 text-xs space-y-1">
                      <p className="font-bold text-foreground">{card.front}</p>
                      <p className="text-muted-foreground">{card.back}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPreviewDeck(null)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    handleCloneDeck(previewDeck);
                    setPreviewDeck(null);
                  }}
                  disabled={clonedIds.has(previewDeck.id)}
                  className="font-semibold"
                >
                  {clonedIds.has(previewDeck.id) ? "Already Cloned" : "Clone to My Decks"}
                </Button>
              </div>
            </div>
          </div>
        )}
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
