import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
import { AIConfig, AIProvider, callOpenAI, callAnthropic, callGemini, callOllama, callCustom, generateDefinition } from "@/lib/ai";
import { resolveSemanticImage } from "@/lib/image-search";

export interface GeneratedFlashcard {
  front: string;
  back: string;
  phonetic?: string;
  partOfSpeech?: string;
  example?: string;
  examples?: string[];
  imageUrl?: string;
  tags?: string[];
}

// Extract clean sentences containing the word
function extractSentencesForWord(text: string, word: string): string[] {
  if (!text || !word) return [];
  const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return text
    .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 220 && regex.test(s));
}

function generateFallbackSentence(word: string, partOfSpeech: string = "noun"): string {
  const clean = word.trim();
  const pos = partOfSpeech.toLowerCase();
  if (pos.includes("verb")) {
    return `In practical situations, people often ${clean} to overcome challenges.`;
  }
  if (pos.includes("adj")) {
    return `She gave a very ${clean} explanation that helped everyone understand.`;
  }
  if (pos.includes("adv")) {
    return `The presenter spoke ${clean} so the audience stayed fully engaged.`;
  }
  if (pos.includes("idiom") || pos.includes("phrase")) {
    return `When facing the dilemma, they agreed to ${clean} for the best outcome.`;
  }
  return `The ${clean} caught everyone's attention with its distinctive presence.`;
}

// Helper to look up free dictionary with rich context fallback
async function lookupDictionaryWord(word: string): Promise<GeneratedFlashcard | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim().toLowerCase())}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    const phonetic = entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text || "";
    const meaning = entry.meanings?.[0];
    const partOfSpeech = meaning?.partOfSpeech || "noun";
    const defObj = meaning?.definitions?.[0];
    const definition = defObj?.definition || `Definition of ${word}`;

    // Collect all examples across all meanings
    const collectedExamples: string[] = [];
    if (entry.meanings?.length > 0) {
      for (const m of entry.meanings) {
        for (const d of m.definitions || []) {
          if (d.example && typeof d.example === "string") {
            collectedExamples.push(d.example.trim());
          }
        }
      }
    }

    // If no examples in dictionary, check Wikipedia summary
    if (collectedExamples.length === 0) {
      try {
        const wikiRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`,
          { headers: { "User-Agent": "FlashguageApp/1.0" } }
        );
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          if (wikiData.extract) {
            const wikiSentences = extractSentencesForWord(wikiData.extract, word);
            collectedExamples.push(...wikiSentences);
          }
        }
      } catch {
        // continue
      }
    }

    // If still none, use contextual generator
    if (collectedExamples.length === 0) {
      collectedExamples.push(generateFallbackSentence(word, partOfSpeech));
    }

    const uniqueExamples = Array.from(new Set(collectedExamples)).slice(0, 3);
    const imageResult = await resolveSemanticImage(entry.word || word, definition);
    const imageUrl = imageResult.imageUrl;

    return {
      front: entry.word || word,
      back: definition,
      phonetic,
      partOfSpeech,
      example: uniqueExamples[0],
      examples: uniqueExamples,
      imageUrl,
      tags: [partOfSpeech],
    };
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { prompt, count = 1 } = req.body as { prompt?: string; count?: number };
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ message: "prompt is required" });
  }

  const cleanPrompt = prompt.trim();
  const numCards = Math.min(Math.max(1, Number(count) || 1), 5);

  // 1. Check user AI settings (strictly user's personal keys)
  let userConfig: AIConfig = {};
  let hasApiKey = false;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    });
    if (user?.settings) {
      const s = JSON.parse(user.settings);
      const provider = (s.aiProvider as AIProvider) || "gemini";
      let personalKey = "";
      if (provider === "gemini") personalKey = (s.geminiKey || s.aiApiKey || "").trim();
      else if (provider === "openai") personalKey = (s.openaiKey || s.aiApiKey || "").trim();
      else if (provider === "anthropic") personalKey = (s.anthropicKey || s.aiApiKey || "").trim();
      else if (provider === "custom") personalKey = (s.customApiKey || s.aiApiKey || "").trim();
      else if (provider === "ollama") personalKey = "ollama-local";

      if (personalKey) {
        hasApiKey = true;
      }

      userConfig = {
        provider,
        apiKey: personalKey,
        geminiKey: (s.geminiKey || "").trim(),
        openaiKey: (s.openaiKey || "").trim(),
        anthropicKey: (s.anthropicKey || "").trim(),
        customApiKey: (s.customApiKey || "").trim(),
        customBaseUrl: (s.customBaseUrl || "").trim(),
        customModel: (s.customModel || "").trim(),
        ollamaUrl: (s.ollamaUrl as string) || "http://localhost:11434",
        ollamaModel: (s.ollamaModel as string) || "llama3",
        openaiModel: s.openaiModel || "gpt-4o-mini",
        anthropicModel: s.anthropicModel || "claude-3-5-haiku-latest",
        geminiModel: (s.geminiModel as string) || "gemini-3.1-flash-lite",
      };
    }
  } catch {
    // continue
  }

  // 2. If user configured an AI provider with their own key, use LLM to generate rich flashcards
  if (hasApiKey) {
    try {
      const targetLang = req.body.targetLanguage || req.body.language || "English";
      const systemPrompt = `You are an expert ${targetLang} language teacher designing study flashcards for spaced-repetition active recall practice. Generate ${numCards} complete, high-quality flashcard(s) for the topic, phrase, or vocabulary: "${cleanPrompt}".
Even if the term is a compound metaphor, invented phrase, idiom, or slang, provide an insightful, educational definition and a realistic example sentence illustrating how it is used.

CRITICAL FLASHCARD RULES FOR ACTIVE RECALL PRACTICE:
1. "front": Word or idiom in ${targetLang}.
2. "back": Clear, insightful explanation of the meaning. ANTI-SPOILER RULE: NEVER include the front word "${cleanPrompt}" or its direct derivatives/roots in the back definition, so the user can test their recall without giving away the answer.
3. "phonetic": Accurate phonetic transcription or IPA.
4. "partOfSpeech": Grammatical category (noun, verb, adjective, idiom, phrasal verb, etc.).
5. "example": A modern, authentic, and vivid example sentence in ${targetLang} showing natural everyday, conversational, or professional usage (avoid strange, archaic, or bizarre sentences).
6. "imageSearchQuery": A concrete 2-4 word visual query in English describing what this concept looks like.
7. "tags": Category tags.

Format your response ONLY as a JSON array of objects with the exact schema:
[
  {
    "front": "Word or idiom in ${targetLang}",
    "back": "Clear definition strictly avoiding the word '${cleanPrompt}'",
    "phonetic": "/phonetic transcription or reading/",
    "partOfSpeech": "noun | verb | adjective | idiom | phrasal verb | phrase",
    "example": "A modern, natural example sentence in ${targetLang} showing how it is used in context.",
    "imageSearchQuery": "A concrete 2-4 word visual query in English describing what this concept looks like",
    "tags": ["category"]
  }
]
Do not include any conversational text or markdown formatting. Output raw valid JSON only.`;

      let rawResponse = "";
      if (userConfig.provider === "anthropic" && userConfig.anthropicKey) {
        rawResponse = await callAnthropic(systemPrompt, userConfig);
      } else if (userConfig.provider === "openai" && userConfig.openaiKey) {
        rawResponse = await callOpenAI(systemPrompt, userConfig);
      } else if (userConfig.provider === "ollama") {
        rawResponse = await callOllama(systemPrompt, userConfig);
      } else if (userConfig.provider === "custom" && userConfig.customBaseUrl) {
        rawResponse = await callCustom(systemPrompt, userConfig);
      } else {
        userConfig.provider = "gemini";
        rawResponse = await callGemini(systemPrompt, userConfig);
      }

      // Clean JSON formatting
      const cleanJson = rawResponse
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const parsed: GeneratedFlashcard[] = JSON.parse(cleanJson);

      // Attach real illustrative images in parallel
      const enrichedCards = await Promise.all(
        parsed.map(async (card: any) => {
          const imageResult = await resolveSemanticImage(card.front, card.back, card.imageSearchQuery);
          return {
            ...card,
            imageUrl: imageResult.imageUrl,
          };
        })
      );

      return res.status(200).json({ cards: enrichedCards, hasPersonalAiKey: true });
    } catch (err) {
      console.warn("LLM generation failed, falling back to dictionary lookup:", err);
    }
  }

  // 3. Fallback when user has no AI key: Free Dictionary & Image Engine
  const words = cleanPrompt.includes(",")
    ? cleanPrompt.split(",").map((w) => w.trim()).filter(Boolean)
    : [cleanPrompt];

  const results: GeneratedFlashcard[] = [];

  for (const word of words.slice(0, numCards)) {
    const card = await lookupDictionaryWord(word);
    if (card) {
      results.push(card);
    } else {
      // If not in dictionary and user has no personal AI key, inform them clearly
      return res.status(400).json({
        error: "AI_KEY_REQUIRED",
        requiresAiKey: true,
        message: `"${word}" was not found in standard dictionaries. Please configure your personal AI key (Gemini, OpenAI, Claude) in Settings to analyze novel or colloquial expressions with AI.`,
      });
    }
  }

  return res.status(200).json({
    cards: results,
    requiresAiKey: !hasApiKey,
    sourceNotice: !hasApiKey
      ? "Generated from standard dictionary. Configure your personal AI key in Settings to unlock AI generation."
      : undefined,
  });
}
