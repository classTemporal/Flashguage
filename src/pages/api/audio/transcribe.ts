import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

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

    const { audio, mimeType = "audio/webm", language = "en" } = req.body;

    if (!audio || typeof audio !== "string") {
      return res.status(400).json({ message: "Audio data (base64) is required" });
    }

    // Retrieve user settings
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    });

    const userSettings = user?.settings ? JSON.parse(user.settings as string) : {};

    const cleanBase64 = audio.replace(/^data:audio\/[a-z0-9-+.]+;base64,/, "");
    const cleanMime = mimeType.split(";")[0] || "audio/webm";

    // 1. Prefer Gemini if user has a Gemini key (most users configure Gemini)
    const geminiKey = (userSettings.geminiKey || (userSettings.aiProvider === "gemini" ? userSettings.aiApiKey : "") || "").trim();
    if (geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(
          geminiKey
        )}`;

        const geminiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: cleanMime,
                      data: cleanBase64,
                    },
                  },
                  {
                    text: `Transcribe the speech in this audio snippet (language: ${language}). Output ONLY the exact transcribed spoken words, in lowercase, without any quotes, punctuation, or conversational filler.`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 60,
            },
          }),
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const text = rawText.trim().replace(/^["']|["']$/g, "").trim();
          return res.status(200).json({ text, provider: "gemini" });
        } else {
          console.error("[Transcribe Gemini Error]:", geminiRes.status, await geminiRes.text());
        }
      } catch (geminiErr) {
        console.error("[Transcribe Gemini Catch]:", geminiErr);
      }
    }

    // 2. Fall back to OpenAI Whisper if an OpenAI key is present
    const openaiKey = (
      userSettings.speechApiKey ||
      userSettings.openaiKey ||
      (userSettings.aiProvider === "openai" ? userSettings.aiApiKey : "") ||
      process.env.OPENAI_API_KEY ||
      ""
    ).trim();

    if (openaiKey && openaiKey !== "test123") {
      const audioBuffer = Buffer.from(cleanBase64, "base64");
      const ext = cleanMime.includes("ogg")
        ? "ogg"
        : cleanMime.includes("mp4") || cleanMime.includes("m4a")
        ? "m4a"
        : cleanMime.includes("wav")
        ? "wav"
        : "webm";

      const file = new File([audioBuffer], `recording.${ext}`, { type: cleanMime });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", "whisper-1");
      if (language) {
        formData.append("language", language.slice(0, 2).toLowerCase());
      }

      const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}` },
        body: formData,
      });

      if (whisperRes.ok) {
        const result = await whisperRes.json();
        return res.status(200).json({ text: result.text || "", provider: "openai" });
      } else {
        const errText = await whisperRes.text();
        console.error("[Whisper Transcribe Error]:", whisperRes.status, errText);
      }
    }

    return res.status(400).json({
      error: "Para usar reconocimiento de voz en Firefox, configura tu clave de Gemini u OpenAI en Ajustes.",
    });
  } catch (error: any) {
    console.error("[Transcribe Handler Error]:", error);
    return res.status(500).json({
      error: error?.message || "Internal server error during audio transcription.",
    });
  }
}
