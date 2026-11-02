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
      voice: overrideVoice,
      speed: overrideSpeed,
      model: overrideModel,
    } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ message: "Text is required" });
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
        return await serveGoogleTTS(cleanText, language, cacheDir, res);
      }

      const voice = (overrideVoice || userSettings.speechVoice || "Puck").trim();
      const rawModel = (overrideModel || userSettings.speechModel || "gemini-3.8-flash-tts").trim();
      const ttsModel = rawModel.includes("tts") ? rawModel : "gemini-3.8-flash-tts";
      const validVoices = ["Puck", "Aoede", "Charon", "Kore", "Fenrir"];
      const selectedVoice = validVoices.includes(voice) ? voice : "Puck";

      const cacheKey = `gemini:${ttsModel}:${selectedVoice}:${cleanText.toLowerCase()}`;
      const hash = crypto.createHash("sha256").update(cacheKey).digest("hex");
      const fileName = `${hash}.wav`;
      const filePath = path.join(cacheDir, fileName);
      const publicUrl = `/api/audio/play/${fileName}`;

      if (fs.existsSync(filePath)) {
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
                      voiceName: selectedVoice,
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
        } else {
          const errText = await geminiRes.text();
          console.warn("[Gemini TTS Error]:", geminiRes.status, errText);
        }
      } catch (geminiErr) {
        console.warn("[Gemini TTS Fetch Error]:", geminiErr);
      }

      // Fallback to Google Cloud stream if Gemini request failed
      return await serveGoogleTTS(cleanText, language, cacheDir, res);
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
        return await serveGoogleTTS(cleanText, language, cacheDir, res);
      }

      const voice = (overrideVoice || userSettings.speechVoice || "nova").trim();
      const speed = typeof overrideSpeed === "number" ? overrideSpeed : (userSettings.speechSpeed ?? 1.0);
      const model = (overrideModel || userSettings.speechModel || "tts-1").trim();

      const cacheKey = `openai:${model}:${voice}:${speed.toFixed(2)}:${cleanText.toLowerCase()}`;
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
            provider: "openai",
          });
        }
      }

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

      console.warn("[OpenAI TTS Error]:", openAiRes.status);
      return await serveGoogleTTS(cleanText, language, cacheDir, res);
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
        return await serveGoogleTTS(cleanText, language, cacheDir, res);
      }

      const voice = (overrideVoice || userSettings.speechVoice || "21m00Tcm4TlvDq8ikWAM").trim();
      const cacheKey = `elevenlabs:${voice}:${cleanText.toLowerCase()}`;
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
            provider: "elevenlabs",
          });
        }
      }

      const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
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

      console.warn("[ElevenLabs TTS Error]:", elevenRes.status);
      return await serveGoogleTTS(cleanText, language, cacheDir, res);
    }

    // 4. Custom TTS Integration
    if (provider === "custom") {
      const baseUrl = (req.body.baseUrl || userSettings.speechBaseUrl || userSettings.customBaseUrl || "").trim();
      if (!baseUrl) {
        return await serveGoogleTTS(cleanText, language, cacheDir, res);
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

      if (fs.existsSync(filePath)) {
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

      console.warn("[Custom TTS Error]:", customRes.status);
      return await serveGoogleTTS(cleanText, language, cacheDir, res);
    }

    // 5. Default / "browser" provider: Return reliable audio stream so all browsers (including Firefox) work out of the box
    return await serveGoogleTTS(cleanText, language, cacheDir, res);
  } catch (error: any) {
    console.error("[Audio Speech Handler Error]:", error);
    const cacheDir = path.join(process.cwd(), "public", "audio-cache");
    return await serveGoogleTTS(req.body?.text || "", req.body?.language || "en", cacheDir, res);
  }
}
