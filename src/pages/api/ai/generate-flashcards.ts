import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
import { AIConfig, callOpenAI, callAnthropic, callGemini, callOllama } from "@/lib/ai";
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

  // 1. Check user AI settings
  let userConfig: AIConfig = {};
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    });
    if (user?.settings) {
      const s = JSON.parse(user.settings);
      const provider = s.aiProvider || "openai";
      userConfig = {
        provider,
        openaiKey: s.openaiKey || process.env.OPENAI_API_KEY || "",
        anthropicKey: s.anthropicKey || process.env.ANTHROPIC_API_KEY || "",
        geminiKey: s.geminiKey || process.env.GEMINI_API_KEY || "",
        ollamaUrl: s.ollamaUrl || "http://localhost:11434",
        ollamaModel: s.ollamaModel || "llama3",
        openaiModel: s.openaiModel || "gpt-3.5-turbo",
        anthropicModel: s.anthropicModel || "claude-3-haiku-20240307",
        geminiModel: s.geminiModel || "gemini-1.5-flash",
      };
    }
  } catch {
    // continue
  }

  const hasApiKey = Boolean(
    (userConfig.provider === "openai" && (userConfig.openaiKey || process.env.OPENAI_API_KEY)) ||
      (userConfig.provider === "anthropic" && (userConfig.anthropicKey || process.env.ANTHROPIC_API_KEY)) ||
      (userConfig.provider === "gemini" && (userConfig.geminiKey || process.env.GEMINI_API_KEY)) ||
      userConfig.provider === "ollama"
  );

  // 2. If AI provider is available, use LLM to generate rich flashcards
  if (hasApiKey) {
    try {
      const targetLang = req.body.targetLanguage || req.body.language || "English";
      const systemPrompt = `You are an expert ${targetLang} language teacher. Generate ${numCards} complete, high-quality flashcard(s) for the topic or vocabulary: "${cleanPrompt}".
Format your response ONLY as a JSON array of objects with the exact schema:
[
  {
    "front": "Word or idiom in ${targetLang}",
    "back": "Clear definition and explanation (explained for language learners)",
    "phonetic": "/phonetic transcription or reading/",
    "partOfSpeech": "noun | verb | adjective | idiom | phrasal verb",
    "example": "A realistic example sentence in ${targetLang} illustrating how the word is used in context.",
    "imageSearchQuery": "A concrete 2-4 word visual query in English describing what this meaning looks like (e.g. for cat: 'cat animal', for agree: 'handshake agreement')",
    "tags": ["category"]
  }
]
Do not include any conversational text or markdown formatting. Output raw valid JSON only.`;

      let rawResponse = "";
      if (userConfig.provider === "anthropic") {
        rawResponse = await callAnthropic(systemPrompt, userConfig);
      } else if (userConfig.provider === "gemini") {
        rawResponse = await callGemini(systemPrompt, userConfig);
      } else if (userConfig.provider === "ollama") {
        rawResponse = await callOllama(systemPrompt, userConfig);
      } else {
        rawResponse = await callOpenAI(systemPrompt, userConfig);
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

      return res.status(200).json({ cards: enrichedCards });
    } catch (err) {
      console.warn("LLM generation failed, falling back to dictionary lookup:", err);
    }
  }

  // 3. Fallback: Free Dictionary & Image Engine
  // Split prompt if comma-separated words (e.g. "reluctant, resilient")
  const words = cleanPrompt.includes(",")
    ? cleanPrompt.split(",").map((w) => w.trim()).filter(Boolean)
    : [cleanPrompt];

  const results: GeneratedFlashcard[] = [];

  for (const word of words.slice(0, numCards)) {
    const card = await lookupDictionaryWord(word);
    if (card) {
      results.push(card);
    } else {
      // If not in dictionary, generate a clean draft
      const imageResult = await resolveSemanticImage(word);
      results.push({
        front: word,
        back: `Definition of "${word}"`,
        partOfSpeech: "vocabulary",
        example: `An example sentence with ${word}.`,
        imageUrl: imageResult.imageUrl,
        tags: ["vocabulary"],
      });
    }
  }

  return res.status(200).json({ cards: results });
}
