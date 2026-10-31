"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export type DashboardSectionId =
  | "daily_goal"
  | "reviews_queue"
  | "performance"
  | "decks"
  | "weekly_chart"
  | "dictionary"
  | "learning_progress"
  | "tools";

export interface DashboardSectionConfig {
  id: DashboardSectionId;
  label: string;
  description: string;
  icon: string;
  defaultSpan: string;
}

export const DASHBOARD_SECTIONS: Record<DashboardSectionId, DashboardSectionConfig> = {
  daily_goal: {
    id: "daily_goal",
    label: "Daily Goal & Target",
    description: "Daily review target, progress bar, session cooldown timer, and quick study action",
    icon: "🎯",
    defaultSpan: "col-span-1 lg:col-span-12",
  },
  reviews_queue: {
    id: "reviews_queue",
    label: "Reviews Due Queue",
    description: "Spaced repetition cards due today grouped by deck (auto-hidden when caught up)",
    icon: "⏰",
    defaultSpan: "col-span-1 lg:col-span-12",
  },
  performance: {
    id: "performance",
    label: "Performance & Mastery",
    description: "Daily streak, cards learned, daily goal percentage, and mastery XP level",
    icon: "🔥",
    defaultSpan: "col-span-1 lg:col-span-12",
  },
  decks: {
    id: "decks",
    label: "Vocabulary Decks",
    description: "Decks for your active language with quick study and add deck shortcuts",
    icon: "🗂️",
    defaultSpan: "col-span-1 lg:col-span-12",
  },
  weekly_chart: {
    id: "weekly_chart",
    label: "Weekly Practice Chart",
    description: "7-day histogram visualizer tracking consecutive daily review consistency",
    icon: "📊",
    defaultSpan: "col-span-1 lg:col-span-6",
  },
  dictionary: {
    id: "dictionary",
    label: "Quick Dictionary Lookup",
    description: "Search words, definitions, and pronunciations directly from the dashboard",
    icon: "📖",
    defaultSpan: "col-span-1 lg:col-span-6",
  },
  learning_progress: {
    id: "learning_progress",
    label: "Learning Progress & Retention",
    description: "Detailed breakdown of mastered cards, words in progress, and retention %",
    icon: "📈",
    defaultSpan: "col-span-1 lg:col-span-12",
  },
  tools: {
    id: "tools",
    label: "Tools & Shortcuts",
    description: "Direct links to Context Picker, Flashcard Importer, and Community Decks",
    icon: "🛠️",
    defaultSpan: "col-span-1 lg:col-span-12",
  },
};

export const DEFAULT_SECTIONS_ORDER: DashboardSectionId[] = [
  "daily_goal",
  "reviews_queue",
  "performance",
  "decks",
  "weekly_chart",
  "dictionary",
  "learning_progress",
  "tools",
];

interface CustomizeDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionsOrder: DashboardSectionId[];
  hiddenSections: DashboardSectionId[];
  onSaveOrder: (newOrder: DashboardSectionId[], newHidden: DashboardSectionId[]) => void;
  onReset: () => void;
}

export function CustomizeDashboardModal({
  isOpen,
  onClose,
  sectionsOrder,
  hiddenSections,
  onSaveOrder,
  onReset,
}: CustomizeDashboardModalProps) {
  const [currentOrder, setCurrentOrder] = useState<DashboardSectionId[]>(sectionsOrder);
  const [currentHidden, setCurrentHidden] = useState<DashboardSectionId[]>(hiddenSections);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const touchIndexRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Lock background body scrolling whenever modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCurrentOrder(sectionsOrder);
      setCurrentHidden(hiddenSections);
      setDraggedIndex(null);
      setDragOverIndex(null);
      touchIndexRef.current = null;
    }
  }, [isOpen, sectionsOrder, hiddenSections]);

  const moveSection = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;

    const newOrder = [...currentOrder];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);
    setCurrentOrder(newOrder);
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= currentOrder.length || to >= currentOrder.length) return;
    const newOrder = [...currentOrder];
    const [moved] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, moved);
    setCurrentOrder(newOrder);
  };

  // ── Mobile Touch Drag Listeners: bound when modal is open ──
  useEffect(() => {
    if (!isOpen) return;
    const listEl = listRef.current;
    if (!listEl) return;

    const onTouchMove = (e: TouchEvent) => {
      if (touchIndexRef.current === null) return;
      if (e.cancelable) {
        e.preventDefault();
      }

      const touch = e.touches[0];
      if (!touch) return;

      const items = listEl.querySelectorAll("[data-section-index]");
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rect = item.getBoundingClientRect();
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          const overIndex = Number(item.getAttribute("data-section-index"));
          if (!isNaN(overIndex) && overIndex !== touchIndexRef.current) {
            if (typeof window !== "undefined" && window.navigator?.vibrate) {
              try {
                window.navigator.vibrate(15);
              } catch {}
            }
            const from = touchIndexRef.current;
            const to = overIndex;
            setCurrentOrder((prev) => {
              const next = [...prev];
              const [moved] = next.splice(from, 1);
              next.splice(to, 0, moved);
              return next;
            });
            touchIndexRef.current = overIndex;
            setDraggedIndex(overIndex);
            setDragOverIndex(overIndex);
          }
          break;
        }
      }
    };

    const onTouchEnd = () => {
      touchIndexRef.current = null;
      setDraggedIndex(null);
      setDragOverIndex(null);
    };

    listEl.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      listEl.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleVisibility = (id: DashboardSectionId) => {
    setCurrentHidden((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    onSaveOrder(currentOrder, currentHidden);
    onClose();
  };

  const handleReset = () => {
    setCurrentOrder(DEFAULT_SECTIONS_ORDER);
    setCurrentHidden([]);
    onReset();
    onClose();
  };

  // ── HTML5 Mouse Drag Handlers ──
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorder(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleTouchStart = (index: number) => {
    touchIndexRef.current = index;
    setDraggedIndex(index);
    setDragOverIndex(index);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-dashboard-title"
    >
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              <h2 id="customize-dashboard-title" className="text-lg font-black text-foreground">
                Customize Dashboard Layout
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Drag items to lift and reorder them into position, or use the arrows.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Section List with Drag & Drop */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-2.5 px-0.5 select-none w-full"
        >
          {currentOrder.map((sectionId, index) => {
            const config = DASHBOARD_SECTIONS[sectionId];
            if (!config) return null;
            const isHidden = currentHidden.includes(sectionId);
            const isBeingDragged = draggedIndex === index;
            const isDropTarget = dragOverIndex === index && !isBeingDragged;

            return (
              <div
                key={sectionId}
                data-section-index={index}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group relative flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all duration-200 box-border w-full ${
                  isBeingDragged
                    ? "z-30 -translate-y-1.5 shadow-2xl ring-2 ring-primary border-primary bg-card/98 shadow-primary/30 cursor-grabbing"
                    : isDropTarget
                    ? "border-primary ring-2 ring-primary/40 bg-primary/10 shadow-md"
                    : isHidden
                    ? "bg-muted/20 border-border/40 opacity-60 hover:opacity-80"
                    : "bg-muted/40 border-border hover:border-primary/40 shadow-xs"
                }`}
              >
                {/* Left: Drag Grip Handle, Position badge, Icon, Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Dedicated 6-dot Drag Handle with Touch prevention */}
                  <div
                    onTouchStart={() => handleTouchStart(index)}
                    className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-primary active:text-primary transition-colors cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
                    title="Press and drag to reorder"
                    aria-label="Drag handle"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M5 3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm6-10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
                    </svg>
                  </div>

                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[11px] font-mono font-bold transition-colors ${
                    isBeingDragged
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground"
                  }`}>
                    #{index + 1}
                  </span>

                  <div className="text-xl shrink-0" aria-hidden="true">
                    {config.icon}
                  </div>

                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${isHidden ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {config.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {config.description}
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Visibility Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleVisibility(sectionId)}
                    title={isHidden ? "Show widget" : "Hide widget"}
                    className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-bold transition-colors ${
                      isHidden
                        ? "bg-muted/60 border-border text-muted-foreground hover:text-foreground"
                        : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                    }`}
                  >
                    {isHidden ? "👁️‍🗨️" : "👁️"}
                  </button>

                  {/* Move Up */}
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveSection(index, "up")}
                    title="Move up"
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-xs font-black text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    ▲
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    disabled={index === currentOrder.length - 1}
                    onClick={() => moveSection(index, "down")}
                    title="Move down"
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-xs font-black text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    ▼
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            🔄 Reset to Default
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 shadow-xs px-4"
            >
              Save Layout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
