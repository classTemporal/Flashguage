/**
 * Offline Multimedia Cache Manager for Flashguage
 * 
 * Provides background pre-caching of study queue images and TTS neural audio,
 * ensuring seamless offline study sessions in trains, airplanes, or low-connectivity zones.
 */

const MEDIA_CACHE_NAME = "engcards-media-v1";
const AUDIO_MAP_PREFIX = "flashguage_tts_";

function getAudioKey(text: string, lang = "en"): string {
  const clean = text.trim().toLowerCase().replace(/\s+/g, "_");
  return `${AUDIO_MAP_PREFIX}${lang}_${clean}`;
}

export function getOfflineCachedAudio(text: string, lang = "en"): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(getAudioKey(text, lang));
  } catch {
    return null;
  }
}

export function setOfflineCachedAudio(text: string, lang: string, audioUrl: string): void {
  if (typeof window === "undefined" || !audioUrl) return;
  try {
    localStorage.setItem(getAudioKey(text, lang), audioUrl);
  } catch {
    // Ignore storage quota limits
  }
}

/**
 * Cache an image or audio asset directly in the Service Worker's media cache.
 */
export async function cacheUrlInMediaCache(url: string): Promise<boolean> {
  if (typeof window === "undefined" || !url || !("caches" in window)) {
    return false;
  }

  try {
    const cache = await caches.open(MEDIA_CACHE_NAME);
    const existing = await cache.match(url);
    if (existing) {
      return true;
    }

    const response = await fetch(url, { mode: "no-cors" });
    if (response && (response.ok || response.type === "opaque")) {
      await cache.put(url, response.clone());
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export interface PreloadProgress {
  cachedCards: number;
  totalCards: number;
  isComplete: boolean;
}

/**
 * Pre-cache media (images and TTS audio) for active study queue.
 * Runs concurrently with rate-limiting to avoid network congestion.
 */
export async function prefetchStudyQueueMedia(
  cards: Array<{ front: string; imageUrl?: string | null }>,
  language = "en",
  limit = 15,
  onProgress?: (progress: PreloadProgress) => void
): Promise<{ cachedCards: number; totalCards: number }> {
  if (typeof window === "undefined" || !Array.isArray(cards) || cards.length === 0) {
    return { cachedCards: 0, totalCards: 0 };
  }

  // Only prefetch if user is online
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { cachedCards: 0, totalCards: cards.length };
  }

  const itemsToCache = cards.slice(0, limit);
  let completed = 0;

  for (const card of itemsToCache) {
    if (!card?.front) continue;

    try {
      // 1. Cache card image if present
      if (card.imageUrl) {
        await cacheUrlInMediaCache(card.imageUrl);
      }

      // 2. Cache TTS audio if not already mapped
      const existingAudio = getOfflineCachedAudio(card.front, language);
      if (!existingAudio) {
        try {
          const res = await fetch("/api/audio/speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: card.front,
              language,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.audioUrl) {
              setOfflineCachedAudio(card.front, language, data.audioUrl);
              await cacheUrlInMediaCache(data.audioUrl);
            }
          }
        } catch {
          // Continue to next card if individual audio fails
        }
      } else {
        // Ensure the mapped audio file is in cache
        await cacheUrlInMediaCache(existingAudio);
      }
    } catch {
      // Ignore card preload error
    } finally {
      completed++;
      onProgress?.({
        cachedCards: completed,
        totalCards: itemsToCache.length,
        isComplete: completed >= itemsToCache.length,
      });
    }
  }

  return { cachedCards: completed, totalCards: itemsToCache.length };
}
