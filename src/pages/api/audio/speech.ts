import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
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

    // If provider is browser, notify client to use Web Speech API immediately
    if (provider === "browser") {
      return res.status(200).json({
        fallback: true,
        provider: "browser",
        message: "Browser TTS selected. Use client Web Speech API.",
      });
    }

    // Ensure audio cache directory exists
    const cacheDir = path.join(process.cwd(), "public", "audio-cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cleanText = text.trim();

    if (provider === "openai") {
      const apiKey = (overrideApiKey || userSettings.speechApiKey || "").trim();

      if (!apiKey) {
        return res.status(200).json({
          fallback: true,
          error: "No dedicated Speech API key configured for OpenAI TTS. Falling back to browser speech.",
        });
      }

      const voice = (overrideVoice || userSettings.speechVoice || "nova").trim();
      const speed = typeof overrideSpeed === "number" ? overrideSpeed : (userSettings.speechSpeed ?? 1.0);
      const model = (overrideModel || userSettings.speechModel || "tts-1").trim();

      // Cache key & hash
      const cacheKey = `openai:${model}:${voice}:${speed.toFixed(2)}:${cleanText.toLowerCase()}`;
      const hash = crypto.createHash("sha256").update(cacheKey).digest("hex");
      const fileName = `${hash}.mp3`;
      const filePath = path.join(cacheDir, fileName);
      const publicUrl = `/audio-cache/${fileName}`;

      // Check cache hit
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

      // Generate via OpenAI TTS API
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

      if (!openAiRes.ok) {
        const errText = await openAiRes.text();
        console.error("[TTS OpenAI Error]:", openAiRes.status, errText);
        return res.status(200).json({
          fallback: true,
          error: `OpenAI TTS error (${openAiRes.status}): ${errText}`,
        });
      }

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

    if (provider === "elevenlabs") {
      const apiKey = (
        overrideApiKey ||
        userSettings.speechApiKey ||
        process.env.ELEVENLABS_API_KEY ||
        ""
      ).trim();

      if (!apiKey) {
        return res.status(200).json({
          fallback: true,
          error: "No ElevenLabs API key found for TTS. Falling back to browser speech.",
        });
      }

      const voice = (overrideVoice || userSettings.speechVoice || "21m00Tcm4TlvDq8ikWAM").trim();
      const cacheKey = `elevenlabs:${voice}:${cleanText.toLowerCase()}`;
      const hash = crypto.createHash("sha256").update(cacheKey).digest("hex");
      const fileName = `${hash}.mp3`;
      const filePath = path.join(cacheDir, fileName);
      const publicUrl = `/audio-cache/${fileName}`;

      // Check cache hit
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

      // Generate via ElevenLabs
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

      if (!elevenRes.ok) {
        const errText = await elevenRes.text();
        console.error("[TTS ElevenLabs Error]:", elevenRes.status, errText);
        return res.status(200).json({
          fallback: true,
          error: `ElevenLabs TTS error (${elevenRes.status}): ${errText}`,
        });
      }

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

    if (provider === "custom") {
      const baseUrl = (req.body.baseUrl || userSettings.speechBaseUrl || "").trim();
      if (!baseUrl) {
        return res.status(200).json({
          fallback: true,
          error: "No Base URL configured for custom speech provider.",
        });
      }

      const apiKey = (overrideApiKey || userSettings.speechApiKey || "").trim();
      const voice = (overrideVoice || userSettings.speechVoice || "alloy").trim();
      const speed = typeof overrideSpeed === "number" ? overrideSpeed : (userSettings.speechSpeed ?? 1.0);
      const model = (overrideModel || userSettings.speechModel || "tts-1").trim();

      const cacheKey = `custom:${model}:${voice}:${speed.toFixed(2)}:${cleanText.toLowerCase()}`;
      const hash = crypto.createHash("sha256").update(cacheKey).digest("hex");
      const fileName = `${hash}.mp3`;
      const filePath = path.join(cacheDir, fileName);
      const publicUrl = `/audio-cache/${fileName}`;

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

      if (!customRes.ok) {
        const errText = await customRes.text();
        return res.status(200).json({
          fallback: true,
          error: `Custom TTS error (${customRes.status}): ${errText}`,
        });
      }

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

    return res.status(200).json({
      fallback: true,
      message: `Unknown provider "${provider}". Falling back to browser speech.`,
    });
  } catch (error: any) {
    console.error("[Audio Speech Handler Error]:", error);
    return res.status(200).json({
      fallback: true,
      error: error?.message || "Internal server error during TTS generation.",
    });
  }
}
