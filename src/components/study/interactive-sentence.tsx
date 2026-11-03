"use client";

import React, { useState, useCallback } from "react";
import { playCardSpeech } from "@/lib/speech";
import { WordActionPopover } from "@/components/study/word-action-popover";
import { QuickAddCardModal } from "@/components/card/quick-add-card-modal";

interface InteractiveSentenceProps {
  text: string;
  lang?: string;
  deckId?: string;
  className?: string;
  wordClassName?: string;
  highlightWord?: string;
  onAddWord?: (word: string, mode: "ai" | "manual") => void;
  onWordSpoken?: (word: string) => void;
}

export function InteractiveSentence({
  text,
  lang = "en",
  deckId,
  className = "",
  wordClassName = "",
  highlightWord,
  onAddWord,
  onWordSpoken,
}: InteractiveSentenceProps) {
  const [popover, setPopover] = useState<{
    word: string;
    x: number;
    y: number;
  } | null>(null);

  const [quickAddState, setQuickAddState] = useState<{
    isOpen: boolean;
    word: string;
    tab: "ai" | "manual";
  }>({
    isOpen: false,
    word: "",
    tab: "ai",
  });

  const handleWordClick = useCallback(
    (cleanWord: string, e: React.MouseEvent<HTMLSpanElement>) => {
      e.stopPropagation();
      e.preventDefault();

      // 1. Play pronunciation of this word immediately
      playCardSpeech(cleanWord, lang, { skipCache: false });
      onWordSpoken?.(cleanWord);

      // 2. Open popover anchored near the clicked word
      const rect = e.currentTarget.getBoundingClientRect();
      const popoverWidth = 230;
      const x = Math.min(
        window.innerWidth - popoverWidth - 12,
        Math.max(12, rect.left + rect.width / 2 - popoverWidth / 2)
      );
      const y = rect.bottom + 8;

      setPopover({
        word: cleanWord,
        x,
        y,
      });
    },
    [lang, onWordSpoken]
  );

  const handleAddAI = useCallback(
    (word: string) => {
      if (onAddWord) {
        onAddWord(word, "ai");
      } else {
        setQuickAddState({
          isOpen: true,
          word,
          tab: "ai",
        });
      }
    },
    [onAddWord]
  );

  const handleAddManual = useCallback(
    (word: string) => {
      if (onAddWord) {
        onAddWord(word, "manual");
      } else {
        setQuickAddState({
          isOpen: true,
          word,
          tab: "manual",
        });
      }
    },
    [onAddWord]
  );

  const handlePlayAudio = useCallback(
    (word: string) => {
      playCardSpeech(word, lang, { skipCache: false });
    },
    [lang]
  );

  if (!text) return null;

  // Split sentence into words and non-words (punctuation/spaces)
  const tokens = text.split(/([\p{L}\p{N}'’\-]+)/u);
  const cleanHighlight = highlightWord?.trim().toLowerCase();

  return (
    <>
      <span className={className}>
        {tokens.map((token, idx) => {
          const cleanWord = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").trim();
          const isWord = cleanWord.length > 0 && /[\p{L}\p{N}]/u.test(cleanWord);

          if (!isWord) {
            return <React.Fragment key={idx}>{token}</React.Fragment>;
          }

          const isHighlighted = cleanHighlight && cleanWord.toLowerCase() === cleanHighlight;

          return (
            <span
              key={idx}
              role="button"
              tabIndex={0}
              onClick={(e) => handleWordClick(cleanWord, e)}
              className={`inline-block rounded px-0.5 transition-all cursor-pointer ${
                isHighlighted
                  ? "font-extrabold text-primary underline underline-offset-2 bg-primary/10"
                  : "hover:text-primary hover:bg-primary/15 hover:underline underline-offset-2"
              } ${wordClassName}`}
              title={`Click to listen or add "${cleanWord}" to your deck`}
            >
              {token}
            </span>
          );
        })}
      </span>

      {/* Popover */}
      {popover && (
        <WordActionPopover
          word={popover.word}
          lang={lang}
          position={{ x: popover.x, y: popover.y }}
          onClose={() => setPopover(null)}
          onAddAI={handleAddAI}
          onAddManual={handleAddManual}
          onPlayAudio={handlePlayAudio}
        />
      )}

      {/* Internal Quick Add Modal if parent did not provide custom onAddWord */}
      {!onAddWord && quickAddState.isOpen && (
        <QuickAddCardModal
          isOpen={quickAddState.isOpen}
          onClose={() => setQuickAddState((s) => ({ ...s, isOpen: false }))}
          deckId={deckId || "all"}
          targetLanguage={lang}
          initialPrompt={quickAddState.word}
          initialTab={quickAddState.tab}
        />
      )}
    </>
  );
}
