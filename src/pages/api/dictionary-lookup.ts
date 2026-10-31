import { NextApiRequest, NextApiResponse } from "next";
import { getLanguage } from "@/lib/languages";

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
  const langCode = ((req.method === "POST" ? req.body.lang : req.query.lang) || "en") as string;

  if (!word || typeof word !== "string" || !word.trim()) {
    return res.status(400).json({ message: "word parameter is required" });
  }

  const cleanWord = word.trim();
  const lowerWord = cleanWord.toLowerCase();
  const langInfo = getLanguage(langCode);

  // 1. If English, first try FreeDictionaryAPI
  if (langInfo.code === "en") {
    try {
      const apiRes = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lowerWord)}`
      );

      if (apiRes.ok) {
        const data = await apiRes.json();
        if (Array.isArray(data) && data.length > 0) {
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
                          .filter((s) => typeof s === "string" && s.toLowerCase() !== lowerWord)
                          .slice(0, 4),
                      });
                    }
                  }
                }
              }
            }
          }

          if (definitions.length > 0) {
            const first = definitions[0];
            return res.status(200).json({
              word: entry.word || cleanWord,
              phonetic,
              audio,
              partOfSpeech: first.partOfSpeech,
              definition: first.definition,
              example: first.example || "",
              synonyms: first.synonyms || [],
              definitions,
              language: "en",
            });
          }
        }
      }
    } catch {
      // fallback to multilingual sources
    }
  }

  // 2. Multilingual Wikipedia Summary (works in es, fr, de, it, ja, zh, ru, pt, etc.)
  try {
    const wikiLang = ["en", "es", "fr", "de", "it", "pt", "ja", "zh", "ru", "ko", "ar"].includes(langInfo.code)
      ? langInfo.code
      : "en";

    const wikiRes = await fetch(
      `https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanWord)}`,
      { headers: { "User-Agent": "FlashguageApp/1.0 (educational language flashcards)" } }
    );

    if (wikiRes.ok) {
      const wiki = await wikiRes.json();
      if (wiki.extract && !wiki.extract.toLowerCase().includes("may refer to")) {
        const sentences = wiki.extract.split(". ");
        const firstDef = sentences[0] + (sentences[0].endsWith(".") ? "" : ".");
        const example = sentences[1] ? sentences[1] + (sentences[1].endsWith(".") ? "" : ".") : undefined;

        const defItem: WordDefinitionItem = {
          id: `wiki-0`,
          partOfSpeech: "noun",
          definition: wiki.description || firstDef,
          example,
        };

        const definitions: WordDefinitionItem[] = [defItem];
        if (wiki.description && wiki.description !== firstDef) {
          definitions.push({
            id: `wiki-1`,
            partOfSpeech: "definition",
            definition: firstDef,
            example,
          });
        }

        return res.status(200).json({
          word: wiki.title || cleanWord,
          phonetic: "",
          audio: "",
          partOfSpeech: "noun",
          definition: defItem.definition,
          example: defItem.example || "",
          synonyms: [],
          definitions,
          language: langInfo.code,
        });
      }
    }
  } catch {
    // continue to fallback
  }

  // 3. Fallback: Return clean generic structured item ready for editing/saving
  const genericItem: WordDefinitionItem = {
    id: "custom-0",
    partOfSpeech: "term",
    definition: `Vocabulary entry in ${langInfo.name}. Add your translation or definition.`,
    example: "",
    synonyms: [],
  };

  return res.status(200).json({
    word: cleanWord,
    phonetic: "",
    audio: "",
    partOfSpeech: "term",
    definition: genericItem.definition,
    example: "",
    synonyms: [],
    definitions: [genericItem],
    language: langInfo.code,
  });
}
