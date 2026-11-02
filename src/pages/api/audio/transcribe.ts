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

    const speechProvider = userSettings.speechProvider || "browser";
    const speechApiKey = (userSettings.speechApiKey || "").trim();
    const speechModel = (userSettings.speechModel || "").trim();

    if (!speechApiKey) {
      return res.status(400).json({
        error:
          "Se requiere una API Key dedicada de Speech para transcribir en este navegador. Ve a Ajustes > Speech & Pronunciation para configurar tu proveedor y clave de voz.",
      });
    }

    const cleanBase64 = audio.replace(/^data:audio\/[a-z0-9-+.]+;base64,/, "");
    const cleanMime = mimeType.split(";")[0] || "audio/webm";

    // 1. Google Gemini Speech Provider
    if (speechProvider === "gemini") {
      const model = speechModel || "gemini-3.5-flash-lite";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(speechApiKey)}`;

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
                  text: `Transcribe the speech in this audio clip (language: ${language}). Output ONLY the exact transcribed spoken words, in lowercase, without quotes, punctuation, or any conversational text.`,
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

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error("[Transcribe Gemini Error]:", geminiRes.status, errText);
        return res.status(400).json({
          error: `Gemini Speech API error (${geminiRes.status}): ${errText}`,
        });
      }

      const data = await geminiRes.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const text = rawText.trim().replace(/^["']|["']$/g, "").trim();
      return res.status(200).json({ text, provider: "gemini" });
    }

    // 2. Groq Whisper Speech Provider
    if (speechProvider === "groq") {
      const model = speechModel || "whisper-large-v3-turbo";
      const audioBuffer = Buffer.from(cleanBase64, "base64");
      const file = new File([audioBuffer], "recording.webm", { type: cleanMime });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", model);
      if (language) {
        formData.append("language", language.slice(0, 2).toLowerCase());
      }

      const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${speechApiKey}` },
        body: formData,
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        return res.status(400).json({ error: `Groq Speech API error (${groqRes.status}): ${errText}` });
      }

      const result = await groqRes.json();
      return res.status(200).json({ text: result.text || "", provider: "groq" });
    }

    // 3. OpenAI Whisper Speech Provider
    if (speechProvider === "openai") {
      const model = speechModel || "whisper-1";
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
      formData.append("model", model);
      if (language) {
        formData.append("language", language.slice(0, 2).toLowerCase());
      }

      const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${speechApiKey}` },
        body: formData,
      });

      if (!whisperRes.ok) {
        const errText = await whisperRes.text();
        return res.status(400).json({
          error: `OpenAI Speech API error (${whisperRes.status}): ${errText}`,
        });
      }

      const result = await whisperRes.json();
      return res.status(200).json({ text: result.text || "", provider: "openai" });
    }

    return res.status(400).json({
      error: `El proveedor de voz seleccionado (${speechProvider}) no soporta transcripción por micrófono en este navegador. Selecciona OpenAI, Gemini o Groq en Ajustes.`,
    });
  } catch (error: any) {
    console.error("[Transcribe Handler Error]:", error);
    return res.status(500).json({
      error: error?.message || "Internal server error during speech transcription.",
    });
  }
}
