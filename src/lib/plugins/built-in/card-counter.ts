import { Plugin } from "@/lib/plugins";

export function CardCounterPlugin(): Plugin {
  return {
    id: "card-counter",
    name: "Card Counter",
    version: "1.0.0",
    author: "English Flashcards",
    description: "Tracks how many times each card has been reviewed. Adds a review counter to card metadata.",
    hooks: {
      onCardReview(ctx) {
        if (!ctx.card) return;
        const metaKey = "plugin:card-counter:counts";
        try {
          const raw = localStorage.getItem(metaKey);
          const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
          counts[ctx.card.id] = (counts[ctx.card.id] || 0) + 1;
          localStorage.setItem(metaKey, JSON.stringify(counts));
        } catch {
          // ignore storage errors
        }
      },
    },
  };
}
