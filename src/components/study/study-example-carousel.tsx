"use client";

import { useState } from "react";

export function blankOutVocab(sentence: string, vocab: string): React.ReactNode[] {
  if (!vocab.trim()) return [sentence];
  const escaped = vocab.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = sentence.split(regex);

  return parts.map((part, i) => {
    if (regex.test(part)) {
      const blanked = part
        .split(" ")
        .map((word) => {
          if (!word) return "";
          return word[0] + "█".repeat(Math.max(0, word.length - 1));
        })
        .join(" ");
      return (
        <span key={i} className="font-mono text-primary font-bold tracking-wider bg-primary/10 px-1.5 py-0.5 rounded">
          {blanked}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface ExampleCarouselProps {
  examples: string[];
  vocab: string;
  revealed: boolean;
  onSpeakSentence?: (text: string) => void;
}

export function ExampleCarousel({
  examples,
  vocab,
  revealed,
  onSpeakSentence,
}: ExampleCarouselProps) {
  const [idx, setIdx] = useState(0);

  if (!examples || examples.length === 0) return null;

  const prev = () => setIdx((i) => (i - 1 + examples.length) % examples.length);
  const next = () => setIdx((i) => (i + 1) % examples.length);

  const sentence = examples[idx] || "";

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-card/60 backdrop-blur shadow-sm p-4 space-y-2.5">
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <span>📖</span> Context Example {examples.length > 1 ? `(${idx + 1}/${examples.length})` : ""}
        </span>
        <div className="flex items-center gap-2">
          {revealed && onSpeakSentence && sentence && (
            <button
              onClick={() => onSpeakSentence(sentence)}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full"
              title="Listen to full sentence"
            >
              <span>🔊</span>
              <span>Listen</span>
            </button>
          )}
          {examples.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={prev}
                className="w-6 h-6 rounded-md bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-xs font-bold transition-colors"
                aria-label="Previous example"
              >
                ‹
              </button>
              <button
                onClick={next}
                className="w-6 h-6 rounded-md bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-xs font-bold transition-colors"
                aria-label="Next example"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="text-sm text-foreground leading-relaxed">
        {revealed ? (
          <span>
            {sentence.includes("___") ? (
              sentence.split(/_{3,}/).map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <strong className="font-extrabold text-primary underline underline-offset-2 mx-1">
                      {vocab}
                    </strong>
                  )}
                </span>
              ))
            ) : (
              sentence
                .split(new RegExp(`(${vocab.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"))
                .map((part, i) =>
                  new RegExp(`^${vocab.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "gi").test(part) ? (
                    <strong key={i} className="font-extrabold text-primary underline underline-offset-2">
                      {part}
                    </strong>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )
            )}
          </span>
        ) : sentence.includes("___") ? (
          <span>
            {sentence.split(/_{3,}/).map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="font-mono text-primary font-bold tracking-wider bg-primary/10 px-2 py-0.5 rounded mx-1">
                    ______
                  </span>
                )}
              </span>
            ))}
          </span>
        ) : (
          blankOutVocab(sentence, vocab)
        )}
      </div>

      {examples.length > 1 && (
        <div className="flex justify-center gap-1 pt-1">
          {examples.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === idx ? "bg-primary w-3" : "bg-muted-foreground/30"
              }`}
              aria-label={`Example ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
