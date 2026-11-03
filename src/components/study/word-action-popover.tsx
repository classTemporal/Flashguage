"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface WordActionPopoverProps {
  word: string;
  lang?: string;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onAddAI: (word: string) => void;
  onAddManual: (word: string) => void;
  onPlayAudio?: (word: string) => void;
}

export function WordActionPopover({
  word,
  lang = "en",
  position,
  onClose,
  onAddAI,
  onAddManual,
  onPlayAudio,
}: WordActionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!mounted || !position || !word.trim()) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 99999,
      }}
      className="w-56 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 text-foreground"
    >
      {/* Header with Word & Play/Close */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0 pr-1">
          <button
            type="button"
            onClick={() => onPlayAudio?.(word)}
            className="flex items-center gap-1 text-xs font-black text-primary hover:text-primary/80 transition-colors truncate cursor-pointer"
            title={`Replay pronunciation for "${word}"`}
          >
            <span>🔊</span>
            <span className="truncate">&ldquo;{word}&rdquo;</span>
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors shrink-0 cursor-pointer"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Action Options */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => {
            onAddAI(word);
            onClose();
          }}
          className="w-full rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-start gap-2 cursor-pointer"
        >
          <span>✨</span>
          <span>Add to Deck with AI</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onAddManual(word);
            onClose();
          }}
          className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted active:scale-[0.98] transition-all flex items-center justify-start gap-2 cursor-pointer"
        >
          <span>✏️</span>
          <span>Create Custom (Manual)</span>
        </button>
      </div>

      <div className="pt-2 text-[10px] text-muted-foreground/80 text-center font-medium">
        Click to study or add word
      </div>
    </div>,
    document.body
  );
}
