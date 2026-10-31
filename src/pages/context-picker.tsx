"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ContextPicker } from "@/components/context-picker";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingPage } from "@/components/ui/loading";
import { BackButton } from "@/components/ui/back-button";
import { useToast } from "@/components/ui/toast";

import { SUPPORTED_LANGUAGES, getLanguage } from "@/lib/languages";

interface FlashcardForm {
  front: string;
  back: string;
  tags: string;
  deckId: string;
}

export default function ContextPickerPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FlashcardForm>({
    front: "",
    back: "",
    tags: "",
    deckId: "",
  });
  const [decks, setDecks] = useState<{ id: string; name: string; targetLanguage?: string }[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchDecks = async () => {
    setLoadingDecks(true);
    try {
      const res = await fetch("/api/decks");
      if (!res.ok) throw new Error("Failed to load decks");
      const data = await res.json();
      setDecks(data);
      if (data.length > 0) {
        setForm((prev) => ({ ...prev, deckId: data[0].id }));
      }
    } catch {
      setError("Could not load decks.");
      showToast("Could not load decks.", "error");
    } finally {
      setLoadingDecks(false);
    }
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  const handleCreateCard = (word: string, definition: string) => {
    setForm((prev) => ({
      ...prev,
      front: word,
      back: definition,
    }));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    if (!form.front.trim() || !form.back.trim() || !form.deckId) {
      setError("Front, back, and target deck are required.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: form.front.trim(),
          back: form.back.trim(),
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          deckId: form.deckId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create card");
      }

      showToast("Card created successfully!", "success");
      setShowModal(false);
      setForm((prev) => ({ ...prev, front: "", back: "", tags: "" }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error creating card";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header title="Context Picker" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 space-y-6">
        <div className="mb-2">
          <BackButton href="/dashboard" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Context Picker
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste reading material, select words you don&apos;t recognize, and instantly generate flashcards with AI.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label htmlFor="context-input" className="block text-sm font-medium text-foreground">
              Input Reading Text
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Language Track:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  const matchingDeck = decks.find((d) => d.targetLanguage === e.target.value);
                  if (matchingDeck) {
                    setForm((prev) => ({ ...prev, deckId: matchingDeck.id }));
                  }
                }}
                className="text-xs bg-muted border border-border rounded-lg px-2.5 py-1 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <textarea
            id="context-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Paste an article excerpt, book quote, or sentence in ${getLanguage(selectedLanguage).name} here to analyze...`}
            rows={5}
            className="w-full rounded-md border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
          />
          <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
            <span>{text.split(/\s+/).filter(Boolean).length} words</span>
            {text && (
              <button
                type="button"
                onClick={() => setText("")}
                className="py-1.5 px-2 hover:text-foreground underline focus-visible:outline-none min-h-[36px] flex items-center"
              >
                Clear text
              </button>
            )}
          </div>
        </Card>

        {text.trim() ? (
          <ContextPicker
            text={text}
            targetLanguage={getLanguage(selectedLanguage).name}
            onSelectWord={() => {}}
            onCreateCard={handleCreateCard}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center bg-card/50">
            <div className="text-3xl mb-2">📖</div>
            <p className="text-sm font-medium text-foreground">No text entered yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Type or paste text in any language above to start selecting words and generating definitions.
            </p>
          </div>
        )}

        {/* Modal Dialog for Card Creation - Mobile Bottom Sheet / Centered Desktop Modal */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-card-title"
          >
            <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-lg border border-border bg-card p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📇</span>
                  <h3 id="create-card-title" className="text-lg font-semibold text-foreground">
                    Save as Flashcard
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Front / Word"
                  id="card-front"
                  value={form.front}
                  onChange={(e) => setForm({ ...form, front: e.target.value })}
                  required
                />

                <div>
                  <label htmlFor="card-back" className="mb-1 block text-sm font-medium text-foreground">
                    Back / Definition
                  </label>
                  <textarea
                    id="card-back"
                    value={form.back}
                    onChange={(e) => setForm({ ...form, back: e.target.value })}
                    rows={3}
                    required
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                  />
                </div>

                <Input
                  label="Tags (comma-separated, optional)"
                  id="card-tags"
                  placeholder="reading, vocabulary, advanced"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />

                <div>
                  <label htmlFor="modal-deck" className="mb-1 block text-sm font-medium text-foreground">
                    Target Deck
                  </label>
                  {loadingDecks ? (
                    <p className="text-xs text-muted-foreground">Loading decks...</p>
                  ) : decks.length === 0 ? (
                    <p className="text-xs text-destructive-foreground">
                      No decks found. Please create a deck first.
                    </p>
                  ) : (
                    <select
                      id="modal-deck"
                      value={form.deckId}
                      onChange={(e) => setForm({ ...form, deckId: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                    >
                      {decks.map((deck) => (
                        <option key={deck.id} value={deck.id} className="bg-background text-foreground">
                          {deck.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                    className="w-full sm:w-auto h-11 sm:h-10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || loadingDecks || decks.length === 0}
                    className="w-full sm:w-auto h-11 sm:h-10"
                  >
                    {saving ? "Saving..." : "Add to Deck"}
                  </Button>
                </div>
              </form>
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

