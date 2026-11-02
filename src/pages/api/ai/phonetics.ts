import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
import { callAI, isAIConfigured } from "@/lib/ai";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { text, language = "en" } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ message: "Text is required" });
    }

    const cleanText = text.trim();

    // 1. Check persistent server-side phonetics cache
    const cacheDir = path.join(process.cwd(), "public", "phonetics-cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cacheKey = `${(language || "en").toLowerCase()}:${cleanText.toLowerCase()}`;
    const hash = crypto.createHash("sha256").update(cacheKey).digest("hex");
    const cacheFile = path.join(cacheDir, `${hash}.json`);

    if (fs.existsSync(cacheFile)) {
      try {
        const fileContent = await fs.promises.readFile(cacheFile, "utf-8");
        const cachedWords = JSON.parse(fileContent);
        if (Array.isArray(cachedWords) && cachedWords.length > 0) {
          return res.status(200).json({
            success: true,
            words: cachedWords,
            cached: true,
          });
        }
      } catch (err) {
        console.warn("[Phonetics cache read error]:", err);
      }
    }

    // 2. Retrieve user settings and check if AI is available
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    });

    const userSettings = user?.settings ? JSON.parse(user.settings as string) : {};

    if (!isAIConfigured(userSettings)) {
      return res.status(200).json({
        success: false,
        reason: "no_ai",
        message: "AI provider is not configured. Please set an API key in Settings to generate word-by-word phonetics.",
      });
    }

    // 3. Build phonetics prompt
    const prompt = `You are an expert phonetician and linguist.
Provide the accurate IPA (International Phonetic Alphabet) pronunciation for each word or token in the following sentence/definition.
Text: "${cleanText}"
Language: ${language || "English"}

Return ONLY a raw JSON array of objects without markdown codeblocks or explanations.
Each object must have:
- "word": exact word or token from the original text (preserving its exact capitalization and attached punctuation).
- "ipa": phonetic transcription in standard IPA (without enclosing slashes, e.g. "əˈtʃiːv", "ɡreɪt").

Format example:
[
  { "word": "To", "ipa": "tuː" },
  { "word": "achieve", "ipa": "əˈtʃiːv" },
  { "word": "greatness,", "ipa": "ˈɡreɪtnəs" }
]`;

    const rawResponse = await callAI(
      prompt,
      userSettings,
      "phonetics",
      cleanText.slice(0, 30)
    );

    let words: Array<{ word: string; ipa: string }> = [];

    try {
      const cleaned = rawResponse
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        words = parsed
          .filter((item: any) => item && typeof item.word === "string")
          .map((item: any) => ({
            word: String(item.word),
            ipa: String(item.ipa || "").replace(/^\/+|\/+$/g, "").trim(),
          }));
      }
    } catch (parseErr) {
      console.warn("[Phonetics JSON parse error]:", parseErr, rawResponse);
    }

    if (words.length > 0) {
      try {
        await fs.promises.writeFile(cacheFile, JSON.stringify(words), "utf-8");
      } catch (writeErr) {
        console.warn("[Phonetics cache write error]:", writeErr);
      }

      return res.status(200).json({
        success: true,
        words,
        cached: false,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not generate phonetic transcription.",
    });
  } catch (error: any) {
    console.error("[Phonetics API error]:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to process phonetics request",
    });
  }
}
