import { NextApiRequest, NextApiResponse } from "next";
import { BUILTIN_WORDS, CURATED_DICTIONARIES, WordDefinition } from "@/lib/dictionaries";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { search, letter, category, type } = req.query;

  // If requesting curated deck dictionaries (packs)
  if (type === "packs") {
    let results = [...CURATED_DICTIONARIES];
    if (typeof search === "string" && search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.author.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (typeof category === "string" && category.trim() && category !== "All") {
      results = results.filter((d) => d.category.toLowerCase() === category.toLowerCase());
    }
    return res.status(200).json(results);
  }

  // Real word lookup / dictionary system (Aard2 / AnkiWeb style)
  let words: WordDefinition[] = [...BUILTIN_WORDS];

  if (typeof search === "string" && search.trim()) {
    const q = search.toLowerCase().trim();
    words = words.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.definition.toLowerCase().includes(q) ||
        w.example?.toLowerCase().includes(q) ||
        w.synonyms?.some((s) => s.toLowerCase().includes(q))
    );
  }

  if (typeof letter === "string" && letter.trim() && letter !== "All") {
    const l = letter.toUpperCase().trim();
    words = words.filter((w) => w.word.toUpperCase().startsWith(l));
  }

  if (typeof category === "string" && category.trim() && category !== "All") {
    words = words.filter((w) => w.category?.toLowerCase() === category.toLowerCase());
  }

  // Sort alphabetically by word
  words.sort((a, b) => a.word.localeCompare(b.word));

  return res.status(200).json({
    words,
    total: words.length,
    packs: CURATED_DICTIONARIES,
  });
}
