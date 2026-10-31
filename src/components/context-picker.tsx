"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";

interface ContextPickerProps {
  text: string;
  onSelectWord: (word: string) => void;
  onCreateCard: (word: string, definition: string) => void;
}

export function ContextPicker({ text, onSelectWord, onCreateCard }: ContextPickerProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [definition, setDefinition] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSelect = useCallback(
    (word: string) => {
      setSelectedWord(word);
      onSelectWord(word);
      setDefinition("");
      setError("");
    },
    [onSelectWord]
  );

  const handleLookup = async () => {
    if (!selectedWord) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "definition", word: selectedWord }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to lookup word");
      }

      const json = await res.json();
      const data = json.data as {
        definition?: string;
        example?: string;
        pronunciation?: string;
        partOfSpeech?: string;
      };
      const def = data.definition || data.example || selectedWord;
      setDefinition(def);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong fetching definition");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (!selectedWord || !definition) return;
    onCreateCard(selectedWord, definition);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Interactive Word Selector
        </h3>
        <span className="self-start sm:self-auto text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
          Tap or click any word below
        </span>
      </div>

      <div className="rounded-md border border-border bg-background p-3 sm:p-5 text-base sm:text-lg leading-loose text-foreground font-sans">
        {text.split(/(\s+)/).map((segment, i) => {
          const cleanWord = segment.replace(/[^a-zA-Z'-]/g, "");
          if (!cleanWord || segment.trim().length === 0) {
            return <span key={i}>{segment}</span>;
          }
          const isSelected = selectedWord?.toLowerCase() === cleanWord.toLowerCase();
          return (
            <span key={i} className="relative inline-block my-0.5 mx-0.5 group">
              <button
                type="button"
                onClick={() => handleSelect(cleanWord)}
                className={[
                  "rounded-md min-h-[36px] sm:min-h-[32px] px-2 py-1 text-base sm:text-lg font-medium transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 select-none",
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "hover:bg-primary/15 hover:text-primary active:scale-95 bg-muted/30",
                ].join(" ")}
                aria-label={`Select word ${cleanWord}`}
              >
                {segment}
              </button>
              {/* Accessible Hover Tooltip */}
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden sm:group-hover:block whitespace-nowrap rounded bg-foreground px-2 py-0.5 text-[11px] font-medium text-background shadow-md opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:block group-focus-within:opacity-100 z-10"
              >
                Click to inspect &ldquo;{cleanWord}&rdquo;
              </span>
            </span>
          );
        })}
      </div>

      {selectedWord && (
        <div className="rounded-lg border border-border bg-muted/40 p-4 sm:p-5 space-y-3.5 animate-in fade-in">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm sm:text-base font-medium text-foreground">
              Selected word:{" "}
              <span className="font-bold text-primary text-base sm:text-lg underline decoration-primary/40 decoration-2">
                {selectedWord}
              </span>
            </p>
            {loading && <Spinner className="h-5 w-5" />}
          </div>

          {error && (
            <p className="text-xs sm:text-sm text-destructive-foreground font-medium bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
              {error}
            </p>
          )}

          {definition && (
            <div className="rounded-md border border-border bg-card p-3.5 shadow-sm space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                AI Definition
              </span>
              <p className="text-sm sm:text-base text-foreground leading-relaxed">{definition}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <Button
              type="button"
              size="md"
              onClick={handleLookup}
              disabled={loading}
              className="gap-1.5 w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm"
            >
              <span>{definition ? "Re-fetch with AI" : "Get Definition"}</span>
              <span aria-hidden="true">✨</span>
            </Button>
            {definition && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleCreate}
                className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm"
              >
                Use in Flashcard
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
