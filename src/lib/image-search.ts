const STOP_WORDS = new Set([
  "a", "an", "the", "of", "in", "to", "for", "with", "on", "at", "from", "by", "about",
  "as", "into", "like", "through", "after", "over", "between", "out", "against", "during",
  "without", "before", "under", "around", "among", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "or", "and", "not", "no", "but", "if",
  "so", "than", "too", "very", "can", "will", "just", "should", "now", "used", "relating",
  "someone", "something", "make", "made", "such", "term", "referring", "refers", "defined",
  "meaning", "means", "particular", "equal", "certain", "typically", "often", "especially",
  "usually", "noun", "verb", "adjective", "adverb", "pronoun", "example", "definition",
  "expressing", "expresses", "state", "manner", "quality", "act", "action", "feeling",
  "formal", "informal", "slang", "phrase", "idiom", "interjection", "person", "people"
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
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
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

  // Reject SVG, PDF, DJVU, WEBM, OGG, TIFF
  if (/\.svg($|\.|\/|\?)/i.test(url) || /\.pdf($|\.|\/|\?)/i.test(url) || /\.djvu($|\.|\/|\?)/i.test(url)) {
    return true;
  }
  if (/\.(webm|ogg|tif|tiff)($|\?)/i.test(url)) {
    return true;
  }

  // Reject document scans, book covers, coats of arms, road signs, flags
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
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const CURATED_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80", // Digital communication
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=600&q=80", // Workspace / Focus
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80", // Notebook / Learning
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80", // Journey / Exploration
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80", // Action / Emotion
  "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80", // Books / Study
];

/**
 * High-Speed Web Image Search using Bing Image Search Engine
 * Retrieves vibrant, realistic photographs, memes, illustrations, and contextual visuals for any word, idiom, or phrase.
 */
async function searchBingImages(
  query: string,
  targetTokens: Set<string>,
  first: number = 1
): Promise<SemanticImageMatch[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=${first}&form=HDRSC2`;
    const res = await fetch(url, {
      headers: API_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const html = await res.text();

    const regex =
      /\{&quot;sid&quot;:.*?&quot;murl&quot;:&quot;([^&]+)&quot;.*?&quot;turl&quot;:&quot;([^&]+(?:&amp;[^&]+)*)&quot;.*?&quot;t&quot;:&quot;([^&]*)&quot;.*?\}/g;

    const matches: SemanticImageMatch[] = [];
    const seen = new Set<string>();
    let match;

    while ((match = regex.exec(html)) !== null) {
      let murl = match[1];
      const title = match[3] || "";

      if (!murl || typeof murl !== "string") continue;
      murl = murl.replace(/\\/g, "");
      if (!/^https?:\/\//i.test(murl)) continue;
      if (isJunkImage(title, murl)) continue;

      const canonicalKey = getMediaCanonicalKey(murl);
      if (seen.has(canonicalKey)) continue;
      seen.add(canonicalKey);

      const titleTokens = new Set(extractKeywords(title));
      let overlap = 0;
      for (const t of targetTokens) {
        if (titleTokens.has(t)) overlap++;
      }

      // Base score with bonus for semantic overlap with definition/word
      const score = 85 - matches.length * 2 + overlap * 20;

      matches.push({
        imageUrl: murl,
        title,
        source: "Web Search",
        score,
      });

      if (matches.length >= 24) break;
    }

    return matches;
  } catch {
    return [];
  }
}

/**
 * Direct Wikipedia Summary check
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

    const isExactWord = title.toLowerCase() === word.trim().toLowerCase();
    const score = (isExactWord ? 65 : 35) + overlap * 25;

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

      let score = 40 + overlap * 25;
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
 * Wikimedia Commons Search with bitmap filter
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
      `filetype:bitmap ${query}`
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

      let score = 35 + overlap * 25;
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
 * Universal Multi-Source Semantic Image Resolver
 * Evaluates the word, definition, and visual queries to retrieve
 * high-quality photography, memes, and illustrations from web search, Wikipedia, and Wikimedia without duplicates.
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

  // Pagination indexing
  const bingFirst = Math.floor((page * 3) / 20) * 20 + 1;
  const sliceStart = (page * 3) % 20;

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

  // Build prioritized query variations
  const searchQueries: string[] = [];

  // Priority 1: Visual query if specified
  if (visualQuery && visualQuery.trim()) {
    searchQueries.push(visualQuery.trim());
  }

  // Priority 2: Word combined with key definition concept (e.g. "begone go away")
  if (cleanWord && kwList.length > 0) {
    const actionWords = kwList.filter((k) => !["desire", "command"].includes(k));
    const conceptWords = actionWords.length > 0 ? actionWords.slice(-2) : kwList.slice(0, 2);
    searchQueries.push(`${cleanWord} ${conceptWords.join(" ")}`);
  }

  // Priority 3: The exact word/expression
  if (cleanWord) {
    searchQueries.push(cleanWord);
  }

  // Priority 4: Definition keywords alone
  if (kwList.length > 0) {
    searchQueries.push(kwList.slice(0, 3).join(" "));
  }

  // Step 1: Web Photography & Visual Search via Bing (High quality, rich variety)
  for (const q of searchQueries) {
    if (candidatesMap.size >= 24) break;
    const webMatches = await searchBingImages(q, allTargetTokens, bingFirst);
    for (const match of webMatches) {
      addCandidate(match);
    }
  }

  // Step 2: Direct Wikipedia Lead photo (on page 0)
  if (page === 0 && cleanWord && candidatesMap.size < 4) {
    const summaryMatch = await fetchWikipediaSummary(cleanWord, allTargetTokens);
    if (summaryMatch) {
      addCandidate(summaryMatch);
    }
  }

  // Step 3: Wikipedia & Wikimedia Commons search
  if (candidatesMap.size < 4 && searchQueries.length > 0) {
    const wikiOffset = page * 3;
    for (const q of searchQueries) {
      if (candidatesMap.size >= 6) break;
      const wikiResults = await searchWikipediaPages(q, cleanWord, allTargetTokens, wikiOffset);
      for (const match of wikiResults) {
        addCandidate(match);
      }

      if (candidatesMap.size < 4) {
        const commonsResults = await searchWikimediaCommons(q, cleanWord, allTargetTokens, wikiOffset);
        for (const match of commonsResults) {
          addCandidate(match);
        }
      }
    }
  }

  // Sort candidates by score descending
  const allMatches = Array.from(candidatesMap.values()).sort((a, b) => b.score - a.score);

  if (allMatches.length > 0) {
    const pageSlice = allMatches.slice(sliceStart, sliceStart + 3);
    const selectedMatches = pageSlice.length > 0 ? pageSlice : allMatches.slice(0, 3);
    const selectedCandidates = selectedMatches.map((m) => m.imageUrl);

    return {
      imageUrl: selectedCandidates[0],
      candidates: selectedCandidates,
      source: selectedMatches[0].source || "Web Search",
      title: selectedMatches[0].title,
    };
  }

  // Varied fallbacks from curated library
  const fallbackOffset = (page * 3) % CURATED_FALLBACK_IMAGES.length;
  const fallbacks = [
    CURATED_FALLBACK_IMAGES[fallbackOffset],
    CURATED_FALLBACK_IMAGES[(fallbackOffset + 1) % CURATED_FALLBACK_IMAGES.length],
    CURATED_FALLBACK_IMAGES[(fallbackOffset + 2) % CURATED_FALLBACK_IMAGES.length],
  ];

  return {
    imageUrl: fallbacks[0],
    candidates: fallbacks,
    source: "Educational Library",
  };
}
