"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (isOpen) {
      setCurrentOrder(sectionsOrder);
      setCurrentHidden(hiddenSections);
    }
  }, [isOpen, sectionsOrder, hiddenSections]);

  if (!isOpen) return null;

  const moveSection = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;

    const newOrder = [...currentOrder];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);
    setCurrentOrder(newOrder);
  };

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-dashboard-title"
    >
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              <h2 id="customize-dashboard-title" className="text-lg font-black text-foreground">
                Customize Dashboard Layout
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reorder sections using the arrows or hide widgets to personalize your study view.
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

        {/* Section List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1">
          {currentOrder.map((sectionId, index) => {
            const config = DASHBOARD_SECTIONS[sectionId];
            if (!config) return null;
            const isHidden = currentHidden.includes(sectionId);

            return (
              <div
                key={sectionId}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                  isHidden
                    ? "bg-muted/20 border-border/40 opacity-60"
                    : "bg-muted/40 border-border hover:border-primary/40 shadow-xs"
                }`}
              >
                {/* Left: Position badge, Icon, Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-card border border-border text-[11px] font-mono font-bold text-muted-foreground">
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
        <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
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
