"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState, CardSkeleton } from "@/components/ui/loading";
import { BackButton } from "@/components/ui/back-button";
import { useToast } from "@/components/ui/toast";
import { ImagePicker } from "@/components/card/image-picker";
import { invalidateAppCache } from "@/lib/cache";
import { SUPPORTED_LANGUAGES, speakInLanguage, getLanguage } from "@/lib/languages";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ApiDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface ApiMeaning {
  partOfSpeech: string;
  definitions: ApiDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

interface ApiPhonetic {
  text?: string;
  audio?: string;
}

interface ApiResponseItem {
  word: string;
  phonetic?: string;
  phonetics?: ApiPhonetic[];
  meanings: ApiMeaning[];
}

export interface DictionaryDefinitionItem {
  id: string;
  word: string;
  phonetic?: string;
  audio?: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
  synonyms?: string[];
}

interface UserDeck {
  id: string;
  name: string;
  targetLanguage?: string;
}

/**
 * Transforms Free Dictionary API response into flat definition items.
 * Deduplicates definitions to prevent duplicated cards and loops.
 * Shows ALL definitions without filtering.
 */
function transformApiResponse(apiData: ApiResponseItem[]): DictionaryDefinitionItem[] {
  const results: DictionaryDefinitionItem[] = [];
  for (const entry of apiData) {
    const word = entry.word || "";

    // Extract preferred phonetic text
    const phoneticText =
      entry.phonetic ||
      entry.phonetics?.find((p) => p.text && p.text.trim())?.text ||
      "";

    // Extract first valid audio URL if available
    const audioUrl = entry.phonetics?.find((p) => p.audio && p.audio.trim().startsWith("http"))?.audio;

    if (entry.meanings && Array.isArray(entry.meanings)) {
      for (const meaning of entry.meanings) {
        const partOfSpeech = meaning.partOfSpeech || "noun";
        const topLevelSynonyms = meaning.synonyms || [];

        for (const def of meaning.definitions || []) {
          if (!def.definition || typeof def.definition !== "string") continue;

          const cleanDefinition = def.definition.trim();
          if (!cleanDefinition) continue;

          // Show all definitions from API without aggressive deduplication
          // Only skip exact duplicates within the same meaning

          // Merge and deduplicate synonyms, excluding the word itself
          const combinedSynonyms = Array.from(
            new Set([...(def.synonyms || []), ...topLevelSynonyms])
          ).filter(
            (s) =>
              typeof s === "string" &&
              s.trim().length > 0 &&
              s.toLowerCase() !== word.toLowerCase()
          );

          results.push({
            id: `${word}-${partOfSpeech}-${results.length}-${cleanDefinition.slice(0, 16)}`,
            word,
            phonetic: phoneticText || undefined,
            audio: audioUrl || undefined,
            partOfSpeech,
            definition: cleanDefinition,
            example: def.example?.trim() || undefined,
            synonyms: combinedSynonyms.length > 0 ? combinedSynonyms.slice(0, 5) : undefined,
          });
        }
      }
    }
  }

  return results;
}

export default function DictionariesPage() {
  const { showToast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [searchTerm, setSearchTerm] = useState("ubiquitous");
  const [activeQuery, setActiveQuery] = useState("ubiquitous");

  const [results, setResults] = useState<DictionaryDefinitionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio player ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Deck selector and flashcard creation state
  const [selectedItemToCard, setSelectedItemToCard] = useState<DictionaryDefinitionItem | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [isAddingCard, setIsAddingCard] = useState(false);

  // Enriched Flashcard form fields
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [cardPhonetic, setCardPhonetic] = useState("");
  const [cardPartOfSpeech, setCardPartOfSpeech] = useState("");
  const [cardExample, setCardExample] = useState("");
  const [cardImageUrl, setCardImageUrl] = useState("");
  const [cardTags, setCardTags] = useState("");
  const [modalImageCandidates, setModalImageCandidates] = useState<string[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [cardModalTab, setCardModalTab] = useState<"ai" | "manual">("ai");

  // Fetch user decks for 'Create Flashcard' target selection
  const { data: userDecks = [] } = useSWR<UserDeck[]>("/api/decks", fetcher);

  // Auto-select deck matching language
  useEffect(() => {
    if (userDecks.length > 0) {
      const match = userDecks.find((d) => d.targetLanguage === selectedLanguage);
      if (match) {
        setSelectedDeckId(match.id);
      } else if (!selectedDeckId) {
        setSelectedDeckId(userDecks[0].id);
      }
    }
  }, [userDecks, selectedLanguage, selectedDeckId]);

  const openCardModal = async (item: DictionaryDefinitionItem) => {
    setSelectedItemToCard(item);
    setCardModalTab("ai");
    setCardFront(item.word);
    setCardBack(item.definition);
    setCardPhonetic(item.phonetic || "");
    setCardPartOfSpeech(item.partOfSpeech || "");
    setCardExample(item.example || "");
    setCardImageUrl("");
    setModalImageCandidates([]);
    setCardTags(["dictionary", item.partOfSpeech?.toLowerCase()].filter(Boolean).join(", "));

    // Pre-fetch 3 image options for this exact definition
    try {
      const res = await fetch("/api/image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: item.word,
          definition: item.definition,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const cands: string[] = Array.isArray(data.candidates) && data.candidates.length > 0
          ? data.candidates.slice(0, 3)
          : data.imageUrl ? [data.imageUrl] : [];
        setModalImageCandidates(cands);
        if (cands.length > 0) {
          setCardImageUrl(cands[0]);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleCreateWithAI = async () => {
    if (!cardFront.trim() || !selectedDeckId) {
      showToast("Target deck and word are required", "error");
      return;
    }
    setIsGeneratingAI(true);
    try {
      // 1. Enrich with AI
      let autoData: any = {};
      try {
        const autoRes = await fetch("/api/ai/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            word: cardFront.trim(),
            context: cardBack.trim(),
            targetLanguage: selectedLanguage,
          }),
        });
        if (autoRes.ok) {
          autoData = await autoRes.json();
        }
      } catch {
        // continue with fallback
      }

      // 2. Fetch image
      let img = cardImageUrl || autoData.imageUrl;
      if (!img) {
        try {
          const imgRes = await fetch(`/api/image-search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: cardFront.trim(),
              definition: cardBack.trim(),
            }),
          });
          if (imgRes.ok) {
            const imgData = await imgRes.json();
            if (imgData.imageUrl) {
              img = imgData.imageUrl;
            } else if (imgData.candidates && imgData.candidates.length > 0) {
              img = imgData.candidates[0];
            }
          }
        } catch {
          // ignore
        }
      }

      const finalExample = cardExample.trim() || autoData.example || undefined;
      const finalPhonetic = cardPhonetic.trim() || autoData.phonetic || undefined;
      const finalPos = autoData.partOfSpeech || cardPartOfSpeech.trim() || "vocabulary";
      const finalTags = autoData.tags || [finalPos, "dictionary"];

      const saveRes = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckId: selectedDeckId,
          front: cardFront.trim(),
          back: cardBack.trim(),
          tags: finalTags,
          imageUrl: img || undefined,
          phonetic: finalPhonetic,
          partOfSpeech: finalPos,
          examples: autoData.examples || (finalExample ? [finalExample] : undefined),
        }),
      });

      if (!saveRes.ok) throw new Error("Could not create flashcard");

      await invalidateAppCache();
      showToast(`✨ Flashcard "${cardFront.trim()}" created successfully with AI!`, "success");
      setSelectedItemToCard(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error creating flashcard", "error");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleEnhanceWithAI = async () => {
    if (!cardFront.trim()) return;
    setIsGeneratingAI(true);
    try {
      const res = await fetch("/api/ai/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: cardFront.trim(),
          context: cardBack.trim(),
          targetLanguage: selectedLanguage,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.example) setCardExample(data.example);
      if (data.phonetic && !cardPhonetic) setCardPhonetic(data.phonetic);
      if (data.tags && Array.isArray(data.tags)) {
        setCardTags((prev) => {
          const combined = Array.from(new Set([...prev.split(",").map((t) => t.trim()), ...data.tags]));
          return combined.filter(Boolean).join(", ");
        });
      }
      showToast("✨ AI generated rich example & context!", "success");
    } catch {
      showToast("Could not enhance with AI at this time", "error");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const fetchDictionaryWord = useCallback(async (wordToFetch: string, lang = selectedLanguage) => {
    const trimmed = wordToFetch.trim();
    if (!trimmed) {
      setResults([]);
      setErrorMessage("Please enter a word to search.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/dictionary-lookup?word=${encodeURIComponent(trimmed)}&lang=${lang}`
      );

      if (!res.ok) {
        if (res.status === 404) {
          setErrorMessage(`No definitions found for "${trimmed}". Please check the spelling or try another word.`);
        } else {
          setErrorMessage(`Unable to look up "${trimmed}" right now. Please try again later.`);
        }
        setResults([]);
        return;
      }

      let data: any;
      try {
        data = await res.json();
      } catch {
        setErrorMessage(`No definitions found for "${trimmed}".`);
        setResults([]);
        return;
      }

      if (data.definitions && Array.isArray(data.definitions) && data.definitions.length > 0) {
        const transformed: DictionaryDefinitionItem[] = data.definitions.map((def: any, idx: number) => ({
          id: def.id || `${trimmed}-${def.partOfSpeech || 'term'}-${idx}`,
          word: data.word || trimmed,
          phonetic: data.phonetic || undefined,
          audio: data.audio || undefined,
          partOfSpeech: def.partOfSpeech || data.partOfSpeech || "term",
          definition: def.definition || "",
          example: def.example || undefined,
          synonyms: def.synonyms || [],
        }));
        setResults(transformed);
      } else if (data.definition) {
        setResults([{
          id: `${trimmed}-0`,
          word: data.word || trimmed,
          phonetic: data.phonetic || undefined,
          audio: data.audio || undefined,
          partOfSpeech: data.partOfSpeech || "term",
          definition: data.definition,
          example: data.example || undefined,
          synonyms: data.synonyms || [],
        }]);
      } else {
        setErrorMessage(`No definitions found for "${trimmed}".`);
        setResults([]);
      }
    } catch {
      setErrorMessage("Network error while connecting to the dictionary. Please check your internet connection.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLanguage]);

  // Initial load
  useEffect(() => {
    fetchDictionaryWord(searchTerm, selectedLanguage);
  }, []);

  const handleLanguageChange = (newLang: string) => {
    setSelectedLanguage(newLang);
    let sampleWord = searchTerm;
    if (newLang === "es") sampleWord = "efímero";
    else if (newLang === "fr") sampleWord = "bienveillance";
    else if (newLang === "de") sampleWord = "sehnsucht";
    else if (newLang === "it") sampleWord = "meraviglia";
    else if (newLang === "ja") sampleWord = "木漏れ日";
    else if (newLang === "en") sampleWord = "ubiquitous";
    
    setSearchTerm(sampleWord);
    setActiveQuery(sampleWord);
    fetchDictionaryWord(sampleWord, newLang);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    setActiveQuery(trimmed);
    fetchDictionaryWord(trimmed, selectedLanguage);
  };

  const handleSelectWord = (word: string) => {
    setSearchTerm(word);
    setActiveQuery(word);
    fetchDictionaryWord(word, selectedLanguage);
  };

  const handlePlayAudio = (word: string, audioUrl?: string) => {
    if (!word) return;

    // Primary: Web Speech API with selected target language
    try {
      speakInLanguage(word, selectedLanguage);
      return;
    } catch {
      // Fallback to audio element if available
    }

    if (audioUrl) {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(audioUrl);
        audioRef.current.play().catch(() => {
          showToast("Audio playback not supported or blocked by browser", "error");
        });
      } catch {
        showToast("Could not play pronunciation audio", "error");
      }
    } else {
      showToast("Speech synthesis not supported on this browser", "error");
    }
  };

  const handleCreateFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim()) {
      showToast("Front word and definition are required", "error");
      return;
    }

    if (!selectedDeckId) {
      showToast("Please select a target deck first", "error");
      return;
    }

    setIsAddingCard(true);
    try {
      const tagsArray = cardTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const examplesArray = cardExample.trim() ? [cardExample.trim()] : undefined;

      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckId: selectedDeckId,
          front: cardFront.trim(),
          back: cardBack.trim(),
          tags: tagsArray,
          imageUrl: cardImageUrl.trim() || undefined,
          phonetic: cardPhonetic.trim() || undefined,
          partOfSpeech: cardPartOfSpeech.trim() || undefined,
          examples: examplesArray,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create flashcard");
      }

      await invalidateAppCache();
      showToast(`✨ Added "${cardFront.trim()}" to your flashcards!`, "success");
      setSelectedItemToCard(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error saving flashcard";
      showToast(msg, "error");
    } finally {
      setIsAddingCard(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header title="Flashguage" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 space-y-6">
        {/* BackButton to /dashboard at top */}
        <div>
          <BackButton href="/dashboard" label="Back to Dashboard" />
        </div>

        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">📖</span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Dictionary Lookup
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Search real definitions, native audio pronunciations, and examples in {getLanguage(selectedLanguage).name} and more.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button href="/decks" as="link" variant="secondary" size="sm">
              View My Decks
            </Button>
          </div>
        </div>

        {/* Language Track Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
            Language Track:
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = selectedLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm font-semibold ring-2 ring-primary/40"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="space-y-2">
          <label htmlFor="dict-search" className="block text-sm font-medium text-foreground">
            Search Word in {getLanguage(selectedLanguage).name} {getLanguage(selectedLanguage).flag}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="dict-search"
                placeholder={`Search word in ${getLanguage(selectedLanguage).name}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-base py-2.5"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <Button type="submit" disabled={isLoading} className="gap-2 shrink-0">
              {isLoading ? "Searching..." : "Lookup"}
            </Button>
          </div>
        </form>

        {/* Results Header */}
        {!isLoading && !errorMessage && results.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-2">
            <span>
              Showing all <strong className="text-foreground">{results.length}</strong> {results.length === 1 ? "definition" : "definitions"} for &quot;<span className="font-semibold text-primary">{activeQuery}</span>&quot;
            </span>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <EmptyState
            icon="⚠️"
            title="Word Not Found"
            description={errorMessage}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSelectWord("ubiquitous")}
              >
                Reset to &quot;ubiquitous&quot;
              </Button>
            }
          />
        )}

        {/* Results Grid: Showing ALL definitions, no filtering */}
        {!isLoading && !errorMessage && results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((item) => (
              <Card
                key={item.id}
                className="p-5 flex flex-col justify-between hover:border-primary/50 transition-colors"
              >
                <div className="space-y-3">
                  {/* Word Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h2 className="text-2xl font-bold text-foreground tracking-tight capitalize">
                          {item.word}
                        </h2>
                        {item.phonetic && (
                          <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {item.phonetic}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(item.word, item.audio)}
                          className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary hover:bg-primary/20 text-xs transition-colors"
                          title="Listen to pronunciation"
                          aria-label={`Pronounce ${item.word}`}
                        >
                          🔊
                        </button>
                      </div>
                      <span className="text-xs font-semibold italic text-muted-foreground uppercase tracking-wide">
                        {item.partOfSpeech}
                      </span>
                    </div>
                  </div>

                  {/* Definition */}
                  <div className="text-sm text-foreground leading-relaxed">
                    {item.definition}
                  </div>

                  {/* Example Sentence */}
                  {item.example && (
                    <div className="rounded-md bg-muted/40 p-2.5 border-l-2 border-primary text-xs text-muted-foreground italic">
                      &ldquo;{item.example}&rdquo;
                    </div>
                  )}

                  {/* Synonyms */}
                  {item.synonyms && item.synonyms.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs font-medium text-muted-foreground">Synonyms:</span>
                      {item.synonyms.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectWord(s)}
                          className="text-xs rounded bg-muted px-2 py-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 'Create Flashcard' per definition */}
                <div className="mt-5 pt-3 border-t border-border flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => openCardModal(item)}
                    className="gap-1.5 text-xs bg-primary text-primary-foreground font-bold shadow-xs"
                  >
                    <span>+ Create Flashcard</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal: Full-featured Create Flashcard with AI & ImagePicker */}
        {selectedItemToCard && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-flashcard-title"
          >
            <div className="relative w-full max-w-xl my-8 rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 id="create-flashcard-title" className="text-xl font-bold text-foreground">
                    Create Flashcard
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Save this dictionary definition with illustrative media and AI examples.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItemToCard(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              {userDecks.length === 0 ? (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    You don&apos;t have any decks created yet.
                  </p>
                  <Button href="/deck/new" as="link" size="sm" className="w-full">
                    Create a Deck First
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedItemToCard(null)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  {/* Modal Tabs */}
                  <div className="flex border-b border-border">
                    <button
                      type="button"
                      onClick={() => setCardModalTab("ai")}
                      className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                        cardModalTab === "ai"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>⚡</span>
                      <span>1-Click AI Flashcard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardModalTab("manual")}
                      className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                        cardModalTab === "manual"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>✏️</span>
                      <span>Manual & Custom</span>
                    </button>
                  </div>

                  <div>
                    <label
                      htmlFor="deck-select-picker"
                      className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider"
                    >
                      Target Deck *
                    </label>
                    <select
                      id="deck-select-picker"
                      value={selectedDeckId}
                      onChange={(e) => setSelectedDeckId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&>option]:bg-background [&>option]:text-foreground"
                    >
                      {userDecks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {cardModalTab === "ai" ? (
                    /* ── AI & IMAGE SELECTION TAB ── */
                    <div className="space-y-4 pt-1 animate-in fade-in">
                      <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Word to Add</span>
                            {cardPhonetic && (
                              <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {cardPhonetic}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handlePlayAudio(cardFront)}
                              className="text-xs text-primary hover:scale-110 transition-transform"
                              title="Listen to pronunciation"
                            >
                              🔊
                            </button>
                          </div>
                          <span className="text-xs text-primary font-mono font-semibold">{cardPartOfSpeech || "vocabulary"}</span>
                        </div>
                        <h4 className="text-xl font-black text-foreground capitalize">{cardFront}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{cardBack}</p>
                      </div>

                      {/* Example sentence field */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Example Sentence (Optional)
                        </label>
                        <input
                          type="text"
                          value={cardExample}
                          onChange={(e) => setCardExample(e.target.value)}
                          placeholder="e.g. An authentic sentence using this word..."
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                        />
                      </div>

                      {/* 3 Illustrative Image Options */}
                      <ImagePicker
                        value={cardImageUrl}
                        onChange={setCardImageUrl}
                        wordContext={cardFront}
                        definitionContext={cardBack}
                        initialCandidates={modalImageCandidates}
                      />

                      <div className="flex justify-end gap-3 pt-3 border-t border-border">
                        <Button
                          type="button"
                          variant="secondary"
                          size="md"
                          onClick={() => setSelectedItemToCard(null)}
                          disabled={isGeneratingAI}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="md"
                          onClick={handleCreateWithAI}
                          disabled={isGeneratingAI || !selectedDeckId}
                          className="font-bold shadow-sm gap-2"
                        >
                          <span>⚡</span>
                          <span>{isGeneratingAI ? "Saving Flashcard..." : "Add Flashcard to Deck"}</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── MANUAL TAB ── */
                    <form onSubmit={handleCreateFlashcard} className="space-y-4 pt-1 animate-in fade-in">
                      <div className="flex items-end justify-between gap-2">
                        <div className="flex-1">
                          <Input
                            label="Front (Word or Phrase) *"
                            value={cardFront}
                            onChange={(e) => setCardFront(e.target.value)}
                            required
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleEnhanceWithAI}
                          disabled={isGeneratingAI || !cardFront.trim()}
                          className="mb-1 text-xs font-semibold gap-1 shrink-0"
                          title="Generate rich cloze sentence and auto-enrich tags"
                        >
                          <span>{isGeneratingAI ? "✨ Generating..." : "✨ AI Cloze"}</span>
                        </Button>
                      </div>

                      <Textarea
                        label="Back (Definition / Meaning) *"
                        value={cardBack}
                        onChange={(e) => setCardBack(e.target.value)}
                        rows={3}
                        required
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label="Phonetic (optional)"
                          value={cardPhonetic}
                          onChange={(e) => setCardPhonetic(e.target.value)}
                          placeholder="/juːˈbɪk.wɪ.təs/"
                        />
                        <Input
                          label="Part of Speech (optional)"
                          value={cardPartOfSpeech}
                          onChange={(e) => setCardPartOfSpeech(e.target.value)}
                          placeholder="e.g. adjective, verb, idiom"
                        />
                      </div>

                      <Textarea
                        label="Example Sentence / Cloze Context"
                        value={cardExample}
                        onChange={(e) => setCardExample(e.target.value)}
                        placeholder="e.g. The company has a ubiquitous presence in the tech market."
                        rows={2}
                      />

                      <Input
                        label="Tags (comma-separated)"
                        value={cardTags}
                        onChange={(e) => setCardTags(e.target.value)}
                        placeholder="e.g. dictionary, vocabulary, b2"
                      />

                      {/* Illustrative Image Picker */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          Illustrative Image
                        </label>
                        <ImagePicker
                          value={cardImageUrl}
                          onChange={setCardImageUrl}
                          wordContext={cardFront}
                          definitionContext={cardBack}
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                          type="button"
                          variant="secondary"
                          size="md"
                          onClick={() => setSelectedItemToCard(null)}
                          disabled={isAddingCard}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="md"
                          disabled={isAddingCard || !selectedDeckId}
                          className="font-bold shadow-xs"
                        >
                          {isAddingCard ? "Saving..." : "Add Flashcard"}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
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
