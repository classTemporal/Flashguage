import { mutate } from "swr";

/**
 * Global cache invalidation utility for SWR.
 * Refetches all endpoints related to cards, decks, reviews, and stats
 * so UI updates instantly across all open screens and components.
 */
export async function invalidateAppCache(): Promise<void> {
  try {
    await mutate(
      (key) =>
        typeof key === "string" &&
        (key.startsWith("/api/cards") ||
          key.startsWith("/api/decks") ||
          key.startsWith("/api/stats") ||
          key.startsWith("/api/reviews") ||
          key.startsWith("/api/dictionaries")),
      undefined,
      { revalidate: true }
    );
  } catch (err) {
    console.error("Cache invalidation error:", err);
  }
}
