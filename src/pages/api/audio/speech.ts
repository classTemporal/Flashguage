import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * Fallback to Google Cloud Translation TTS stream (generates standard MP3 audio).
 * Operates reliably across all desktop and mobile browsers (Firefox, Chrome, Safari, Edge)
 * without requiring any external keys.
 */
async function serveGoogleTTS(
  text: string,
  lang: string,
  cacheDir: string,
  res: NextApiResponse
) {
  try {
    const cleanLang = (lang || "en").slice(0, 2).toLowerCase();
    const cleanText = text.trim();
    const cacheKey = `gtts:${cleanLang}:${cleanText.toLowerCase()}`;
    const hash = crypto.createHash("sha256").update(cacheKey).digest("hex");
    const fileName = `${hash}.mp3`;
    const filePath = path.join(cacheDir, fileName);
    const publicUrl = `/api/audio/play/${fileName}`;

    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > 0) {
        return res.status(200).json({
          success: true,
          audioUrl: publicUrl,
          cached: true,
          provider: "google-tts",
        });
      }
    }

    const gttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(
      cleanLang
    )}&client=tw-ob&q=${encodeURIComponent(cleanText.slice(0, 250))}`;

    const gttsRes = await fetch(gttsUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });

    if (gttsRes.ok) {
      const arrayBuf = await gttsRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      if (buffer.length > 0) {
        await fs.promises.writeFile(filePath, buffer);
        return res.status(200).json({
          success: true,
          audioUrl: publicUrl,
          cached: false,
          provider: "google-tts",
        });
      }
    }
  } catch (err) {
    console.error("[Google TTS Error]:", err);
  }

  return res.status(200).json({
    fallback: true,
    provider: "browser",
    message: "Using browser speech synthesis.",
  });
}

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

    const {
      text,
      language = "en",
      provider: overrideProvider,
      apiKey: overrideApiKey,
      baseUrl: overrideBaseUrl,
      voice: overrideVoice,
      speed: overrideSpeed,
      model: overrideModel,
      skipCache = false,
    } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ success: false, message: "Text is required" });
    }

    // Retrieve user settings
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    });

    const userSettings = user?.settings ? JSON.parse(user.settings as string) : {};

    const provider = overrideProvider || userSettings.speechProvider || "browser";
    const cleanText = text.trim();

    // Ensure audio cache directory exists
    const cacheDir = path.join(process.cwd(), "public", "audio-cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // 1. Gemini TTS Integration
    if (provider === "gemini") {
      const apiKey = (
        overrideApiKey ||
        userSettings.speechApiKey ||
        userSettings.geminiKey ||
        userSettings.aiApiKey ||
        ""
      ).trim();

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          provider: "gemini",
          message: "Gemini API key is required. Please configure it in Settings.",
        });
      }

      const voice = (overrideVoice || userSettings.speechVoice || "Puck").trim();
      const rawModel = (overrideModel || userSettings.speechModel || "gemini-3.8-flash-tts").trim();
      const ttsModel = rawModel.includes("tts") ? rawModel : "gemini-3.8-flash-tts";
      const validVoices = ["Puck", "Aoede", "Charon", "Kore", "Fenrir"];
      const matchedVoice = validVoices.find((v) => v.toLowerCase() === voice.toLowerCase()) || "Puck";

      const cacheKey = `gemini:${ttsModel}:${matchedVoice}:${cleanText.toLowerCase()}`;
      const hash = crypto.createHash("sha256").update(cacheKey).digest("hex");
      const fileName = `${hash}.wav`;
      const filePath = path.join(cacheDir, fileName);
      const publicUrl = `/api/audio/play/${fileName}`;

      if (!skipCache && fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          return res.status(200).json({
            success: true,
            audioUrl: publicUrl,
            cached: true,
            provider: "gemini",
          });
        }
      }

      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${ttsModel}:generateContent?key=${encodeURIComponent(
            apiKey
          )}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: cleanText }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: matchedVoice,
                    },
                  },
                },
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const b64 = geminiData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (b64) {
            const buffer = Buffer.from(b64, "base64");
            await fs.promises.writeFile(filePath, buffer);
            return res.status(200).json({
              success: true,
              audioUrl: publicUrl,
              cached: false,
              provider: "gemini",
            });
          }
          return res.status(500).json({
            success: false,
            provider: "gemini",
            message: "Gemini returned empty audio data.",
          });
        } else {
          const errJson = await geminiRes.json().catch(() => null);
          const errMsg = errJson?.error?.message || (await geminiRes.text().catch(() => "Unknown Gemini error"));
          console.error("[Gemini TTS Error]:", geminiRes.status, errMsg);
          return res.status(geminiRes.status >= 400 && geminiRes.status < 600 ? geminiRes.status : 500).json({
            success: false,
            provider: "gemini",
            message: `Gemini speech error (${geminiRes.status}): ${errMsg}`,
          });
        }
      } catch (geminiErr: any) {
        console.error("[Gemini TTS Fetch Error]:", geminiErr);
        return res.status(500).json({
          success: false,
          provider: "gemini",
          message: `Failed to connect to Gemini speech service: ${geminiErr?.message || "Network error"}`,
        });
      }
    }

    // 2. OpenAI TTS Integration
    if (provider === "openai") {
      const apiKey = (
        overrideApiKey ||
        userSettings.speechApiKey ||
        userSettings.openaiKey ||
        userSettings.aiApiKey ||
        ""
      ).trim();

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          provider: "openai",
          message: "OpenAI API key is required. Please configure it in Settings.",
        });
      }

      const voice = (overrideVoice || userSettings.speechVoice || "nova").trim();
      const speed = typeof overrideSpeed === "number" ? overrideSpeed : (userSettings.speechSpeed ?? 1.0);
      const model = (overrideModel || userSettings.speechModel || "tts-1").trim();

      const cacheKey = `openai:${model}:${voice}:${speed.toFixed(2)}:${cleanText.toLowerCase()}`;
      const hash = crypto.createHash("sha256").update(cacheKey).digest("hex");
      const fileName = `${hash}.mp3`;
      const filePath = path.join(cacheDir, fileName);
      const publicUrl = `/api/audio/play/${fileName}`;

      if (!skipCache && fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          return res.status(200).json({
            success: true,
            audioUrl: publicUrl,
            cached: true,
            provider: "openai",
          });
        }
      }

      try {
        const openAiRes = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            voice,
            input: cleanText,
            speed: Math.max(0.25, Math.min(4.0, Number(speed) || 1.0)),
          }),
        });

        if (openAiRes.ok) {
          const arrayBuffer = await openAiRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await fs.promises.writeFile(filePath, buffer);

          return res.status(200).json({
            success: true,
            audioUrl: publicUrl,
            cached: false,
            provider: "openai",
          });
        }

        const errJson = await openAiRes.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${openAiRes.status}`;
        console.error("[OpenAI TTS Error]:", openAiRes.status, errMsg);
        return res.status(openAiRes.status >= 400 && openAiRes.status < 600 ? openAiRes.status : 500).json({
          success: false,
          provider: "openai",
          message: `OpenAI speech error (${openAiRes.status}): ${errMsg}`,
        });
      } catch (openAiErr: any) {
        console.error("[OpenAI TTS Fetch Error]:", openAiErr);
        return res.status(500).json({
          success: false,
          provider: "openai",
          message: `Failed to connect to OpenAI speech service: ${openAiErr?.message || "Network error"}`,
        });
      }
    }

    // 3. ElevenLabs TTS Integration
    if (provider === "elevenlabs") {
      const apiKey = (
        overrideApiKey ||
        userSettings.speechApiKey ||
        process.env.ELEVENLABS_API_KEY ||
        ""
      ).trim();

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          provider: "elevenlabs",
          message: "ElevenLabs API key is required. Please configure it in Settings.",
        });
      }

      const voice = (overrideVoice || userSettings.speechVoice || "21m00Tcm4TlvDq8ikWAM").trim();
      const model = (overrideModel || userSettings.speechModel || "eleven_multilingual_v2").trim();
      const cacheKey = `elevenlabs:${model}:${voice}:${cleanText.toLowerCase()}`;
      const hash = crypto.createHash("sha256").update(cacheKey).digest("hex");
      const fileName = `${hash}.mp3`;
      const filePath = path.join(cacheDir, fileName);
      const publicUrl = `/api/audio/play/${fileName}`;

      if (!skipCache && fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          return res.status(200).json({
            success: true,
            audioUrl: publicUrl,
            cached: true,
            provider: "elevenlabs",
          });
        }
      }

      try {
        const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: model,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        });

        if (elevenRes.ok) {
          const arrayBuffer = await elevenRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await fs.promises.writeFile(filePath, buffer);

          return res.status(200).json({
            success: true,
            audioUrl: publicUrl,
            cached: false,
            provider: "elevenlabs",
          });
        }

        const errJson = await elevenRes.json().catch(() => null);
        const errMsg = errJson?.detail?.message || errJson?.error || `HTTP ${elevenRes.status}`;
        console.error("[ElevenLabs TTS Error]:", elevenRes.status, errMsg);
        return res.status(elevenRes.status >= 400 && elevenRes.status < 600 ? elevenRes.status : 500).json({
          success: false,
          provider: "elevenlabs",
          message: `ElevenLabs speech error (${elevenRes.status}): ${errMsg}`,
        });
      } catch (elevenErr: any) {
        console.error("[ElevenLabs TTS Fetch Error]:", elevenErr);
        return res.status(500).json({
          success: false,
          provider: "elevenlabs",
          message: `Failed to connect to ElevenLabs: ${elevenErr?.message || "Network error"}`,
        });
      }
    }

    // 4. Custom TTS Integration
    if (provider === "custom") {
      const baseUrl = (overrideBaseUrl || req.body.baseUrl || userSettings.speechBaseUrl || userSettings.customBaseUrl || "").trim();
      if (!baseUrl) {
        return res.status(400).json({
          success: false,
          provider: "custom",
          message: "Base URL is required for custom speech server. Please configure it in Settings.",
        });
      }

      const apiKey = (overrideApiKey || userSettings.speechApiKey || userSettings.customApiKey || "").trim();
      const voice = (overrideVoice || userSettings.speechVoice || "alloy").trim();
      const speed = typeof overrideSpeed === "number" ? overrideSpeed : (userSettings.speechSpeed ?? 1.0);
      const model = (overrideModel || userSettings.speechModel || "tts-1").trim();

      const cacheKey = `custom:${model}:${voice}:${speed.toFixed(2)}:${cleanText.toLowerCase()}`;
      const hash = crypto.createHash("sha256").update(cacheKey).digest("hex");
      const fileName = `${hash}.mp3`;
      const filePath = path.join(cacheDir, fileName);
      const publicUrl = `/api/audio/play/${fileName}`;

      if (!skipCache && fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          return res.status(200).json({
            success: true,
            audioUrl: publicUrl,
            cached: true,
            provider: "custom",
          });
        }
      }

      try {
        const cleanUrl = baseUrl.replace(/\/$/, "");
        const endpoint = cleanUrl.endsWith("/v1") ? `${cleanUrl}/audio/speech` : `${cleanUrl}/v1/audio/speech`;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (apiKey) {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }

        const customRes = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            input: cleanText,
            voice,
            speed,
          }),
        });

        if (customRes.ok) {
          const arrayBuffer = await customRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await fs.promises.writeFile(filePath, buffer);

          return res.status(200).json({
            success: true,
            audioUrl: publicUrl,
            cached: false,
            provider: "custom",
          });
        }

        const errJson = await customRes.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${customRes.status}`;
        console.error("[Custom TTS Error]:", customRes.status, errMsg);
        return res.status(customRes.status >= 400 && customRes.status < 600 ? customRes.status : 500).json({
          success: false,
          provider: "custom",
          message: `Custom speech server error (${customRes.status}): ${errMsg}`,
        });
      } catch (customErr: any) {
        console.error("[Custom TTS Fetch Error]:", customErr);
        return res.status(500).json({
          success: false,
          provider: "custom",
          message: `Failed to connect to custom speech server: ${customErr?.message || "Network error"}`,
        });
      }
    }

    // 5. Default / "browser" provider: Return reliable audio stream so all browsers (including Firefox) work out of the box
    return await serveGoogleTTS(cleanText, language, cacheDir, res);
  } catch (error: any) {
    console.error("[Audio Speech Handler Error]:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error generating speech",
    });
  }
}
