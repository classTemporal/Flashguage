/**
 * Phonetics Client Manager
 * Fetches and caches word-by-word IPA transcriptions for spoken sentences/definitions.
 */

export interface PhoneticWord {
  word: string;
  ipa: string;
}

const MEMORY_CACHE = new Map<string, PhoneticWord[]>();

export async function fetchSentencePhonetics(
  text: string,
  lang: string = "en"
): Promise<PhoneticWord[] | null> {
  if (!text || typeof window === "undefined") return null;

  const clean = text.trim();
  const cacheKey = `flashguage_ipa_v1_${(lang || "en").toLowerCase()}_${clean.toLowerCase()}`;

  // 1. Check in-memory session cache
  if (MEMORY_CACHE.has(cacheKey)) {
    return MEMORY_CACHE.get(cacheKey)!;
  }

  // 2. Check localStorage
  try {
    const local = localStorage.getItem(cacheKey);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        MEMORY_CACHE.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch {}

  // 3. Fetch from API
  try {
    const res = await fetch("/api/ai/phonetics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean, language: lang }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.success && Array.isArray(data.words) && data.words.length > 0) {
      MEMORY_CACHE.set(cacheKey, data.words);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data.words));
      } catch {}
      return data.words;
    }
  } catch (err) {
    console.warn("[fetchSentencePhonetics error]:", err);
  }

  return null;
}
