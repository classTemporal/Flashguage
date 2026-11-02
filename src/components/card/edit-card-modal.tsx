"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ImagePicker } from "@/components/card/image-picker";
import { useToast } from "@/components/ui/toast";
import { invalidateAppCache } from "@/lib/cache";

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLanguage?: string;
  card: {
    id: string;
    front: string;
    back: string;
    tags: string;
    media?: string | null;
  } | null;
  onCardUpdated: () => void;
}

export function EditCardModal({
  isOpen,
  onClose,
  targetLanguage = "en",
  card,
  onCardUpdated,
}: EditCardModalProps) {
  const { showToast } = useToast();

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [examples, setExamples] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  useEffect(() => {
    if (card) {
      setFront(card.front || "");
      setBack(card.back || "");

      let parsedTags = "";
      try {
        if (card.tags && card.tags !== "[]") {
          const t = JSON.parse(card.tags);
          if (Array.isArray(t)) parsedTags = t.join(", ");
        }
      } catch {
        parsedTags = card.tags || "";
      }
      setTags(parsedTags);

      try {
        if (card.media) {
          const media = JSON.parse(card.media);
          setImageUrl(media.imageUrl || media.image || "");
          setPhonetic(media.phonetic || "");
          setPartOfSpeech(media.partOfSpeech || "");
          if (Array.isArray(media.examples)) {
            setExamples(media.examples.join("\n"));
          } else if (typeof media.examples === "string") {
            setExamples(media.examples);
          } else if (typeof media.example === "string") {
            setExamples(media.example);
          }
        } else {
          setImageUrl("");
          setPhonetic("");
          setPartOfSpeech("");
          setExamples("");
        }
      } catch {
        setImageUrl("");
        setPhonetic("");
        setPartOfSpeech("");
        setExamples("");
      }
    }
  }, [card]);

  if (!isOpen || !card) return null;

  const handleEnhanceWithAI = async () => {
    if (!front.trim()) {
      showToast("Please enter a word or phrase first", "error");
      return;
    }
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/ai/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: front.trim(),
          context: back.trim() || undefined,
          targetLanguage,
        }),
      });
      if (!res.ok) throw new Error("Could not enrich with AI");
      const data = await res.json();
      if (data.definition && !back) setBack(data.definition);
      if (data.phonetic) setPhonetic(data.phonetic);
      if (data.partOfSpeech) setPartOfSpeech(data.partOfSpeech);
      if (data.example) {
        setExamples((prev) => (prev ? `${prev}\n${data.example}` : data.example));
      }
      if (data.tags && Array.isArray(data.tags)) {
        setTags(data.tags.join(", "));
      }
      showToast("Flashcard enriched with AI data!", "success");
    } catch {
      showToast("Could not enhance with AI at this time", "error");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) {
      showToast("Word and definition are required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const parsedExamplesArray = examples
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean);

      const res = await fetch("/api/cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: card.id,
          front: front.trim(),
          back: back.trim(),
          tags: parsedTagsArray,
          imageUrl: imageUrl.trim() || undefined,
          phonetic: phonetic.trim() || undefined,
          partOfSpeech: partOfSpeech.trim() || undefined,
          examples: parsedExamplesArray,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save changes");
      }

      await invalidateAppCache();
      showToast("Card updated successfully!", "success");
      onCardUpdated();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update card", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-card-title"
    >
      <div className="relative w-full max-w-xl my-8 rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h2 id="edit-card-title" className="text-xl font-bold text-foreground">
              Edit Flashcard
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Update vocabulary details, illustrative image, and context.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1">
              <Input
                label="Word / Phrase (Front)"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="e.g. Ubiquitous, Reluctant..."
                required
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleEnhanceWithAI}
              disabled={isEnhancing || !front.trim()}
              className="mb-1 text-xs font-semibold gap-1 shrink-0"
              title="Autocomplete phonetics, part of speech, and examples"
            >
              <span>{isEnhancing ? "✨ Enhancing..." : "✨ AI Autofill"}</span>
            </Button>
          </div>

          <Textarea
            label="Definition / Meaning (Back)"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="e.g. Present, appearing, or found everywhere."
            rows={3}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phonetic (optional)"
              value={phonetic}
              onChange={(e) => setPhonetic(e.target.value)}
              placeholder="/juːˈbɪk.wɪ.təs/"
            />
            <Input
              label="Part of Speech (optional)"
              value={partOfSpeech}
              onChange={(e) => setPartOfSpeech(e.target.value)}
              placeholder="e.g. adjective, idiom, verb"
            />
          </div>

          <Textarea
            label="Example Sentence / Cloze Context"
            value={examples}
            onChange={(e) => setExamples(e.target.value)}
            placeholder="e.g. Smartphones have become ubiquitous in daily life."
            rows={2}
          />

          <Input
            label="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. advanced, b2, formal"
          />

          {/* Illustrative Image Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Illustrative Image
            </label>
            <ImagePicker
              value={imageUrl}
              onChange={setImageUrl}
              searchQuery={front}
              definitionContext={back}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="md"
              disabled={isSubmitting}
              className="font-bold shadow-xs"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
