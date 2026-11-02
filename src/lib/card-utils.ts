/**
 * Utility functions and DTOs for Card media, tags, and formatting.
 * Eliminates repetitive JSON.parse boilerplate and normalizes schema differences.
 */

export interface CardMedia {
  imageUrl?: string;
  image?: string;
  phonetic?: string;
  partOfSpeech?: string;
  examples: string[];
  example?: string;
  source?: string;
}

export interface CardDTO {
  id: string;
  deckId: string;
  front: string;
  back: string;
  tags: string[];
  media: CardMedia;
  source?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Parses raw JSON string from SQLite Card.media into a normalized CardMedia object.
 * Transparently supports both legacy and modern field names (image vs imageUrl, example vs examples).
 */
export function parseCardMedia(mediaStr?: string | null): CardMedia {
  if (!mediaStr) {
    return { examples: [] };
  }

  try {
    const raw = typeof mediaStr === "string" ? JSON.parse(mediaStr) : mediaStr;
    if (!raw || typeof raw !== "object") return { examples: [] };

    // Normalize image URL
    const imageUrl = (raw.imageUrl || raw.image || "").trim() || undefined;

    // Normalize examples to a clean string array
    let examples: string[] = [];
    if (Array.isArray(raw.examples)) {
      examples = raw.examples.map((s: unknown) => String(s).trim()).filter(Boolean);
    } else if (typeof raw.examples === "string" && raw.examples.trim()) {
      examples = [raw.examples.trim()];
    } else if (typeof raw.example === "string" && raw.example.trim()) {
      examples = [raw.example.trim()];
    }

    return {
      imageUrl,
      image: imageUrl, // backwards compatibility
      phonetic: (raw.phonetic || "").trim() || undefined,
      partOfSpeech: (raw.partOfSpeech || "").trim().toLowerCase() || undefined,
      examples,
      example: examples[0] || undefined, // backwards compatibility
      source: raw.source || undefined,
    };
  } catch {
    return { examples: [] };
  }
}

/**
 * Parses raw JSON string from SQLite Card.tags into a clean string array.
 */
export function parseCardTags(tagsStr?: string | null): string[] {
  if (!tagsStr) return [];
  if (tagsStr === "[]") return [];

  try {
    const parsed = JSON.parse(tagsStr);
    if (Array.isArray(parsed)) {
      return parsed.map((t) => String(t).trim()).filter(Boolean);
    }
    if (typeof parsed === "string") {
      return parsed.split(",").map((t) => t.trim()).filter(Boolean);
    }
    return [];
  } catch {
    return typeof tagsStr === "string"
      ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
      : [];
  }
}

/**
 * Serializes CardMedia into a standardized JSON string for SQLite storage.
 */
export function formatCardMedia(media: {
  imageUrl?: string;
  phonetic?: string;
  partOfSpeech?: string;
  examples?: string[] | string;
  source?: string;
}): string | null {
  const mediaObj: Record<string, unknown> = {};

  if (media.imageUrl && media.imageUrl.trim()) {
    const url = media.imageUrl.trim();
    mediaObj.imageUrl = url;
    mediaObj.image = url; // dual support
  }

  if (media.phonetic && media.phonetic.trim()) {
    mediaObj.phonetic = media.phonetic.trim();
  }

  if (media.partOfSpeech && media.partOfSpeech.trim()) {
    mediaObj.partOfSpeech = media.partOfSpeech.trim().toLowerCase();
  }

  if (media.examples) {
    const list = Array.isArray(media.examples)
      ? media.examples.map((s) => s.trim()).filter(Boolean)
      : media.examples.split("\n").map((s) => s.trim()).filter(Boolean);

    if (list.length > 0) {
      mediaObj.examples = list;
      mediaObj.example = list[0];
    }
  }

  if (media.source) {
    mediaObj.source = media.source;
  }

  return Object.keys(mediaObj).length > 0 ? JSON.stringify(mediaObj) : null;
}

/**
 * Maps a raw Prisma Card record to a clean, strongly-typed CardDTO.
 */
export function toCardDTO(card: {
  id: string;
  deckId: string;
  front: string;
  back: string;
  tags?: string;
  media?: string | null;
  source?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}): CardDTO {
  return {
    id: card.id,
    deckId: card.deckId,
    front: card.front,
    back: card.back,
    tags: parseCardTags(card.tags),
    media: parseCardMedia(card.media),
    source: card.source,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}
