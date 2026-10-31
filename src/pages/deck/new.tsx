"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Input, Textarea } from "@/components/ui/input";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useToast } from "@/components/ui/toast";
import { SUPPORTED_LANGUAGES, getLanguage } from "@/lib/languages";

export default function NewDeck() {
  const router = useRouter();
  const { showToast } = useToast();
  const [targetLanguage, setTargetLanguage] = useState("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = router.query.lang as string;
      const stored = localStorage.getItem("flashguage_active_lang");
      if (q && q.trim()) {
        setTargetLanguage(q);
      } else if (stored && stored.trim()) {
        setTargetLanguage(stored);
      }
    }
  }, [router.query.lang]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [generateCardsWithAI, setGenerateCardsWithAI] = useState(true);
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentLang = getLanguage(targetLanguage);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (nameError && e.target.value.trim()) {
      setNameError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setNameError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Deck name is required");
      showToast("Please provide a deck name", "error");
      return;
    }

    if (trimmedName.length > 100) {
      setNameError("Deck name must be 100 characters or fewer");
      showToast("Deck name is too long", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
          targetLanguage,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Non-JSON response
      }

      if (!res.ok) {
        const errorMsg = data.message || `Failed to create deck (${res.status}: ${res.statusText || "Server error"})`;
        setFormError(errorMsg);
        showToast(errorMsg, "error");
      } else {
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
                      deckId: data.id,
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
            // deck created anyway
          }
        }

        showToast("Deck created successfully!", "success");
        router.push(`/deck/${data.id}`);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Network error. Please check your connection.";
      setFormError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-20 lg:pb-0">
      <Header />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mb-6">
          <BackButton href="/dashboard" label="Back to Dashboard" />
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-primary-foreground font-black shadow-md text-2xl">
              <span>🗂️</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Create New Deck
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose your target language and name your custom deck.
            </p>
          </div>

          {/* Current Language Track Indicator */}
          <div className="mb-6 flex items-center justify-between rounded-2xl bg-muted/40 border border-border px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Language Track
            </span>
            <span className="inline-flex items-center gap-2 text-sm font-black text-foreground">
              <span className="text-xl" role="img" aria-label={currentLang.name}>
                {currentLang.flag}
              </span>
              <span>{currentLang.name}</span>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {formError && (
              <div
                className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive"
                role="alert"
              >
                {formError}
              </div>
            )}

            <Input
              label="Deck Name"
              id="deck-name"
              name="name"
              value={name}
              onChange={handleNameChange}
              error={nameError}
              required
              placeholder="e.g. Daily Vocabulary, Travel Phrases, Conversational Mastery"
            />

            <Textarea
              label="Description (optional)"
              id="deck-desc"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What vocabulary or topics does this deck cover?"
              rows={3}
              hint="A short summary helps you identify what to practice in this deck."
            />

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateCardsWithAI}
                  onChange={(e) => setGenerateCardsWithAI(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>✨</span> Automatically generate starter cards with AI
                </span>
              </label>
              <p className="text-[11px] text-muted-foreground pl-6.5 leading-snug">
                Creates 3 starter cards with phonetic pronunciation, cloze example sentences, and illustrative images.
              </p>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={loading} size="lg" className="w-full font-bold shadow-xs">
                {loading ? "Creating with AI..." : "Create Deck ✓"}
              </Button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/dashboard"
            className="text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded px-1"
          >
            ← Cancel and return to dashboard
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
