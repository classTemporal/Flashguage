"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { invalidateAppCache } from "@/lib/cache";

interface QuickAddDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeckCreated?: (newDeck: any) => void;
}

const PRESET_DECKS = [
  { name: "🎯 Essential B1-B2 Vocabulary", desc: "Core words for fluent daily conversation" },
  { name: "💼 Business & Workplace English", desc: "Professional terms for meetings and emails" },
  { name: "✈️ Travel & Daily Situations", desc: "Practical expressions for traveling abroad" },
  { name: "📚 Must-know Phrasal Verbs", desc: "Most common multi-word verbs in English" },
];

export function QuickAddDeckModal({
  isOpen,
  onClose,
  onDeckCreated,
}: QuickAddDeckModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [generateCardsWithAI, setGenerateCardsWithAI] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleUsePreset = (preset: { name: string; desc: string }) => {
    setName(preset.name);
    setDescription(preset.desc);
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
      // 1. Create the deck
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
          isPublic,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create deck");
      }

      const newDeck = await res.json();

      // 2. If user chose AI generation, create 3 starter flashcards right away
      if (generateCardsWithAI) {
        try {
          const aiRes = await fetch("/api/ai/generate-flashcards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: trimmedName, count: 3 }),
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
      showToast(`Deck "${trimmedName}" ready to study!`, "success");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-xl text-primary font-bold">
              🗂️
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">Create New Deck</h2>
              <p className="text-xs text-muted-foreground">Setup your deck in 1-click</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Quick Topic Presets:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_DECKS.map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleUsePreset(preset)}
                className="rounded-full bg-muted/70 hover:bg-primary/10 hover:text-primary border border-border/80 px-2.5 py-1 text-xs font-semibold transition-all text-left"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Deck Name or Topic *
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Job Interview Vocab, Idioms, Travel..."
              className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Description (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of topic..."
              rows={2}
            />
          </div>

          {/* AI Starter Flashcards option */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={generateCardsWithAI}
                onChange={(e) => setGenerateCardsWithAI(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-xs font-bold text-foreground flex items-center gap-1">
                <span>✨</span> Generate starter cards with AI
              </span>
            </label>
            <p className="text-[11px] text-muted-foreground pl-6.5 leading-snug">
              Automatically creates 3 starter cards with definitions, phonetics, and images for this topic.
            </p>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 font-bold shadow-md"
            >
              {isSubmitting ? "Creating with AI..." : "Create Deck ✓"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
