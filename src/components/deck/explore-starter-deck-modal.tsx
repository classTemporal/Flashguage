"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { StarterDeckTemplate, StarterCardTemplate } from "@/lib/starter-decks";

interface ExploreStarterDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: (StarterDeckTemplate & { isImported?: boolean; matchingUserDeckId?: string }) | null;
  onImport: (id: string, name: string) => Promise<void>;
  isImporting?: boolean;
}

export function ExploreStarterDeckModal({
  isOpen,
  onClose,
  template,
  onImport,
  isImporting = false,
}: ExploreStarterDeckModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCards = useMemo(() => {
    if (!template) return [];
    if (!searchQuery.trim()) return template.cards;

    const q = searchQuery.toLowerCase().trim();
    return template.cards.filter(
      (c) =>
        c.front.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q) ||
        c.example.toLowerCase().includes(q) ||
        c.partOfSpeech.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [template, searchQuery]);

  if (!isOpen || !template) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-border/80 bg-muted/20 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl shrink-0 p-2 rounded-2xl bg-primary/10 border border-primary/20">
                {template.icon}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-foreground truncate">
                    {template.name}
                  </h2>
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
                <p className="text-xs text-muted-foreground mt-0.5">
                  {template.category} • <span className="font-bold text-foreground">{template.cards.length} cards</span> curated
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-bold transition-colors shrink-0"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {template.description}
          </p>

          {/* Search bar inside preview */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search among all ${template.cards.length} cards...`}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {template.isImported ? (
              <Button
                as="link"
                href={`/deck/${template.matchingUserDeckId}`}
                variant="secondary"
                size="sm"
                className="shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400"
              >
                <span>✓</span> In My Decks →
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => onImport(template.id, template.name)}
                disabled={isImporting}
                className="shrink-0 text-xs font-bold gap-1.5"
              >
                <span>⚡</span>
                {isImporting ? "Adding..." : "Add to My Decks"}
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredCards.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs">
              No cards found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredCards.map((card, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-2xl p-4 shadow-2xs hover:border-primary/40 transition-all flex flex-col sm:flex-row gap-4 items-start justify-between"
              >
                {/* Optional illustrative thumbnail */}
                {card.imageUrl && (
                  <img
                    src={card.imageUrl}
                    alt={card.front}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-border bg-muted"
                  />
                )}

                <div className="flex-1 space-y-2 min-w-0 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-base text-foreground">
                      {card.front}
                    </span>
                    {card.partOfSpeech && (
                      <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                        {card.partOfSpeech}
                      </span>
                    )}
                    {card.phonetic && (
                      <span className="text-xs font-mono text-muted-foreground">
                        {card.phonetic}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                    {card.back}
                  </p>

                  {card.example && (
                    <div className="rounded-xl bg-muted/40 border border-border/40 p-2.5 text-xs text-muted-foreground italic leading-relaxed">
                      &quot;{card.example}&quot;
                    </div>
                  )}

                  {card.tags && card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {card.tags.map((t, ti) => (
                        <span
                          key={ti}
                          className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            Showing {filteredCards.length} of {template.cards.length} cards
          </span>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>

            {template.isImported ? (
              <Button
                as="link"
                href={`/deck/${template.matchingUserDeckId}`}
                size="sm"
                className="font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20"
              >
                <span>✓</span> View Deck →
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => onImport(template.id, template.name)}
                disabled={isImporting}
                className="font-bold text-xs gap-1.5"
              >
                <span>⚡</span>
                {isImporting ? "Adding Deck..." : `Add to My Decks (${template.cards.length} cards)`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
