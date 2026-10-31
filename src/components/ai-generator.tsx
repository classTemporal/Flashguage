"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Action = "definition" | "example" | "suggest";

interface DefinitionResult {
  definition: string;
  example: string;
  pronunciation?: string;
  partOfSpeech?: string;
}

interface AIGeneratorProps {
  onUseAsCard?: (front: string, back: string) => void;
}

export function AIGenerator({ onUseAsCard }: AIGeneratorProps) {
  const { data: session } = useSession();
  const [word, setWord] = useState("");
  const [action, setAction] = useState<Action>("definition");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DefinitionResult | { example: string } | { suggestions: string[] } | null>(null);

  const canSubmit = Boolean(session && word.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, word: word.trim(), context: context.trim() || undefined }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Request failed with status ${res.status}`);
      }

      const json = await res.json();
      setResult(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleUseAsCard = () => {
    if (!result || !onUseAsCard) return;
    if (action === "definition" && "definition" in result) {
      const r = result as DefinitionResult;
      onUseAsCard(word.trim(), `${r.partOfSpeech ?? ""} ${r.definition}${r.example ? `\n\nExample: ${r.example}` : ""}`);
    } else if (action === "example" && "example" in result) {
      onUseAsCard(word.trim(), (result as { example: string }).example);
    } else if (action === "suggest" && "suggestions" in result) {
      onUseAsCard(word.trim(), (result as { suggestions: string[] }).suggestions.join(", "));
    }
  };

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold text-foreground mb-3">AI Generator</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Word or phrase..."
            disabled={!session || loading}
            className="flex-1"
          />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as Action)}
            disabled={!session || loading}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
          >
            <option value="definition" className="bg-background text-foreground">Definition</option>
            <option value="example" className="bg-background text-foreground">Example</option>
            <option value="suggest" className="bg-background text-foreground">Suggestions</option>
          </select>
        </div>

        {action !== "suggest" && (
          <Input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Optional context..."
            disabled={!session || loading}
          />
        )}

        <Button type="submit" disabled={!canSubmit || loading}>
          {loading ? "Generating..." : "Generate"}
        </Button>
      </form>

      {!session && (
        <p className="mt-3 text-xs text-muted-foreground">
          Sign in to use the AI generator.
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-2 rounded-md border border-border bg-muted p-4">
          {"definition" in result && (
            <div>
              {result.partOfSpeech && (
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {result.partOfSpeech}
                </p>
              )}
              <p className="mt-1 text-sm text-foreground">{result.definition}</p>
              {result.pronunciation && (
                <p className="mt-1 text-xs text-muted-foreground">
                  /{result.pronunciation}/
                </p>
              )}
              {result.example && (
                <p className="mt-2 text-sm italic text-foreground">
                  “{result.example}”
                </p>
              )}
            </div>
          )}

          {"example" in result && "example" in result && !("definition" in result) && (
            <p className="text-sm italic text-foreground">
              “{(result as { example: string }).example}”
            </p>
          )}

          {"suggestions" in result && (
            <div className="flex flex-wrap gap-2">
              {(result as { suggestions: string[] }).suggestions.map((s, i) => (
                <span
                  key={i}
                  className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {onUseAsCard && (
            <Button
              type="button"
              size="sm"
              onClick={handleUseAsCard}
            >
              Use as card
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
