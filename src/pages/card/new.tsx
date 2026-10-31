"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Input, Textarea } from "@/components/ui/input";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useToast } from "@/components/ui/toast";
import { ImagePicker } from "@/components/card/image-picker";

type Mode = "ai" | "manual";

interface GeneratedCard {
  front: string;
  back: string;
  phonetic?: string;
  partOfSpeech?: string;
  example?: string;
  imageUrl?: string;
  tags?: string[];
}

export default function NewCard() {
  const router = useRouter();
  const { deckId } = router.query;
  const deckIdValue = typeof deckId === "string" ? deckId : "";
  const { showToast } = useToast();

  const [mode, setMode] = useState<Mode>("ai");

  // ── AI Generation State ──
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [isSavingGenerated, setIsSavingGenerated] = useState(false);

  // ── Manual Creation State ──
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [examples, setExamples] = useState("");
  const [tags, setTags] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);

  // ── AI Generator: Generate everything in 1 click ──
  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = aiPrompt.trim();
    if (!prompt) {
      showToast("Please enter a word, idiom, or topic to generate", "error");
      return;
    }

    setIsGenerating(true);
    setGeneratedCards([]);

    try {
      const res = await fetch("/api/ai/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, count: aiCount }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate flashcards");
      }

      const data = await res.json();
      if (data.cards && data.cards.length > 0) {
        setGeneratedCards(data.cards);
        showToast(`✨ Successfully generated ${data.cards.length} card(s)!`, "success");
      } else {
        showToast("No cards generated. Please try a different term.", "error");
      }
    } catch {
      showToast("Error generating with AI. Try entering a specific word.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Save All Generated Cards in Deck ──
  const handleSaveAllGenerated = async () => {
    if (!deckIdValue) {
      showToast("A deck must be selected", "error");
      return;
    }

    if (generatedCards.length === 0) return;

    setIsSavingGenerated(true);

    try {
      for (const card of generatedCards) {
        await fetch("/api/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deckId: deckIdValue,
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

      showToast(`Saved ${generatedCards.length} card(s) to your deck!`, "success");
      router.push(`/deck/${deckIdValue}`);
    } catch {
      showToast("Error saving flashcards", "error");
    } finally {
      setIsSavingGenerated(false);
    }
  };

  // ── Manual Submission ──
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedFront = front.trim();
    const trimmedBack = back.trim();

    if (!trimmedFront) {
      showToast("Word or phrase (front) is required", "error");
      return;
    }

    if (!trimmedBack) {
      showToast("Definition or meaning (back) is required", "error");
      return;
    }

    if (!deckIdValue) {
      showToast("Deck ID is required", "error");
      return;
    }

    setIsSavingManual(true);

    try {
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckId: deckIdValue,
          front: trimmedFront,
          back: trimmedBack,
          tags: tagsArray,
          imageUrl: imageUrl.trim() || undefined,
          phonetic: phonetic.trim() || undefined,
          partOfSpeech: partOfSpeech.trim() || undefined,
          examples: examples.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save flashcard");
      }

      showToast("Flashcard saved successfully!", "success");
      router.push(`/deck/${deckIdValue}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection error";
      showToast(msg, "error");
    } finally {
      setIsSavingManual(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-20 md:pb-0">
      <Header />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-6 space-y-6">
        <div>
          <BackButton href={deckIdValue ? `/deck/${deckIdValue}` : "/dashboard"} label="Back to Deck" />
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex rounded-2xl bg-muted/60 p-1.5 border border-border">
          <button
            type="button"
            onClick={() => setMode("ai")}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              mode === "ai"
                ? "bg-card text-foreground shadow-sm border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>✨</span>
            <span>AI Instant (1-Click)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              mode === "manual"
                ? "bg-card text-foreground shadow-sm border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>✍️</span>
            <span>Manual Mode</span>
          </button>
        </div>

        {/* ── MODE 1: AI ALL-IN-ONE ── */}
        {mode === "ai" && (
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary text-3xl font-black">
                ✨
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                AI Flashcard Generator
              </h1>
              <p className="text-sm text-muted-foreground">
                Type any word, topic, or idiom. AI creates definitions, phonetics, cloze practice, and illustrative images in one click.
              </p>
            </div>

            <form onSubmit={handleGenerateAI} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  What do you want to learn?
                </label>
                <input
                  type="text"
                  autoFocus
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Serendipity, Workplace idioms, Resilient, Travel..."
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                />
              </div>

              {/* Number of cards selector */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-muted-foreground">Number of cards:</span>
                <div className="flex gap-1.5">
                  {[1, 3, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAiCount(num)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        aiCount === num
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {num} {num === 1 ? "card" : "cards"}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isGenerating || !aiPrompt.trim()}
                size="lg"
                className="w-full font-black py-4 bg-primary text-primary-foreground shadow-md hover:opacity-90 flex items-center justify-center gap-2"
              >
                <span>✨</span>
                <span>{isGenerating ? "Generating cards with AI..." : "Generate Flashcards with AI"}</span>
              </Button>
            </form>

            {/* Generated Cards Preview */}
            {generatedCards.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-border/80 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-foreground">
                    Generated Cards ({generatedCards.length})
                  </h3>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Ready to study
                  </span>
                </div>

                <div className="space-y-3">
                  {generatedCards.map((card, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2 relative"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-black text-foreground">{card.front}</h4>
                            {card.partOfSpeech && (
                              <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                                {card.partOfSpeech}
                              </span>
                            )}
                          </div>
                          {card.phonetic && (
                            <p className="text-xs font-mono text-muted-foreground">{card.phonetic}</p>
                          )}
                        </div>
                        {card.imageUrl && (
                          <img
                            src={card.imageUrl}
                            alt={card.front}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-xl object-cover border border-border shrink-0"
                          />
                        )}
                      </div>

                      <p className="text-sm text-foreground/90">{card.back}</p>

                      {card.example && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">
                          &ldquo;{card.example}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  size="lg"
                  onClick={handleSaveAllGenerated}
                  disabled={isSavingGenerated}
                  className="w-full font-black py-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                >
                  {isSavingGenerated ? "Saving cards..." : "💾 Save All to Deck & Begin"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── MODE 2: ULTRA CLEAN MANUAL ── */}
        {mode === "manual" && (
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-black text-foreground">Add Card Manually</h1>
              <p className="text-xs text-muted-foreground">Fill in the core vocabulary details.</p>
            </div>

            <form onSubmit={handleSaveManual} className="space-y-4" noValidate>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Word / Phrase (Front) *
                </label>
                <input
                  type="text"
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  placeholder="e.g. Resilient"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Definition / Meaning (Back) *
                </label>
                <Textarea
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  placeholder="e.g. Able to withstand or recover quickly from difficult conditions."
                  rows={2}
                />
              </div>

              {/* Simplified Image Picker with 3 options */}
              <ImagePicker
                value={imageUrl}
                onChange={setImageUrl}
                wordContext={front}
                definitionContext={back}
              />

              {/* Collapsible optional extra fields */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((s) => !s)}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
                >
                  <span>{showAdvanced ? "▼" : "▶"}</span>
                  <span>{showAdvanced ? "Hide phonetics and example" : "+ Add phonetics & example sentence (Optional)"}</span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-4 animate-in fade-in duration-200">
                    <Input
                      label="Phonetic (optional)"
                      value={phonetic}
                      onChange={(e) => setPhonetic(e.target.value)}
                      placeholder="/rɪˈzɪl.jənt/"
                    />

                    <Textarea
                      label="Example Sentence (cloze context)"
                      value={examples}
                      onChange={(e) => setExamples(e.target.value)}
                      placeholder="She is a resilient person who never gives up."
                      rows={2}
                    />

                    <Input
                      label="Tags (comma-separated)"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="adjective, b2, formal"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSavingManual || !front.trim() || !back.trim()}
                  size="lg"
                  className="w-full font-black py-3.5 shadow-md"
                >
                  {isSavingManual ? "Saving..." : "Save Card ✓"}
                </Button>
              </div>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link
            href={deckIdValue ? `/deck/${deckIdValue}` : "/dashboard"}
            className="text-primary hover:underline font-semibold"
          >
            ← Back to Deck
          </Link>
        </p>
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
