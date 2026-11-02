"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { invalidateAppCache } from "@/lib/cache";
import { SUPPORTED_LANGUAGES, getLanguage } from "@/lib/languages";
import { ExploreStarterDeckModal } from "@/components/deck/explore-starter-deck-modal";

interface QuickAddDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLanguage?: string;
  onDeckCreated?: (newDeck: any) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function QuickAddDeckModal({
  isOpen,
  onClose,
  defaultLanguage = "en",
  onDeckCreated,
}: QuickAddDeckModalProps) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<"starter" | "custom">("starter");
  const [targetLanguage, setTargetLanguage] = useState(defaultLanguage);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [generateCardsWithAI, setGenerateCardsWithAI] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImportingStarterId, setIsImportingStarterId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);

  useEffect(() => {
    if (defaultLanguage && defaultLanguage !== "all") {
      setTargetLanguage(defaultLanguage);
    }
  }, [defaultLanguage, isOpen]);

  // Fetch starter templates for current language
  const starterUrl = isOpen
    ? `/api/decks/starter-templates?lang=${encodeURIComponent(targetLanguage)}`
    : null;
  const {
    data: starterTemplates,
    isLoading: isStartersLoading,
    mutate: mutateStarters,
  } = useSWR<any[]>(starterUrl, fetcher);

  if (!isOpen) return null;

  const currentLang = getLanguage(targetLanguage);

  const handleImportStarter = async (templateId: string, templateName: string) => {
    setIsImportingStarterId(templateId);
    try {
      const res = await fetch("/api/decks/starter-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to import starter deck");
      }

      await invalidateAppCache();
      showToast(data.message || `Imported "${templateName}"!`, "success");
      await mutateStarters();
      onDeckCreated?.(data.deck);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error importing starter deck";
      showToast(msg, "error");
    } finally {
      setIsImportingStarterId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      showToast("Please enter a name for the deck", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create the deck with targetLanguage
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
          targetLanguage,
          isPublic,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create deck");
      }

      const newDeck = await res.json();

      // 2. If user chose AI generation, create 3 starter flashcards in that target language
      if (generateCardsWithAI) {
        try {
          const aiRes = await fetch("/api/ai/generate-flashcards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: trimmedName,
              count: 3,
              targetLanguage: currentLang.name,
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            if (aiData.cards && Array.isArray(aiData.cards)) {
              for (const card of aiData.cards) {
                await fetch("/api/cards", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    deckId: newDeck.id,
                    front: card.front,
                    back: card.back,
                    tags: card.tags || (card.partOfSpeech ? [card.partOfSpeech] : []),
                    imageUrl: card.imageUrl,
                    phonetic: card.phonetic,
                    partOfSpeech: card.partOfSpeech,
                    examples: card.example,
                  }),
                });
              }
            }
          }
        } catch {
          // deck was created anyway
        }
      }

      await invalidateAppCache();
      showToast(`Deck "${trimmedName}" (${currentLang.flag} ${currentLang.name}) ready to study!`, "success");
      onDeckCreated?.(newDeck);
      setName("");
      setDescription("");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection error";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl p-5 sm:p-6 space-y-4 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-xl text-primary font-bold">
                🗂️
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground">Add New Deck</h2>
                <p className="text-xs text-muted-foreground">Pick a ready-to-study pack or create your own</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-bold transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-muted/50 border border-border">
            <button
              type="button"
              onClick={() => setTab("starter")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                tab === "starter"
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>✨ Starter Packs</span>
              <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.2 rounded-full font-bold">
                20+ cards
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("custom")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                tab === "custom"
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>✏️ Custom Deck</span>
            </button>
          </div>

          {/* Current Language Track Indicator */}
          <div className="flex items-center justify-between rounded-2xl bg-muted/40 border border-border px-3.5 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Language Track
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-foreground">
              <span className="text-base" role="img" aria-label={currentLang.name}>
                {currentLang.flag}
              </span>
              <span>{currentLang.name}</span>
            </span>
          </div>

          {/* Tab 1: Starter Packs */}
          {tab === "starter" && (
            <div className="flex-1 overflow-y-auto space-y-3 max-h-[55vh] pr-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Curated Packs Available:
                </span>
                <span className="text-[11px] text-muted-foreground">
                  With phonetics, images & examples
                </span>
              </div>

              {isStartersLoading && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Loading starter packs...
                </div>
              )}

              {!isStartersLoading && starterTemplates && starterTemplates.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No starter packs available for {currentLang.name} yet.
                </div>
              )}

              {!isStartersLoading &&
                starterTemplates &&
                starterTemplates.map((template) => {
                  const isImporting = isImportingStarterId === template.id;
                  return (
                    <div
                      key={template.id}
                      className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs hover:border-primary/40 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-2xl p-1.5 rounded-xl bg-primary/10 shrink-0">
                            {template.icon}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-foreground truncate">
                              {template.name}
                            </h3>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {template.category} • {template.totalCards || template.cards?.length} cards
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            template.level === "Beginner"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : template.level === "Intermediate"
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              : "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                          }`}
                        >
                          {template.level}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {template.description}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/50">
                        <button
                          type="button"
                          onClick={() => setPreviewTemplate(template)}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          <span>👁️ Preview all cards</span>
                        </button>

                        {template.isImported ? (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span>✓</span> Added
                          </span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            disabled={isImporting}
                            onClick={() => handleImportStarter(template.id, template.name)}
                            className="text-xs font-bold h-8 px-3 gap-1 shadow-xs"
                          >
                            <span>⚡</span>
                            <span>{isImporting ? "Adding..." : "Add to My Decks"}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setTab("custom")}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold underline"
                >
                  Or create an empty custom deck from scratch →
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Custom Deck Form */}
          {tab === "custom" && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Deck Title *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Core Vocabulary, Travel Phrases, Exam Prep"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Description (Optional)
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you focusing on in this deck?"
                  rows={2}
                />
              </div>

              {/* AI Starter Cards Checkbox */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateCardsWithAI}
                    onChange={(e) => setGenerateCardsWithAI(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span>✨</span>
                    <span>Generate 3 starter cards with AI ({currentLang.name})</span>
                  </span>
                </label>
                <p className="text-[11px] text-muted-foreground pl-6.5">
                  Instantly creates relevant vocabulary with definitions, native audio phonetics, and images.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setTab("starter")}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  ← Browse Starter Packs
                </button>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="font-bold shadow-md bg-primary text-primary-foreground"
                  >
                    {isSubmitting ? "Creating Deck..." : "⚡ Create Deck"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Explore Starter Deck Modal */}
      <ExploreStarterDeckModal
        isOpen={!!previewTemplate}
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onImport={async (id, name) => {
          await handleImportStarter(id, name);
          setPreviewTemplate(null);
        }}
        isImporting={isImportingStarterId === previewTemplate?.id}
      />
    </>
  );
}
