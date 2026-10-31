"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import { LoadingPage } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

interface Deck {
  id: string;
  name: string;
  _count?: { cards: number };
}

interface CardPreview {
  front: string;
  back: string;
  tags: string[];
}

type ExportFormat = "csv" | "json";

export default function ExportPage() {
  const { status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [format, setFormat] = useState<ExportFormat>("json");
  const [preview, setPreview] = useState<CardPreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status !== "authenticated") return;

    const fetchDecks = async () => {
      setLoadingDecks(true);
      try {
        const res = await fetch("/api/decks");
        if (!res.ok) throw new Error("Failed to load decks");
        const data: Deck[] = await res.json();
        setDecks(data);
        if (data.length > 0) setSelectedDeckId(data[0].id);
      } catch {
        setError("Could not load decks.");
        showToast("Could not load decks.", "error");
      } finally {
        setLoadingDecks(false);
      }
    };

    fetchDecks();
  }, [status, router]);

  useEffect(() => {
    if (!selectedDeckId) return;

    const fetchPreview = async () => {
      setPreviewError("");
      setPreview([]);
      setPreviewLoading(true);
      try {
        const res = await fetch(`/api/cards?deckId=${encodeURIComponent(selectedDeckId)}`);
        if (!res.ok) throw new Error("Failed to load cards");
        const data = await res.json();
        const items = (data || []).map((card: Record<string, unknown>) => {
          let tags: string[] = [];
          if (Array.isArray(card.tags)) {
            tags = card.tags.map(String);
          } else if (typeof card.tags === "string" && card.tags !== "[]") {
            try {
              tags = JSON.parse(card.tags);
            } catch {
              tags = [card.tags];
            }
          }
          return {
            front: String(card.front),
            back: String(card.back),
            tags,
          };
        });
        setPreview(items.slice(0, 5));
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : "Failed to load preview");
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchPreview();
  }, [selectedDeckId]);

  const handleDownload = async () => {
    if (!selectedDeckId) return;
    setDownloading(true);
    setError("");
    setExportProgress(30);

    try {
      setExportProgress(60);
      const url = `/api/export?deckId=${encodeURIComponent(selectedDeckId)}&format=${format}`;
      const res = await fetch(url);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Export failed");
      }

      setExportProgress(90);
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      let filename = `deck-export.${format}`;
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();

      setExportProgress(100);
      showToast(`Exported ${filename} successfully!`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setDownloading(false);
      setTimeout(() => setExportProgress(null), 1000);
    }
  };

  if (status === "loading") {
    return <LoadingPage message="Loading export tool..." />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header title="Export Cards" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 space-y-6">
        <div className="mb-2">
          <BackButton href="/dashboard" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Export Flashcards
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Download your decks in CSV or JSON format for backups or external apps like Anki.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        {/* Progress Indicator */}
        {exportProgress !== null && (
          <div className="space-y-1.5 animate-in fade-in">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Generating export file...</span>
              <span>{exportProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        <Card className="p-6 space-y-5">
          <div>
            <label htmlFor="export-deck" className="mb-1.5 block text-sm font-medium text-foreground">
              Select Deck to Export
            </label>
            {loadingDecks ? (
              <p className="text-xs text-muted-foreground">Loading decks...</p>
            ) : decks.length === 0 ? (
              <p className="text-xs text-destructive-foreground">
                No decks found. Please <Link href="/deck/new" className="underline font-semibold">create a deck</Link> first.
              </p>
            ) : (
              <select
                id="export-deck"
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
              >
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id} className="bg-background text-foreground">
                    {deck.name} {deck._count?.cards ? `(${deck._count.cards} cards)` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Select Export Format</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={[
                  "flex flex-col text-left p-3.5 rounded-lg border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  format === "csv"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                    : "border-border bg-card hover:border-border/80 hover:bg-accent/30",
                ].join(" ")}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-semibold text-sm text-foreground">CSV Spreadsheet</span>
                  <span className={[
                    "text-xs px-2 py-0.5 rounded-full font-mono font-medium",
                    format === "csv" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  ].join(" ")}>
                    .csv
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Best for Excel, Google Sheets, or importing directly into Anki decks.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormat("json")}
                className={[
                  "flex flex-col text-left p-3.5 rounded-lg border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  format === "json"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                    : "border-border bg-card hover:border-border/80 hover:bg-accent/30",
                ].join(" ")}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-semibold text-sm text-foreground">JSON Structured Data</span>
                  <span className={[
                    "text-xs px-2 py-0.5 rounded-full font-mono font-medium",
                    format === "json" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  ].join(" ")}>
                    .json
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Full fidelity backup including structured tag arrays and card properties.
                </p>
              </button>
            </div>
          </div>

          {/* Table Preview */}
          <div className="space-y-2 pt-2 border-t border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Deck Preview (first {preview.length} cards)
            </h3>

            {previewLoading && (
              <p className="text-xs text-muted-foreground">Loading preview...</p>
            )}

            {previewError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive-foreground">
                {previewError}
              </div>
            )}

            {!previewLoading && preview.length > 0 && (
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
                            {item.tags.length > 0 ? (
                              item.tags.map((tag, tIdx) => (
                                <span key={tIdx} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">None</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!previewLoading && !previewError && preview.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">
                No cards in this deck to export.
              </p>
            )}
          </div>

          <Button
            onClick={handleDownload}
            disabled={downloading || loadingDecks || !selectedDeckId || decks.length === 0}
            className="w-full"
          >
            {downloading ? "Preparing Download..." : `Download Deck (${format.toUpperCase()})`}
          </Button>
        </Card>
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

