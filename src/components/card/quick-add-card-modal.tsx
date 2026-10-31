"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ImagePicker } from "@/components/card/image-picker";
import { useToast } from "@/components/ui/toast";
import { invalidateAppCache } from "@/lib/cache";
import { speakInLanguage, getLanguage } from "@/lib/languages";

interface QuickAddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckId: string;
  targetLanguage?: string;
  onCardAdded?: () => void;
}

type ModalTab = "ai" | "manual";

interface DefinitionOption {
  id: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
  synonyms?: string[];
}

export function QuickAddCardModal({
  isOpen,
  onClose,
  deckId,
  targetLanguage = "en",
  onCardAdded,
}: QuickAddCardModalProps) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<ModalTab>("ai");

  // AI Tab State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [definitionOptions, setDefinitionOptions] = useState<DefinitionOption[]>([]);
  const [wordHeader, setWordHeader] = useState("");
  const [phoneticHeader, setPhoneticHeader] = useState("");
  
  // Selected definition review state before saving
  const [selectedDefinition, setSelectedDefinition] = useState<DefinitionOption | null>(null);
  const [customExample, setCustomExample] = useState("");
  const [imageCandidates, setImageCandidates] = useState<string[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [isFetchingImages, setIsFetchingImages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Manual Tab State
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [examples, setExamples] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualDefinitions, setManualDefinitions] = useState<DefinitionOption[]>([]);
  const [isManualLookup, setIsManualLookup] = useState(false);

  if (!isOpen) return null;

  // Speak word using Web Speech API with deck target language
  const handleSpeak = (text: string) => {
    speakInLanguage(text, targetLanguage);
  };

  // Step 1: Search definitions for the word
  const handleSearchDefinitions = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = aiPrompt.trim();
    if (!prompt) {
      showToast("Please enter a word or idiom to search", "error");
      return;
    }

    setIsLookingUp(true);
    setDefinitionOptions([]);
    setSelectedDefinition(null);
    setImageCandidates([]);
    setSelectedImageUrl("");

    try {
      // 1. Try dictionary lookup for multiple definitions in deck language
      const dictRes = await fetch(`/api/dictionary-lookup?word=${encodeURIComponent(prompt)}&lang=${targetLanguage}`);
      if (dictRes.ok) {
        const dictData = await dictRes.json();
        const defs: DefinitionOption[] = dictData.definitions || [];

        setWordHeader(dictData.word || prompt);
        setPhoneticHeader(dictData.phonetic || "");

        if (defs.length > 0) {
          setDefinitionOptions(defs);
          // If only 1 definition exists, automatically select it and fetch images
          if (defs.length === 1) {
            await handleSelectDefinition(defs[0], dictData.word || prompt);
          }
          setIsLookingUp(false);
          return;
        }
      }

      // 2. Fallback to AI generation endpoint if not in dictionary
      const aiRes = await fetch("/api/ai/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          count: 1,
          targetLanguage: getLanguage(targetLanguage).name,
        }),
      });

      if (!aiRes.ok) throw new Error("Could not find definitions for this word");

      const aiData = await aiRes.json();
      const generated = aiData.cards?.[0];

      if (!generated || !generated.front) {
        showToast("Could not generate card for this term", "error");
        setIsLookingUp(false);
        return;
      }

      setWordHeader(generated.front);
      setPhoneticHeader(generated.phonetic || "");

      const singleDef: DefinitionOption = {
        id: "ai-def-0",
        partOfSpeech: generated.partOfSpeech || "vocabulary",
        definition: generated.back,
        example: generated.example,
      };

      setDefinitionOptions([singleDef]);
      await handleSelectDefinition(singleDef, generated.front, generated.imageUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error finding definitions";
      showToast(msg, "error");
    } finally {
      setIsLookingUp(false);
    }
  };

  // Step 2: User selects one specific definition -> load 3 image candidates
  const handleSelectDefinition = async (
    def: DefinitionOption,
    wordToUse?: string,
    existingImageUrl?: string
  ) => {
    setSelectedDefinition(def);
    setCustomExample(def.example || "");
    setIsFetchingImages(true);

    const term = wordToUse || wordHeader || aiPrompt.trim();

    try {
      const imgRes = await fetch("/api/image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: term,
          definition: def.definition,
          example: def.example,
        }),
      });

      if (imgRes.ok) {
        const imgData = await imgRes.json();
        const candidates: string[] = Array.isArray(imgData.candidates) && imgData.candidates.length > 0
          ? imgData.candidates.slice(0, 3)
          : imgData.imageUrl ? [imgData.imageUrl] : existingImageUrl ? [existingImageUrl] : [];

        setImageCandidates(candidates);
        setSelectedImageUrl(candidates[0] || existingImageUrl || "");
      } else if (existingImageUrl) {
        setImageCandidates([existingImageUrl]);
        setSelectedImageUrl(existingImageUrl);
      }
    } catch {
      if (existingImageUrl) {
        setImageCandidates([existingImageUrl]);
        setSelectedImageUrl(existingImageUrl);
      }
    } finally {
      setIsFetchingImages(false);
    }
  };

  // Step 3: Save selected definition and chosen image directly to the deck
  const handleSaveSelectedCard = async () => {
    if (!selectedDefinition) return;
    const term = wordHeader || aiPrompt.trim();

    setIsSaving(true);
    try {
      const tagsList = [selectedDefinition.partOfSpeech, "vocabulary"].filter(Boolean);

      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckId,
          front: term,
          back: selectedDefinition.definition,
          tags: tagsList,
          imageUrl: selectedImageUrl.trim() || undefined,
          phonetic: phoneticHeader.trim() || undefined,
          partOfSpeech: selectedDefinition.partOfSpeech || undefined,
          examples: customExample.trim() ? [customExample.trim()] : undefined,
        }),
      });

      if (!res.ok) throw new Error("Error creating flashcard");

      await invalidateAppCache();
      showToast(`✨ Flashcard "${term}" created with chosen definition!`, "success");
      onCardAdded?.();
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error saving card";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Lookup definitions in Manual tab
  const handleManualLookup = async () => {
    const term = front.trim();
    if (!term) {
      showToast("Please enter a word in Front first", "error");
      return;
    }
    setIsManualLookup(true);
    try {
      const res = await fetch(`/api/dictionary-lookup?word=${encodeURIComponent(term)}&lang=${targetLanguage}`);
      if (res.ok) {
        const data = await res.json();
        if (data.phonetic && !phonetic) setPhonetic(data.phonetic);
        if (data.definitions && data.definitions.length > 0) {
          setManualDefinitions(data.definitions);
          showToast(`Found ${data.definitions.length} definition options!`, "success");
        } else {
          showToast("No additional definitions found", "error");
        }
      }
    } catch {
      showToast("Error looking up definitions", "error");
    } finally {
      setIsManualLookup(false);
    }
  };

  const handleSelectManualDefinition = (def: DefinitionOption) => {
    setBack(def.definition);
    setPartOfSpeech(def.partOfSpeech);
    if (def.example) setExamples(def.example);
    setManualDefinitions([]);
    showToast("Definition applied to card!", "success");
  };

  const handleManualSave = async (addAnother = false) => {
    const trimmedFront = front.trim();
    const trimmedBack = back.trim();

    if (!trimmedFront || !trimmedBack) {
      showToast("Please enter both the word and its meaning", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckId,
          front: trimmedFront,
          back: trimmedBack,
          tags: tagsArray,
          imageUrl: imageUrl.trim() || undefined,
          phonetic: phonetic.trim() || undefined,
          partOfSpeech: partOfSpeech.trim() || undefined,
          examples: examples.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Error creating card");

      await invalidateAppCache();
      showToast(`Flashcard "${trimmedFront}" added!`, "success");
      onCardAdded?.();

      if (addAnother) {
        setFront("");
        setBack("");
        setPhonetic("");
        setPartOfSpeech("");
        setExamples("");
        setImageUrl("");
        setTags("");
        setShowAdvanced(false);
      } else {
        handleClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection error";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAiPrompt("");
    setDefinitionOptions([]);
    setSelectedDefinition(null);
    setImageCandidates([]);
    setSelectedImageUrl("");
    setFront("");
    setBack("");
    setPhonetic("");
    setPartOfSpeech("");
    setExamples("");
    setImageUrl("");
    setTags("");
    setManualDefinitions([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl border border-border bg-card shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-xl text-primary font-bold">
              ⚡
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">Add Flashcard</h2>
              <p className="text-xs text-muted-foreground">Pick specific definition & choose between 3 images</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-muted/50 p-1 border border-border">
          <button
            type="button"
            onClick={() => setTab("ai")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === "ai"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>✨</span>
            <span>Search & Definitions</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("manual")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === "manual"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>✍️</span>
            <span>Manual Form</span>
          </button>
        </div>

        {/* ── TAB 1: AI & DEFINITIONS SEARCH ── */}
        {tab === "ai" && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-150">
            {/* Search Input Bar */}
            <form onSubmit={handleSearchDefinitions} className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Word or Idiom
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. rat, straw, bank, crane, serendipity..."
                  className="flex-1 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                />
                <Button
                  type="submit"
                  disabled={isLookingUp || !aiPrompt.trim()}
                  size="md"
                  className="font-bold shrink-0"
                >
                  {isLookingUp ? "Searching..." : "🔍 Find Definitions"}
                </Button>
              </div>
            </form>

            {/* Sub-State A: Display Definition Choices if multiple found and none selected */}
            {definitionOptions.length > 0 && !selectedDefinition && (
              <div className="space-y-2.5 pt-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Available Definitions for &ldquo;{wordHeader || aiPrompt}&rdquo;:
                    </span>
                    {phoneticHeader && (
                      <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {phoneticHeader}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSpeak(wordHeader || aiPrompt)}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    🔊 Pronounce
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Select the exact meaning you want to learn:
                </p>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {definitionOptions.map((def, idx) => (
                    <button
                      key={def.id || idx}
                      type="button"
                      onClick={() => handleSelectDefinition(def)}
                      className="w-full text-left p-3.5 rounded-2xl border border-border/80 bg-muted/20 hover:bg-primary/5 hover:border-primary/60 transition-all group space-y-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                          {def.partOfSpeech}
                        </span>
                        <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Select this meaning →
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground leading-relaxed">
                        {def.definition}
                      </p>
                      {def.example && (
                        <p className="text-[11px] italic text-muted-foreground">
                          &ldquo;{def.example}&rdquo;
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-State B: Definition Selected -> Show Review, 3 Image Options & Save */}
            {selectedDefinition && (
              <div className="space-y-4 pt-2 border-t border-border animate-in fade-in duration-200">
                {/* Selected Meaning Summary */}
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-foreground capitalize">
                        {wordHeader || aiPrompt}
                      </h3>
                      {phoneticHeader && (
                        <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {phoneticHeader}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSpeak(wordHeader || aiPrompt)}
                        className="text-xs text-primary hover:scale-110 transition-transform"
                        title="Listen to pronunciation"
                      >
                        🔊
                      </button>
                    </div>
                    {definitionOptions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDefinition(null)}
                        className="text-xs text-primary hover:underline font-bold"
                      >
                        Change Definition
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-foreground font-semibold leading-relaxed">
                    <span className="text-primary font-bold mr-1">
                      [{selectedDefinition.partOfSpeech}]
                    </span>
                    {selectedDefinition.definition}
                  </p>
                </div>

                {/* Example sentence field */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Example Sentence (Editable)
                  </label>
                  <input
                    type="text"
                    value={customExample}
                    onChange={(e) => setCustomExample(e.target.value)}
                    placeholder="Example of this word in context..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>

                {/* 3 Illustrative Image Options */}
                <div className="space-y-2">
                  <ImagePicker
                    value={selectedImageUrl}
                    onChange={setSelectedImageUrl}
                    wordContext={wordHeader || aiPrompt}
                    definitionContext={selectedDefinition.definition}
                    exampleContext={customExample || selectedDefinition.example}
                    initialCandidates={imageCandidates}
                  />
                </div>

                {/* Final Save Button */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setSelectedDefinition(null)}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveSelectedCard}
                    disabled={isSaving || !selectedDefinition}
                    size="md"
                    className="flex-2 font-black py-3 bg-primary text-primary-foreground shadow-md hover:opacity-90 flex items-center justify-center gap-2"
                  >
                    <span>✨</span>
                    <span>{isSaving ? "Saving to Deck..." : "Add Flashcard to Deck"}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: MANUAL SIMPLE FORM ── */}
        {tab === "manual" && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-150">
            {/* Front input + Dictionary lookup shortcut */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Word / Phrase (Front) *
                </label>
                <button
                  type="button"
                  onClick={handleManualLookup}
                  disabled={isManualLookup || !front.trim()}
                  className="text-xs text-primary hover:underline font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  <span>{isManualLookup ? "Searching..." : "📖 Lookup Meanings"}</span>
                </button>
              </div>
              <input
                type="text"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="e.g. Reluctant"
                className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Quick definitions suggestions if searched from manual */}
            {manualDefinitions.length > 0 && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 space-y-2 animate-in fade-in duration-150">
                <span className="text-[11px] font-bold uppercase text-primary tracking-wider">
                  Pick meaning to autofill form:
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {manualDefinitions.map((def, idx) => (
                    <button
                      key={def.id || idx}
                      type="button"
                      onClick={() => handleSelectManualDefinition(def)}
                      className="w-full text-left p-2 rounded-xl border border-border/60 bg-card hover:border-primary/60 text-xs transition-colors"
                    >
                      <span className="font-bold text-primary mr-1">[{def.partOfSpeech}]</span>
                      <span className="text-foreground">{def.definition}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                Definition / Meaning (Back) *
              </label>
              <Textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="e.g. Unwilling and hesitant; disinclined."
                rows={2}
              />
            </div>

            {/* Image Picker with 3 options */}
            <ImagePicker
              value={imageUrl}
              onChange={setImageUrl}
              wordContext={front}
              definitionContext={back}
            />

            {/* Extra details collapsible */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced((s) => !s)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>{showAdvanced ? "▼" : "▶"}</span>
                <span>{showAdvanced ? "Hide additional details" : "+ Add phonetics & example (Optional)"}</span>
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4 animate-in fade-in duration-150">
                  <Input
                    label="Phonetic"
                    value={phonetic}
                    onChange={(e) => setPhonetic(e.target.value)}
                    placeholder="e.g. /rɪˈlʌktənt/"
                  />
                  <Input
                    label="Part of Speech"
                    value={partOfSpeech}
                    onChange={(e) => setPartOfSpeech(e.target.value)}
                    placeholder="e.g. adjective, noun, verb"
                  />
                  <Textarea
                    label="Example sentence"
                    value={examples}
                    onChange={(e) => setExamples(e.target.value)}
                    placeholder="e.g. He was reluctant to accept the promotion without more time."
                    rows={2}
                  />
                  <Input
                    label="Tags (comma-separated)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. b2, formal, adjectives"
                  />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => handleManualSave(true)}
                disabled={isSubmitting}
                className="flex-1 font-semibold"
              >
                Save & Add Next
              </Button>
              <Button
                type="button"
                size="md"
                onClick={() => handleManualSave(false)}
                disabled={isSubmitting}
                className="flex-1 font-bold shadow-xs"
              >
                {isSubmitting ? "Saving..." : "Add Flashcard"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
