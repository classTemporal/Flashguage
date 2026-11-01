import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
import { AIConfig, callOpenAI, callAnthropic, callGemini, callOllama, callCustom } from "@/lib/ai";
import { resolveSemanticImage } from "@/lib/image-search";

// Extract clean sentences from text that mention the keyword
function extractSentencesForWord(text: string, word: string): string[] {
  if (!text || !word) return [];
  const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  const rawSentences = text
    .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 220);

  const matched = rawSentences.filter((s) => regex.test(s));
  return matched;
}

// Convert sentence to cloze format by replacing the target word with a blank
function ensureCloze(sentence: string, word: string): string {
  if (!sentence || !word) return sentence;
  if (sentence.includes("______")) return sentence;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return sentence.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "______");
}

// Fallback example sentence generator if nothing found
function generateFallbackSentence(word: string, partOfSpeech: string = "word"): string {
  const pos = partOfSpeech.toLowerCase();

  if (pos.includes("verb")) {
    return `In everyday situations, people often ______ when facing unexpected challenges.`;
  }
  if (pos.includes("adj")) {
    return `The teacher gave a very ______ explanation that helped everyone understand.`;
  }
  if (pos.includes("adv")) {
    return `She spoke ______ during the interview to make a strong impression.`;
  }
  if (pos.includes("idiom") || pos.includes("phrase")) {
    return `When discussing the problem, they decided to ______ to resolve it quickly.`;
  }
  return `Understanding how to use ______ in conversation will elevate your language fluency.`;
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

  const { word, context } = req.body as { word?: string; context?: string };

  if (!word || typeof word !== "string" || !word.trim()) {
    return res.status(400).json({ message: "Word is required" });
  }

  const cleanWord = word.trim();

  // 1. Check user AI settings
  let userConfig: AIConfig = {};
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    });
    if (user?.settings) {
      const s = JSON.parse(user.settings);
      const provider = s.aiProvider || "gemini";
      userConfig = {
        provider,
        openaiKey: (s.openaiKey || "").trim(),
        anthropicKey: (s.anthropicKey || "").trim(),
        geminiKey: (s.geminiKey || "").trim(),
        ollamaUrl: s.ollamaUrl || "http://localhost:11434",
        ollamaModel: s.ollamaModel || "llama3",
        openaiModel: s.openaiModel || "gpt-4o-mini",
        anthropicModel: s.anthropicModel || "claude-3-5-haiku-latest",
        geminiModel: s.geminiModel || "gemini-3.1-flash-lite",
      };
    }
  } catch {
    // continue
  }

  const hasApiKey = Boolean(
    (userConfig.provider === "openai" && userConfig.openaiKey) ||
      (userConfig.provider === "anthropic" && userConfig.anthropicKey) ||
      (userConfig.provider === "gemini" && userConfig.geminiKey) ||
      userConfig.provider === "ollama"
  );

  // 2. If AI key is configured, use LLM
  if (hasApiKey) {
    try {
      const targetLang = req.body.targetLanguage || req.body.language || "English";
      const prompt = `You are an expert ${targetLang} language teacher designing study flashcards for active recall practice.
Target Word/Phrase: "${cleanWord}"
${context ? `Current definition/meaning context: "${context}"` : ""}

CRITICAL FLASHCARD PEDAGOGY RULES:
1. "definition": Explain the concept clearly, memorably, and concisely for language learners.
   STRICT ANTI-SPOILER RULE: NEVER include the target word "${cleanWord}" or its direct derivatives/roots in the definition. When testing oneself, seeing the word in the definition gives away the answer.
2. "example": A modern, natural fill-in-the-blank practice sentence in ${targetLang} for active recall.
   STRICT CLOZE RULE: Replace the target word "${cleanWord}" (and any inflections) with a blank "______" (six underscores) so the student can guess the missing word from context. Do NOT write the word "${cleanWord}" in the sentence! (e.g. for "name": "I'm sorry, I completely forgot your ______; could you remind me?").
3. "examples": An array of 2 distinct natural practice sentences where "${cleanWord}" is replaced with "______".
4. "phonetic": Accurate IPA transcription or reading.
5. "partOfSpeech": Accurate category (noun | verb | adjective | adverb | idiom | phrasal verb).
6. "imageSearchQuery": A concrete 2-4 word visual query in English describing what this looks like.
7. "tags": Relevant topic/category tags.

Return ONLY a valid JSON object matching this schema:
{
  "definition": "Clear pedagogical definition strictly avoiding the word '${cleanWord}'",
  "example": "A modern practice sentence with '______' instead of '${cleanWord}'",
  "examples": [
    "Practice sentence 1 with '______'",
    "Practice sentence 2 with '______'"
  ],
  "phonetic": "/phonetic transcription or reading/",
  "partOfSpeech": "noun | verb | adjective | adverb | idiom",
  "imageSearchQuery": "A concrete 2-4 word visual query in English describing what this meaning looks like",
  "tags": ["category", "grammar-tag"]
}
Output raw JSON only without markdown fences or additional commentary.`;

      let rawResponse = "";
      if (userConfig.provider === "anthropic" && userConfig.anthropicKey) {
        rawResponse = await callAnthropic(prompt, userConfig);
      } else if (userConfig.provider === "openai" && userConfig.openaiKey) {
        rawResponse = await callOpenAI(prompt, userConfig);
      } else if (userConfig.provider === "ollama") {
        rawResponse = await callOllama(prompt, userConfig);
      } else if (userConfig.provider === "custom" && userConfig.customBaseUrl) {
        rawResponse = await callCustom(prompt, userConfig);
      } else {
        rawResponse = await callGemini(prompt, userConfig);
      }

      const cleanJson = rawResponse
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleanJson);
      if (parsed.example || parsed.examples || parsed.definition) {
        const imageResult = await resolveSemanticImage(cleanWord, parsed.definition || context, parsed.imageSearchQuery);
        const rawEx = parsed.example || parsed.examples?.[0] || "";
        const clozeEx = ensureCloze(rawEx, cleanWord);
        const clozeList = (parsed.examples || (parsed.example ? [parsed.example] : [])).map((s: string) =>
          ensureCloze(s, cleanWord)
        );

        return res.status(200).json({
          definition: parsed.definition || undefined,
          example: clozeEx,
          examples: clozeList,
          phonetic: parsed.phonetic || "",
          partOfSpeech: parsed.partOfSpeech || "vocabulary",
          tags: parsed.tags || ["vocabulary"],
          imageUrl: imageResult.imageUrl,
          hasPersonalAiKey: true,
        });
      }
    } catch (err) {
      console.warn("LLM autocomplete failed, falling back to dictionary/wikipedia:", err);
    }
  }

  // 3. Robust Fallback: Dictionary API + Wikipedia Context
  try {
    let phonetic = "";
    let partOfSpeech = "vocabulary";
    let foundExamples: string[] = [];

    // Check Free Dictionary API
    try {
      const dictRes = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord.toLowerCase())}`
      );
      if (dictRes.ok) {
        const dictData = await dictRes.json();
        if (Array.isArray(dictData) && dictData.length > 0) {
          const entry = dictData[0];
          phonetic = entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text || "";
          if (entry.meanings?.length > 0) {
            partOfSpeech = entry.meanings[0].partOfSpeech || "vocabulary";
            for (const m of entry.meanings) {
              for (const d of m.definitions || []) {
                if (d.example && typeof d.example === "string") {
                  foundExamples.push(d.example.trim());
                }
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }

    // If needed, check Wikipedia extract for real authentic sentences
    if (foundExamples.length < 2) {
      try {
        const wikiRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanWord)}`,
          { headers: { "User-Agent": "FlashguageApp/1.0" } }
        );
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          if (wikiData.extract) {
            const wikiSentences = extractSentencesForWord(wikiData.extract, cleanWord);
            foundExamples.push(...wikiSentences);
          }
        }
      } catch {
        // ignore
      }
    }

    // If still no examples found, use guaranteed fallback generator
    if (foundExamples.length === 0) {
      foundExamples.push(generateFallbackSentence(cleanWord, partOfSpeech));
    }

    const uniqueExamples = Array.from(new Set(foundExamples))
      .slice(0, 3)
      .map((s) => ensureCloze(s, cleanWord));
    const tags = [partOfSpeech, "vocabulary"].filter(Boolean);
    const imageResult = await resolveSemanticImage(cleanWord, context);

    return res.status(200).json({
      example: uniqueExamples[0],
      examples: uniqueExamples,
      phonetic,
      partOfSpeech,
      tags,
      imageUrl: imageResult.imageUrl,
      hasPersonalAiKey: false,
      requiresAiKey: true,
      sourceNotice: "Generated from standard dictionary/reference text. Configure a personal AI API key in Settings for AI-crafted practice sentences.",
    });
  } catch (error) {
    console.error("Autocomplete fallback error:", error);
    return res.status(200).json({
      example: generateFallbackSentence(cleanWord),
      examples: [generateFallbackSentence(cleanWord)],
      phonetic: "",
      partOfSpeech: "vocabulary",
      tags: ["vocabulary"],
    });
  }
}
