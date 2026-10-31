import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
import { generateDefinition, AIConfig } from "@/lib/ai";
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
  const forceAi = (req.method === "POST" ? req.body.forceAi : req.query.forceAi) === "true" || (req.method === "POST" ? req.body.forceAi : false) === true;

  if (!word || typeof word !== "string" || !word.trim()) {
    return res.status(400).json({ message: "word parameter is required" });
  }

  const cleanWord = word.trim();
  const lowerWord = cleanWord.toLowerCase();
  const langInfo = getLanguage(langCode);

  // Helper function to query user or system AI
  async function queryAiDefinition(): Promise<WordDefinitionItem[] | null> {
    try {
      const session = await getServerSession(req, res, authOptions);
      let userConfig: AIConfig = {};

      if (session?.user?.id) {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { settings: true },
        });
        if (user?.settings) {
          try {
            const s = JSON.parse(user.settings);
            const provider = (s.aiProvider as string) || "gemini";
            const apiKey =
              (s.aiApiKey as string) || s.geminiKey || s.openaiKey || s.anthropicKey || process.env.GEMINI_API_KEY || "";
            userConfig = {
              provider: provider as any,
              apiKey,
              model: (s.aiModel as string) || s.geminiModel || s.openaiModel || "gemini-3.1-flash-lite",
              geminiKey: s.geminiKey || process.env.GEMINI_API_KEY || "",
              openaiKey: s.openaiKey || process.env.OPENAI_API_KEY || "",
              anthropicKey: s.anthropicKey || process.env.ANTHROPIC_API_KEY || "",
              geminiModel: (s.geminiModel as string) || "gemini-3.1-flash-lite",
              ollamaUrl: s.ollamaUrl || "",
              ollamaModel: s.ollamaModel || "",
            };
          } catch {
            // ignore
          }
        }
      }

      // If user has not configured personal keys, use server Gemini default
      if (!userConfig.apiKey && process.env.GEMINI_API_KEY) {
        userConfig.provider = "gemini";
        userConfig.geminiKey = process.env.GEMINI_API_KEY;
        userConfig.apiKey = process.env.GEMINI_API_KEY;
        userConfig.geminiModel = "gemini-3.1-flash-lite";
      }

      // Check if user has an AI key or if environment has an API key
      const hasAi =
        Boolean(userConfig.apiKey) ||
        Boolean(process.env.GEMINI_API_KEY) ||
        Boolean(process.env.OPENAI_API_KEY) ||
        Boolean(process.env.ANTHROPIC_API_KEY);

      if (hasAi) {
        const result = await generateDefinition(
          cleanWord,
          cleanWord.includes(" ")
            ? "This is an English idiom, phrasal verb, expression, or colloquialism. Explain its idiomatic meaning clearly."
            : undefined,
          userConfig,
          langInfo.name
        );

        if (result && result.definition && result.definition.length > 5) {
          const isPhrase = cleanWord.includes(" ");
          const pos = result.partOfSpeech || (isPhrase ? "idiom / phrase" : "vocabulary");
          return [
            {
              id: "ai-def-0",
              partOfSpeech: pos,
              definition: result.definition,
              example: result.example || undefined,
              synonyms: [],
            },
          ];
        }
      }
    } catch (err) {
      console.warn("AI idiom lookup fallback warning:", err);
    }
    return null;
  }

  // If forceAi is requested, directly run AI explanation
  if (forceAi) {
    const aiDefs = await queryAiDefinition();
    if (aiDefs && aiDefs.length > 0) {
      return res.status(200).json({
        word: cleanWord,
        phonetic: "",
        audio: "",
        partOfSpeech: aiDefs[0].partOfSpeech,
        definition: aiDefs[0].definition,
        example: aiDefs[0].example || "",
        synonyms: [],
        definitions: aiDefs,
        language: langInfo.code,
        source: "AI Explanation",
      });
    }
  }

  // 1. If English single-word, first try FreeDictionaryAPI
  if (langInfo.code === "en" && !cleanWord.includes(" ")) {
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
              source: "Dictionary",
            });
          }
        }
      }
    } catch {
      // fallback
    }
  }

  // 2. Wiktionary API (Specialized for Idioms, Phrasal Verbs, Expressions, Slang & Colloquialisms)
  try {
    const wikiKey = lowerWord.replace(/\s+/g, "_");
    const wiktRes = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(wikiKey)}`,
      { headers: { "User-Agent": "FlashguageApp/1.0 (educational language flashcards)" } }
    );

    if (wiktRes.ok) {
      const wiktData = await wiktRes.json();
      const entries = wiktData[langInfo.code] || wiktData["en"];
      if (Array.isArray(entries) && entries.length > 0) {
        const definitions: WordDefinitionItem[] = [];

        for (const block of entries) {
          const rawPos = (block.partOfSpeech || "idiom").toLowerCase();
          const pos =
            cleanWord.includes(" ") && ["verb", "noun", "adverb"].includes(rawPos)
              ? `idiom / ${rawPos}`
              : rawPos;

          for (const d of block.definitions || []) {
            const cleanDef = d.definition
              ?.replace(/<[^>]+>/g, "")
              ?.replace(/\s+/g, " ")
              ?.trim();
            if (!cleanDef || cleanDef.length < 3) continue;

            // Extract authentic example if available
            const example =
              d.examples && d.examples.length > 0
                ? d.examples[0].replace(/<[^>]+>/g, "").trim()
                : undefined;

            definitions.push({
              id: `wiktionary-${definitions.length}`,
              partOfSpeech: pos,
              definition: cleanDef,
              example,
              synonyms: [],
            });
          }
        }

        if (definitions.length > 0) {
          const first = definitions[0];
          return res.status(200).json({
            word: cleanWord,
            phonetic: "",
            audio: "",
            partOfSpeech: first.partOfSpeech,
            definition: first.definition,
            example: first.example || "",
            synonyms: [],
            definitions,
            language: langInfo.code,
            source: "Wiktionary Idioms & Expressions",
          });
        }
      }
    }
  } catch {
    // continue
  }

  // 3. AI Assistance Fallback for Slang, Modern Idioms & Expressions
  const aiDefs = await queryAiDefinition();
  if (aiDefs && aiDefs.length > 0) {
    return res.status(200).json({
      word: cleanWord,
      phonetic: "",
      audio: "",
      partOfSpeech: aiDefs[0].partOfSpeech,
      definition: aiDefs[0].definition,
      example: aiDefs[0].example || "",
      synonyms: [],
      definitions: aiDefs,
      language: langInfo.code,
      source: "AI Assistant",
    });
  }

  // 4. Multilingual Wikipedia Summary (works in es, fr, de, it, ja, zh, ru, pt, etc.)
  try {
    const wikiLang = ["en", "es", "fr", "de", "it", "pt", "ja", "zh", "ru", "ko", "ar"].includes(
      langInfo.code
    )
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
          partOfSpeech: cleanWord.includes(" ") ? "idiom / phrase" : "noun",
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
          partOfSpeech: defItem.partOfSpeech,
          definition: defItem.definition,
          example: defItem.example || "",
          synonyms: [],
          definitions,
          language: langInfo.code,
          source: "Wikipedia",
        });
      }
    }
  } catch {
    // continue
  }

  // 5. If not found in any dictionary or source, return 404 with notFound flag
  return res.status(404).json({
    notFound: true,
    message: `No dictionary definitions found for "${cleanWord}". Try AI generation or manual entry.`,
    word: cleanWord,
    definitions: [],
  });
}
