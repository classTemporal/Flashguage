import React, { useEffect, useState, useCallback } from "react";
import { fetchSentencePhonetics, PhoneticWord } from "@/lib/phonetics";
import { playCardSpeech } from "@/lib/speech";
import { WordActionPopover } from "@/components/study/word-action-popover";
import { QuickAddCardModal } from "@/components/card/quick-add-card-modal";
import { InteractiveSentence } from "@/components/study/interactive-sentence";

interface PhoneticSentenceProps {
  text: string;
  lang?: string;
  isRevealed: boolean;
  words?: PhoneticWord[] | null;
  className?: string;
  wordClassName?: string;
  ipaClassName?: string;
  deckId?: string;
  interactive?: boolean;
}

export function PhoneticSentence({
  text,
  lang = "en",
  isRevealed,
  words: propWords,
  className = "",
  wordClassName = "",
  ipaClassName = "",
  deckId,
  interactive = true,
}: PhoneticSentenceProps) {
  const [internalWords, setInternalWords] = useState<PhoneticWord[] | null>(propWords || null);
  const [isLoading, setIsLoading] = useState(false);

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
    (rawWord: string, e: React.MouseEvent<HTMLElement>) => {
      if (!interactive) return;
      e.stopPropagation();
      e.preventDefault();

      const cleanWord = rawWord.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").trim();
      if (!cleanWord) return;

      playCardSpeech(cleanWord, lang, { skipCache: false });

      const rect = e.currentTarget.getBoundingClientRect();
      const popoverWidth = 230;
      const popoverHeight = 150;
      const x = Math.min(
        window.innerWidth - popoverWidth - 12,
        Math.max(12, rect.left + rect.width / 2 - popoverWidth / 2)
      );
      const spaceBelow = window.innerHeight - rect.bottom;
      const y =
        spaceBelow < popoverHeight + 16
          ? Math.max(10, rect.top - popoverHeight - 8)
          : rect.bottom + 8;

      setPopover({
        word: cleanWord,
        x,
        y,
      });
    },
    [interactive, lang]
  );

  useEffect(() => {
    if (propWords) {
      setInternalWords(propWords);
      return;
    }

    if (isRevealed && text) {
      let cancelled = false;
      setIsLoading(true);

      fetchSentencePhonetics(text, lang)
        .then((result) => {
          if (!cancelled && result && result.length > 0) {
            setInternalWords(result);
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }
  }, [isRevealed, text, lang, propWords]);

  // If not revealed yet, display interactive natural sentence text
  if (!isRevealed) {
    if (interactive) {
      return (
        <InteractiveSentence
          text={text}
          lang={lang}
          deckId={deckId}
          className={className}
          wordClassName={wordClassName}
        />
      );
    }
    return <p className={className}>{text}</p>;
  }

  // If revealed and we have phonetic words, render interlinear layout
  if (internalWords && internalWords.length > 0) {
    return (
      <>
        <div className={`flex flex-wrap items-baseline gap-x-1.5 gap-y-2 animate-in fade-in duration-200 ${className}`}>
          {internalWords.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => handleWordClick(item.word, e)}
              className="inline-flex flex-col items-center leading-tight p-0.5 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer group text-left"
              title={`Click to listen or add "${item.word}" to deck`}
            >
              <span className={`${wordClassName || "text-foreground font-medium"} group-hover:text-primary group-hover:underline underline-offset-2 transition-colors`}>
                {item.word}
              </span>
              {item.ipa ? (
                <span className={ipaClassName || "text-[11px] font-mono text-primary/85 font-semibold select-none pt-0.5 tracking-tight group-hover:text-primary"}>
                  /{item.ipa}/
                </span>
              ) : (
                <span className="text-[11px] font-mono text-transparent select-none pt-0.5">&nbsp;</span>
              )}
            </button>
          ))}
        </div>

        {/* Popover */}
        {popover && (
          <WordActionPopover
            word={popover.word}
            lang={lang}
            position={{ x: popover.x, y: popover.y }}
            onClose={() => setPopover(null)}
            onAddAI={(w) => {
              setQuickAddState({ isOpen: true, word: w, tab: "ai" });
              setPopover(null);
            }}
            onAddManual={(w) => {
              setQuickAddState({ isOpen: true, word: w, tab: "manual" });
              setPopover(null);
            }}
            onPlayAudio={(w) => playCardSpeech(w, lang)}
          />
        )}

        {/* Quick Add Modal */}
        {quickAddState.isOpen && (
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

  // If loading phonetics, display interactive natural text with gentle loading indicator
  return (
    <div className={`space-y-1 ${className}`}>
      {interactive ? (
        <InteractiveSentence
          text={text}
          lang={lang}
          deckId={deckId}
          className="font-medium"
          wordClassName={wordClassName}
        />
      ) : (
        <p className="font-medium">{text}</p>
      )}
      {isLoading && (
        <p className="text-[10px] text-muted-foreground animate-pulse flex items-center gap-1 font-mono">
          <span>✨</span>
          <span>Generating pronunciation guide...</span>
        </p>
      )}
    </div>
  );
}
