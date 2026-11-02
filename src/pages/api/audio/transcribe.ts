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

    // 1. Resolve Transcription Provider
    let speechProvider = (userSettings.transcribeProvider || "same").trim().toLowerCase();
    if (speechProvider === "same" || !speechProvider || speechProvider === "auto") {
      if (
        userSettings.speechProvider &&
        userSettings.speechProvider !== "elevenlabs" &&
        userSettings.speechProvider !== "browser"
      ) {
        speechProvider = userSettings.speechProvider;
      } else if (
        userSettings.aiProvider &&
        ["openai", "gemini", "groq", "custom"].includes(userSettings.aiProvider)
      ) {
        speechProvider = userSettings.aiProvider;
      } else {
        speechProvider = "gemini";
      }
    }

    // 2. Resolve Transcription API Key
    let speechApiKey = (userSettings.transcribeApiKey || "").trim();
    if (!speechApiKey) {
      if (speechProvider === userSettings.speechProvider && userSettings.speechApiKey) {
        speechApiKey = userSettings.speechApiKey.trim();
      } else if (speechProvider === "gemini") {
        speechApiKey = (userSettings.geminiKey || userSettings.speechApiKey || userSettings.aiApiKey || "").trim();
      } else if (speechProvider === "groq") {
        speechApiKey = (userSettings.groqKey || userSettings.speechApiKey || "").trim();
      } else if (speechProvider === "openai") {
        speechApiKey = (userSettings.openaiKey || userSettings.speechApiKey || userSettings.aiApiKey || "").trim();
      } else if (speechProvider === "custom") {
        speechApiKey = (userSettings.customApiKey || userSettings.speechApiKey || "").trim();
      } else {
        speechApiKey = (userSettings.speechApiKey || userSettings.aiApiKey || "").trim();
      }
    }

    // 3. Resolve Transcription Model
    let speechModel = (userSettings.transcribeModel || "").trim();
    if (!speechModel) {
      if (speechProvider === "gemini") {
        speechModel = "gemini-3.5-flash";
      } else if (speechProvider === "groq") {
        speechModel = "whisper-large-v3-turbo";
      } else if (speechProvider === "openai" || speechProvider === "custom") {
        speechModel = "whisper-1";
      }
    }

    // Guard against TTS models or obsolete previews in Gemini STT
    if (speechProvider === "gemini") {
      if (speechModel.includes("-tts") || speechModel.includes("2.5-flash")) {
        speechModel = "gemini-3.5-flash";
      }
    }

    if (!speechApiKey && speechProvider !== "custom") {
      return res.status(400).json({
        error:
          "An API key (OpenAI, Gemini, or Groq) or a Custom server is required for microphone transcription. Configure it in Settings > Speech & Pronunciation.",
      });
    }

    // Clean base64 audio and normalize mime type
    let cleanBase64 = audio.trim();
    let cleanMime = (mimeType || "audio/webm").split(";")[0].trim().toLowerCase();

    // Strip data URL scheme if present (e.g. data:audio/webm;codecs=opus;base64,...)
    const commaIdx = cleanBase64.indexOf(",");
    if (cleanBase64.startsWith("data:") && commaIdx !== -1) {
      const prefix = cleanBase64.slice(0, commaIdx);
      const mimeMatch = prefix.match(/^data:([^;,]+)/);
      if (mimeMatch && mimeMatch[1]) {
        cleanMime = mimeMatch[1].trim().toLowerCase();
      }
      cleanBase64 = cleanBase64.slice(commaIdx + 1).trim();
    }

    // Inspect container magic bytes for accurate MIME identification
    try {
      const sample = Buffer.from(cleanBase64.slice(0, 16), "base64");
      if (sample.slice(0, 4).toString("ascii") === "OggS") {
        cleanMime = "audio/ogg";
      } else if (
        sample[0] === 0x1a &&
        sample[1] === 0x45 &&
        sample[2] === 0xdf &&
        sample[3] === 0xa3
      ) {
        cleanMime = "audio/webm";
      } else if (sample.slice(0, 4).toString("ascii") === "RIFF") {
        cleanMime = "audio/wav";
      }
    } catch {
      // Use fallback cleanMime
    }

    const helperExt = cleanMime.includes("ogg")
      ? "ogg"
      : cleanMime.includes("mp4") || cleanMime.includes("m4a")
      ? "m4a"
      : cleanMime.includes("wav")
      ? "wav"
      : "webm";

    // 1. Google Gemini Speech Provider
    if (speechProvider === "gemini") {
      let model = speechModel || "gemini-3.5-flash";
      if (model.includes("-tts") || model.includes("2.5-flash")) {
        model = "gemini-3.5-flash";
      }
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
        let errText = await geminiRes.text();
        console.error("[Transcribe Gemini Error]:", geminiRes.status, errText);
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) {
            errText = parsed.error.message;
          }
        } catch {}
        if (errText.length > 200) {
          errText = errText.slice(0, 197) + "...";
        }
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
      const file = new File([audioBuffer], `recording.${helperExt}`, { type: cleanMime });
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
        let errText = await groqRes.text();
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) {
            errText = parsed.error.message;
          }
        } catch {}
        if (errText.length > 200) {
          errText = errText.slice(0, 197) + "...";
        }
        return res.status(400).json({ error: `Groq Speech API error (${groqRes.status}): ${errText}` });
      }

      const result = await groqRes.json();
      return res.status(200).json({ text: result.text || "", provider: "groq" });
    }

    // 3. OpenAI Whisper Speech Provider
    if (speechProvider === "openai") {
      const model = speechModel || "whisper-1";
      const audioBuffer = Buffer.from(cleanBase64, "base64");
      const file = new File([audioBuffer], `recording.${helperExt}`, { type: cleanMime });
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
        let errText = await whisperRes.text();
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) {
            errText = parsed.error.message;
          }
        } catch {}
        if (errText.length > 200) {
          errText = errText.slice(0, 197) + "...";
        }
        return res.status(400).json({
          error: `OpenAI Speech API error (${whisperRes.status}): ${errText}`,
        });
      }

      const result = await whisperRes.json();
      return res.status(200).json({ text: result.text || "", provider: "openai" });
    }

    // 4. Custom OpenAI-compatible Speech Server (LocalAI, Faster-Whisper, LiteLLM, etc.)
    if (speechProvider === "custom") {
      const baseUrl = (userSettings.transcribeBaseUrl || userSettings.speechBaseUrl || "").trim();
      if (!baseUrl) {
        return res.status(400).json({ error: "Base URL is required for custom speech provider." });
      }

      const model = speechModel || "whisper-1";
      const audioBuffer = Buffer.from(cleanBase64, "base64");
      const file = new File([audioBuffer], `recording.${helperExt}`, { type: cleanMime });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", model);
      if (language) {
        formData.append("language", language.slice(0, 2).toLowerCase());
      }

      const cleanUrl = baseUrl.replace(/\/$/, "");
      const endpoint = cleanUrl.endsWith("/v1")
        ? `${cleanUrl}/audio/transcriptions`
        : `${cleanUrl}/v1/audio/transcriptions`;

      const headers: Record<string, string> = {};
      if (speechApiKey) {
        headers.Authorization = `Bearer ${speechApiKey}`;
      }

      const customRes = await fetch(endpoint, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!customRes.ok) {
        let errText = await customRes.text();
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) {
            errText = parsed.error.message;
          }
        } catch {}
        if (errText.length > 200) {
          errText = errText.slice(0, 197) + "...";
        }
        return res.status(400).json({
          error: `Custom Speech API error (${customRes.status}): ${errText}`,
        });
      }

      const result = await customRes.json();
      return res.status(200).json({ text: result.text || "", provider: "custom" });
    }

    return res.status(400).json({
      error: `The selected speech provider (${speechProvider}) does not support microphone transcription in this browser. Please select OpenAI, Gemini, Groq, or a custom server in Settings.`,
    });
  } catch (error: any) {
    console.error("[Transcribe Handler Error]:", error);
    return res.status(500).json({
      error: error?.message || "Internal server error during speech transcription.",
    });
  }
}
