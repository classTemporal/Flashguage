"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { invalidateAppCache } from "@/lib/cache";
import { SUPPORTED_LANGUAGES, getLanguage } from "@/lib/languages";

interface QuickAddDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeckCreated?: (newDeck: any) => void;
}

export function QuickAddDeckModal({
  isOpen,
  onClose,
  onDeckCreated,
}: QuickAddDeckModalProps) {
  const { showToast } = useToast();
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [generateCardsWithAI, setGenerateCardsWithAI] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentLang = getLanguage(targetLanguage);
  const presets = currentLang.deckPresets;

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
              <p className="text-xs text-muted-foreground">Setup your multi-language deck in 1-click</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Target Language Selection */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Learning Language Track:
          </label>
          <select
            value={targetLanguage}
            onChange={(e) => {
              setTargetLanguage(e.target.value);
              const lang = getLanguage(e.target.value);
              if (lang.deckPresets[0]) {
                setName(lang.deckPresets[0].name);
                setDescription(lang.deckPresets[0].desc);
              }
            }}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name} ({l.nativeName})
              </option>
            ))}
          </select>
        </div>

        {/* Quick Presets for Target Language */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {currentLang.flag} Suggested {currentLang.name} Presets:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset, i) => (
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

        {/* Deck Form */}
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
              placeholder={`e.g. ${presets[0]?.name || "Core Vocabulary"}`}
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
          <div className="flex items-center justify-end gap-2.5 pt-2">
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
        </form>
      </div>
    </div>
  );
}
