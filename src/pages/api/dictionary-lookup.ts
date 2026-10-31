import { NextApiRequest, NextApiResponse } from "next";

export interface WordDefinitionItem {
  id: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
  synonyms?: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const word = (req.method === "POST" ? req.body.word : req.query.word) as string | undefined;

  if (!word || typeof word !== "string" || !word.trim()) {
    return res.status(400).json({ message: "word parameter is required" });
  }

  const cleanWord = word.trim().toLowerCase();

  try {
    const apiRes = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`
    );

    if (!apiRes.ok) {
      // Fallback: Check Wikipedia Summary for definition
      try {
        const wikiRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanWord)}`,
          { headers: { "User-Agent": "EnglishFlashcardsApp/1.0" } }
        );
        if (wikiRes.ok) {
          const wiki = await wikiRes.json();
          if (wiki.extract) {
            const defItem: WordDefinitionItem = {
              id: "wiki-0",
              partOfSpeech: "noun",
              definition: wiki.description || wiki.extract.split(".")[0] + ".",
              example: wiki.extract.split(".")[1] ? wiki.extract.split(".")[1].trim() + "." : undefined,
            };
            return res.status(200).json({
              word: wiki.title || cleanWord,
              phonetic: "",
              audio: "",
              partOfSpeech: "noun",
              definition: defItem.definition,
              example: defItem.example || "",
              synonyms: [],
              definitions: [defItem],
            });
          }
        }
      } catch {
        // continue
      }

      return res.status(404).json({ message: `No definition found for "${cleanWord}"` });
    }

    const data = await apiRes.json();
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ message: `No definition found for "${cleanWord}"` });
    }

    const entry = data[0];
    const phonetic = entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text || "";
    const audio = entry.phonetics?.find((p: any) => p.audio && p.audio.length > 0)?.audio || "";

    const definitions: WordDefinitionItem[] = [];

    for (const entryItem of data) {
      if (entryItem.meanings && Array.isArray(entryItem.meanings)) {
        for (const m of entryItem.meanings) {
          const pos = m.partOfSpeech || "noun";
          const topSynonyms = m.synonyms || [];
          for (const d of m.definitions || []) {
            if (d.definition && typeof d.definition === "string") {
              const defText = d.definition.trim();
              if (defText) {
                definitions.push({
                  id: `${pos}-${definitions.length}`,
                  partOfSpeech: pos,
                  definition: defText,
                  example: d.example?.trim() || undefined,
                  synonyms: Array.from(new Set([...(d.synonyms || []), ...topSynonyms]))
                    .filter((s) => typeof s === "string" && s.toLowerCase() !== cleanWord)
                    .slice(0, 4),
                });
              }
            }
          }
        }
      }
    }

    // Deduplicate definitions with identical text
    const seen = new Set<string>();
    const uniqueDefinitions = definitions.filter((d) => {
      const key = `${d.partOfSpeech}:${d.definition.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const primary = uniqueDefinitions[0] || {
      id: "def-0",
      partOfSpeech: "noun",
      definition: `Definition of ${cleanWord}`,
      example: "",
      synonyms: [],
    };

    return res.status(200).json({
      word: entry.word || cleanWord,
      phonetic,
      audio,
      partOfSpeech: primary.partOfSpeech,
      definition: primary.definition,
      example: primary.example || "",
      synonyms: primary.synonyms || [],
      definitions: uniqueDefinitions,
    });
  } catch (error) {
    console.error("Dictionary lookup error:", error);
    return res.status(500).json({ message: "Dictionary lookup failed" });
  }
}
