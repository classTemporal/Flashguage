"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import { useToast } from "@/components/ui/toast";

interface PreviewItem {
  front: string;
  back: string;
  tags: string[];
}

type ImportFormat = "csv" | "json";

export default function ImportPage() {
  const { showToast } = useToast();
  const [format, setFormat] = useState<ImportFormat>("csv");
  const [data, setData] = useState("");
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [previewError, setPreviewError] = useState("");
  const [deckId, setDeckId] = useState("");
  const [decks, setDecks] = useState<{ id: string; name: string }[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");

  const parseInput = (raw: string, fmt: ImportFormat): PreviewItem[] => {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    if (fmt === "json") {
      try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          throw new Error("JSON must be an array of objects.");
        }
        return parsed.map((item, idx) => {
          const front = typeof item.front === "string" ? item.front.trim() : "";
          const back = typeof item.back === "string" ? item.back.trim() : "";
          const tags = Array.isArray(item.tags)
            ? item.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
            : typeof item.tags === "string"
              ? item.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
              : [];
          if (!front || !back) {
            throw new Error(`Item at index ${idx} is missing front or back.`);
          }
          return { front, back, tags };
        });
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : "Invalid JSON");
      }
    }

    // CSV
    const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const items: PreviewItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length < 2) {
        throw new Error(`CSV line ${i + 1} must have at least front,back`);
      }
      const front = parts[0];
      const back = parts[1];
      const tags = parts.slice(2).filter(Boolean);
      if (!front || !back) {
        throw new Error(`CSV line ${i + 1} has empty front or back`);
      }
      items.push({ front, back, tags });
    }

    return items;
  };

  const handlePreview = () => {
    setPreviewError("");
    setPreview([]);
    setResult(null);

    if (!data.trim()) {
      setPreviewError("Please enter or upload data first.");
      return;
    }

    try {
      const items = parseInput(data, format);
      setPreview(items.slice(0, 5));
      showToast(`Parsed ${items.length} cards successfully`, "info");
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Invalid input");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!data.trim()) {
      setError("Please paste data or upload a file first.");
      return;
    }

    if (!deckId) {
      setError("Please select a target deck.");
      return;
    }

    setSubmitting(true);
    setImportProgress(25);

    try {
      setImportProgress(60);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, format, deckId }),
      });

      setImportProgress(90);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Import failed");
      }

      setResult(json);
      setImportProgress(100);
      showToast(`Successfully imported ${json.imported} cards!`, "success");
      setData("");
      setPreview([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
      setTimeout(() => setImportProgress(null), 1000);
    }
  };

  useEffect(() => {
    const fetchDecks = async () => {
      setLoadingDecks(true);
      try {
        const res = await fetch("/api/decks");
        if (!res.ok) throw new Error("Failed to load decks");
        const list = await res.json();
        setDecks(list);
        if (list.length > 0) setDeckId(list[0].id);
      } catch {
        setError("Could not load decks.");
        showToast("Could not load decks.", "error");
      } finally {
        setLoadingDecks(false);
      }
    };
    fetchDecks();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header title="Import Cards" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 space-y-6">
        <div className="mb-2">
          <BackButton href="/dashboard" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Import Flashcards
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Bulk import cards from CSV or JSON format into any of your decks.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        {result && (
          <Card className="border-green-500/30 bg-green-500/10 p-5 space-y-2">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold text-sm">
              <span>✓</span> Import Completed Successfully
            </div>
            <div className="flex gap-4 text-xs text-foreground pt-1">
              <span>Imported: <strong>{result.imported}</strong></span>
              <span>Skipped: <strong>{result.skipped}</strong></span>
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs text-destructive-foreground pt-2 border-t border-border">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {/* Progress Indicator */}
        {importProgress !== null && (
          <div className="space-y-1.5 animate-in fade-in">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Processing import...</span>
              <span>{importProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Data Format
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={format === "csv" ? "primary" : "secondary"}
                  onClick={() => {
                    setFormat("csv");
                    setPreview([]);
                    setPreviewError("");
                    setResult(null);
                  }}
                >
                  CSV Format
                </Button>
                <Button
                  type="button"
                  variant={format === "json" ? "primary" : "secondary"}
                  onClick={() => {
                    setFormat("json");
                    setPreview([]);
                    setPreviewError("");
                    setResult(null);
                  }}
                >
                  JSON Array
                </Button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="import-data" className="text-sm font-medium text-foreground">
                  {format === "csv" ? "CSV Content (front,back,tags)" : "JSON Content"}
                </label>
              </div>

              {/* Styled File Upload Dropzone */}
              <div
                className="group relative mb-3 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40 cursor-pointer"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setData(reader.result as string);
                    setPreview([]);
                    setPreviewError("");
                    setResult(null);
                  };
                  reader.readAsText(file);
                }}
              >
                <input
                  id="dropzone-file"
                  type="file"
                  accept={format === "csv" ? ".csv,.txt" : ".json"}
                  className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setData(reader.result as string);
                      setPreview([]);
                      setPreviewError("");
                      setResult(null);
                    };
                    reader.readAsText(file);
                  }}
                />
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2 group-hover:scale-105 transition-transform">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-foreground">
                  <span className="text-primary hover:underline">Click to upload file</span> or drag and drop
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {format === "csv" ? ".CSV or .TXT files" : ".JSON file with card array"}
                </p>
              </div>

              <textarea
                id="import-data"
                value={data}
                onChange={(e) => {
                  setData(e.target.value);
                  setPreview([]);
                  setPreviewError("");
                  setResult(null);
                }}
                rows={6}
                placeholder={
                  format === "csv"
                    ? "serendipity,a pleasant accidental discovery,vocabulary,advanced\nephemeral,lasting for a very short time,adjective"
                    : '[\n  {\n    "front": "serendipity",\n    "back": "a pleasant accidental discovery",\n    "tags": ["vocabulary"]\n  }\n]'
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={handlePreview} disabled={!data.trim()}>
                Preview Parsed Table
              </Button>
            </div>

            {previewError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive-foreground">
                {previewError}
              </div>
            )}

            {/* Table Preview */}
            {preview.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Data Preview (first {preview.length} rows)
                </h3>
                <div className="overflow-x-auto rounded-lg border border-border bg-background">
                  <table className="w-full text-left text-sm text-foreground">
                    <thead className="bg-muted text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                      <tr>
                        <th className="py-2 px-3">Front</th>
                        <th className="py-2 px-3">Back</th>
                        <th className="py-2 px-3">Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs sm:text-sm">
                      {preview.map((item, i) => (
                        <tr key={i} className="hover:bg-accent/40 transition-colors">
                          <td className="py-2 px-3 font-medium">{item.front}</td>
                          <td className="py-2 px-3 text-muted-foreground">{item.back}</td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap gap-1">
                              {item.tags.map((tag, tIdx) => (
                                <span key={tIdx} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="deck-select" className="mb-1.5 block text-sm font-medium text-foreground">
                Target Deck
              </label>
              {loadingDecks ? (
                <p className="text-xs text-muted-foreground">Loading decks...</p>
              ) : decks.length === 0 ? (
                <p className="text-xs text-destructive-foreground">
                  No decks found. Please <Link href="/deck/new" className="underline font-semibold">create one</Link> first.
                </p>
              ) : (
                <select
                  id="deck-select"
                  value={deckId}
                  onChange={(e) => setDeckId(e.target.value)}
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

            <Button
              type="submit"
              disabled={submitting || loadingDecks || decks.length === 0 || !data.trim()}
              className="w-full"
            >
              {submitting ? "Importing Flashcards..." : "Import Flashcards"}
            </Button>
          </Card>
        </form>
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

