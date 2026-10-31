const STOP_WORDS = new Set([
  "a", "an", "the", "of", "in", "to", "for", "with", "on", "at", "from", "by", "about",
  "as", "into", "like", "through", "after", "over", "between", "out", "against", "during",
  "without", "before", "under", "around", "among", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "or", "and", "not", "no", "but", "if",
  "so", "than", "too", "very", "can", "will", "just", "should", "now", "used", "relating",
  "someone", "something", "make", "made", "such", "term", "referring", "refers", "defined",
  "meaning", "means", "particular", "equal", "certain", "typically", "often", "especially",
  "usually", "noun", "verb", "adjective", "adverb", "pronoun", "example", "definition"
]);

export function extractKeywords(text?: string): string[] {
  if (!text) return [];
  try {
    text = decodeURIComponent(text);
  } catch {
    // ignore
  }
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return Array.from(new Set(words));
}

// Canonical filename extractor to prevent duplicate images of different thumbnail sizes
export function getMediaCanonicalKey(url: string): string {
  try {
    const clean = decodeURIComponent(url.split("?")[0]);
    const parts = clean.split("/");
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i].replace(/^\d+px-/, "");
      if (/\.(jpe?g|png|webp|gif)$/i.test(part)) {
        return part.toLowerCase();
      }
    }
    return clean.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function isJunkImage(title: string, url: string): boolean {
  let full = `${title} ${url}`.toLowerCase();
  try {
    full = decodeURIComponent(full);
  } catch {
    // ignore
  }
  full = full.replace(/_/g, " ");

  // Reject SVG (including rasterized svg.png), PDF, DJVU, WEBM, OGG
  if (/\.svg($|\.|\/|\?)/i.test(url) || /\.pdf($|\.|\/|\?)/i.test(url) || /\.djvu($|\.|\/|\?)/i.test(url)) {
    return true;
  }
  if (/\.(webm|ogg|tif|tiff)($|\?)/i.test(url)) {
    return true;
  }

  // Reject document scans, book covers, coats of arms, road signs
  if (
    /scan of|book cover|cover of|title page|frontispiece|dust jacket|spine of|geograph\.org\.uk|fortepan|advertisement|newspaper|magazine cover|coat of arms|wappen|blason|flag of/i.test(
      full
    )
  ) {
    return true;
  }

  return false;
}

export interface SemanticImageMatch {
  imageUrl: string;
  title?: string;
  source?: string;
  score: number;
}

export interface ResolveImageResult {
  imageUrl?: string;
  candidates: string[];
  source: string;
  title?: string;
}

const API_HEADERS = {
  "User-Agent": "EnglishFlashcardsApp/1.0 (educational tool; contact@englishflashcards.app)",
};

/**
 * Direct Wikipedia Summary check
 * ONLY returns lead photo if:
 * 1) No definition was provided, OR
 * 2) There is verified semantic overlap with the definition keywords
 */
async function fetchWikipediaSummary(
  word: string,
  targetTokens: Set<string>
): Promise<SemanticImageMatch | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word.trim())}`;
    const res = await fetch(url, { headers: API_HEADERS });
    if (!res.ok) return null;
    const data = await res.json();

    if (data.type === "disambiguation") return null;

    const thumb = data.thumbnail?.source || data.originalimage?.source;
    if (!thumb || typeof thumb !== "string") return null;
    if (isJunkImage(data.title || "", thumb)) return null;

    const title = data.title || word;
    const desc = `${data.description || ""} ${data.extract || ""}`.toLowerCase();
    const descTokens = new Set(extractKeywords(desc));

    let overlap = 0;
    for (const t of targetTokens) {
      if (descTokens.has(t)) overlap++;
    }

    // CRITICAL: If definition was specified, REJECT if overlap is 0!
    // (Prevents e.g. boat = "a full house" from picking motorboat)
    if (targetTokens.size > 0 && overlap === 0) {
      return null;
    }

    const isExactWord = title.toLowerCase() === word.trim().toLowerCase();
    const score = (isExactWord ? 60 : 30) + overlap * 35;

    return {
      imageUrl: thumb,
      title,
      source: "Wikipedia Encyclopedia",
      score,
    };
  } catch {
    return null;
  }
}

/**
 * Wikipedia Search with semantic scoring and offset support
 */
async function searchWikipediaPages(
  query: string,
  mainWord: string,
  targetTokens: Set<string>,
  offset: number = 0
): Promise<SemanticImageMatch[]> {
  try {
    const offsetParam = offset > 0 ? `&gsroffset=${offset}` : "";
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query
    )}&gsrlimit=6${offsetParam}&prop=pageimages|description|extracts&exintro=1&explaintext=1&exchars=200&pithumbsize=600&format=json`;

    const res = await fetch(url, { headers: API_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return [];

    const isAstronomy = /space|star|galaxy|astronomy|nebula|planet|solar|telescope/i.test(query);
    const matches: SemanticImageMatch[] = [];

    for (const p of Object.values(pages) as any[]) {
      const thumb = p.thumbnail?.source;
      if (!thumb || typeof thumb !== "string") continue;

      const title = p.title || "";
      const lowerTitle = title.toLowerCase();
      const desc = `${p.description || ""} ${p.extract || ""}`.toLowerCase();

      if (isJunkImage(title, thumb)) continue;
      if (/disambiguation|list of lists|filmography|discography|videography/i.test(lowerTitle)) {
        continue;
      }
      if (!isAstronomy && /magellanic|galaxy|nebula|cluster|asteroid/i.test(lowerTitle)) {
        continue;
      }

      const allTokens = new Set(extractKeywords(`${title} ${desc}`));
      let overlap = 0;
      for (const t of targetTokens) {
        if (allTokens.has(t)) overlap++;
      }

      // If definition exists and zero overlap, skip this candidate
      if (targetTokens.size > 0 && overlap === 0) {
        continue;
      }

      let score = overlap * 35;
      if (mainWord && lowerTitle.includes(mainWord.toLowerCase())) {
        score += 20;
      }

      matches.push({
        imageUrl: thumb,
        title,
        source: `Wikipedia: ${title}`,
        score,
      });
    }

    return matches;
  } catch {
    return [];
  }
}

/**
 * Wikimedia Commons Search with strict filtering and offset support
 */
async function searchWikimediaCommons(
  query: string,
  mainWord: string,
  targetTokens: Set<string>,
  offset: number = 0
): Promise<SemanticImageMatch[]> {
  try {
    const offsetParam = offset > 0 ? `&gsroffset=${offset}` : "";
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
      query
    )}&gsrlimit=8${offsetParam}&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json`;

    const res = await fetch(url, { headers: API_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return [];

    const isAstronomy = /space|star|galaxy|astronomy|nebula|planet|solar|telescope/i.test(query);
    const matches: SemanticImageMatch[] = [];

    for (const p of Object.values(pages) as any[]) {
      const title = p.title || "";
      const thumb = p.imageinfo?.[0]?.thumburl || p.imageinfo?.[0]?.url;
      if (!thumb || typeof thumb !== "string") continue;

      if (isJunkImage(title, thumb)) continue;
      if (!isAstronomy && /magellanic|galaxy|nebula|asteroid|\(ship\b|\(boat\b/i.test(title.toLowerCase())) {
        continue;
      }

      const titleTokens = new Set(extractKeywords(title));
      let overlap = 0;
      for (const t of targetTokens) {
        if (titleTokens.has(t)) overlap++;
      }

      // If definition exists and zero overlap in commons title, skip
      if (targetTokens.size > 0 && overlap === 0) {
        continue;
      }

      let score = overlap * 30 + 10;
      if (mainWord && title.toLowerCase().includes(mainWord.toLowerCase())) {
        score += 15;
      }

      matches.push({
        imageUrl: thumb,
        title,
        source: "Wikimedia Commons",
        score,
      });
    }

    return matches;
  } catch {
    return [];
  }
}

/**
 * Universal Semantic Image Resolver with Pagination
 * Evaluates the word, definition, and optional visual query context to retrieve
 * the most accurate, vetted, and visually matching educational images without duplicates.
 */
export async function resolveSemanticImage(
  word: string,
  definition?: string,
  visualQuery?: string,
  page: number = 0
): Promise<ResolveImageResult> {
  const cleanWord = word.trim();
  if (!cleanWord && !definition && !visualQuery) {
    return { candidates: [], source: "None" };
  }

  const defTokens = new Set(extractKeywords(definition));
  const visTokens = new Set(extractKeywords(visualQuery));
  const allTargetTokens = new Set([...defTokens, ...visTokens]);
  const kwList = Array.from(allTargetTokens);

  const offset = Math.max(0, page) * 4;

  // Map by canonical filename to ensure no duplicate images with different thumbnail widths
  const candidatesMap = new Map<string, SemanticImageMatch>();

  function addCandidate(match: SemanticImageMatch) {
    const key = getMediaCanonicalKey(match.imageUrl);
    if (!candidatesMap.has(key)) {
      candidatesMap.set(key, match);
    } else {
      const existing = candidatesMap.get(key)!;
      if (match.score > existing.score) {
        candidatesMap.set(key, match);
      }
    }
  }

  // Step 1: Direct Wikipedia Summary (Only on page 0 and if overlap >= 1 or no definition provided)
  if (page === 0 && cleanWord) {
    const summaryMatch = await fetchWikipediaSummary(cleanWord, allTargetTokens);
    if (summaryMatch) {
      addCandidate(summaryMatch);
    }
  }

  // Step 2: Formulate prioritized search queries
  const searchQueries: string[] = [];

  // If explicit visual query provided by user or AI
  if (visualQuery && visualQuery.trim()) {
    searchQueries.push(visualQuery.trim());
    if (cleanWord) searchQueries.push(`${cleanWord} ${visualQuery.trim()}`);
  }

  // If definition exists, query the definition concept first!
  if (kwList.length > 0) {
    // Specialized idioms/slang checks (e.g. "full house" -> poker/cards)
    if (defTokens.has("house") && defTokens.has("full")) {
      searchQueries.push("full house poker");
      searchQueries.push("full house playing cards");
    }

    // Top definition keywords
    searchQueries.push(kwList.slice(0, 3).join(" "));

    if (cleanWord) {
      searchQueries.push(`${cleanWord} ${kwList.slice(0, 2).join(" ")}`);
    }
  }

  // Fallback to bare word if definition yielded no candidates
  if (cleanWord) {
    searchQueries.push(cleanWord);
  }

  // Search Wikipedia with offset
  for (const q of searchQueries) {
    if (candidatesMap.size >= 4) break;
    const wikiResults = await searchWikipediaPages(q, cleanWord, allTargetTokens, offset);
    for (const match of wikiResults) {
      addCandidate(match);
    }
  }

  // Search Wikimedia Commons with offset if more candidates needed
  if (candidatesMap.size < 3 && searchQueries.length > 0) {
    for (const q of searchQueries) {
      if (candidatesMap.size >= 3) break;
      const commonsResults = await searchWikimediaCommons(q, cleanWord, allTargetTokens, offset);
      for (const match of commonsResults) {
        addCandidate(match);
      }
    }
  }

  // Sort candidates by score descending
  const sortedMatches = Array.from(candidatesMap.values()).sort((a, b) => b.score - a.score);

  if (sortedMatches.length > 0) {
    return {
      imageUrl: sortedMatches[0].imageUrl,
      candidates: sortedMatches.map((m) => m.imageUrl).slice(0, 3),
      source: sortedMatches[0].source || "Wikipedia Curated",
      title: sortedMatches[0].title,
    };
  }

  // Fallback image
  const fallbackUrl =
    "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80";

  return {
    imageUrl: fallbackUrl,
    candidates: [fallbackUrl],
    source: "Educational Library",
  };
}
