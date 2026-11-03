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
function wrapPcmInWav(pcmBuffer: Buffer, mimeType: string = ""): Buffer {
  if (pcmBuffer.length >= 4 && pcmBuffer.subarray(0, 4).toString() === "RIFF") {
    return pcmBuffer;
  }

  let sampleRate = 24000;
  let channels = 1;

  const rateMatch = mimeType.match(/rate=(\d+)/i);
  if (rateMatch) {
    sampleRate = parseInt(rateMatch[1], 10) || 24000;
  }

  const channelMatch = mimeType.match(/channels=(\d+)/i);
  if (channelMatch) {
    channels = parseInt(channelMatch[1], 10) || 1;
  }

  const bitDepth = 16;
  const byteRate = (sampleRate * channels * bitDepth) / 8;
  const blockAlign = (channels * bitDepth) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);

  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);

  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}
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
          const inline = geminiData.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          const b64 = inline?.data;
          if (b64) {
            const rawBuffer = Buffer.from(b64, "base64");
            const audioBuffer = wrapPcmInWav(rawBuffer, inline?.mimeType || "");
            await fs.promises.writeFile(filePath, audioBuffer);
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

    // 4. Cartesia TTS Integration (Does not use OpenAI endpoint format)
    if (provider === "cartesia") {
      const apiKey = (
        overrideApiKey ||
        userSettings.speechApiKey ||
        userSettings.cartesiaKey ||
        process.env.CARTESIA_API_KEY ||
        ""
      ).trim();

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          provider: "cartesia",
          message: "Cartesia API key is required. Please configure it in Settings.",
        });
      }

      // Sanitize text: Cartesia requires at least one alphanumeric character
      // Replace cloze underscores or excessive punctuation
      let sanitizedText = cleanText.replace(/_+/g, " ").trim();
      if (!/[\p{L}\p{N}]/u.test(sanitizedText)) {
        return res.status(400).json({
          success: false,
          provider: "cartesia",
          message: "Text must contain at least one letter or number to pronounce.",
        });
      }

      // Validate Cartesia voice: must be a valid UUID, otherwise fallback to Barbershop Man
      const rawVoice = (overrideVoice || userSettings.speechVoice || "").trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawVoice);
      const voice = isUuid ? rawVoice : "a0e99841-438c-4a64-b679-ae501e7d6091";

      // Validate Cartesia model: avoid OpenAI/Gemini model names contaminating Cartesia
      const rawModel = (overrideModel || userSettings.speechModel || "").trim();
      const model =
        rawModel && !rawModel.includes("gpt") && !rawModel.includes("tts-1") && !rawModel.includes("gemini")
          ? rawModel
          : "sonic-3.6";

      // Cartesia language code: ISO 639-1 (e.g. "en", "es", "fr", "de")
      const langCode = language ? language.slice(0, 2).toLowerCase() : "en";

      const cacheKey = `cartesia:${model}:${voice}:${langCode}:${sanitizedText.toLowerCase()}`;
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
            provider: "cartesia",
          });
        }
      }

      try {
        const cartesiaRes = await fetch("https://api.cartesia.ai/tts/bytes", {
          method: "POST",
          headers: {
            "X-API-Key": apiKey,
            "Cartesia-Version": "2024-06-10",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model_id: model,
            transcript: sanitizedText,
            language: langCode,
            voice: {
              mode: "id",
              id: voice,
            },
            output_format: {
              container: "wav",
              encoding: "pcm_s16le",
              sample_rate: 44100,
            },
          }),
        });

        if (cartesiaRes.ok) {
          const arrayBuffer = await cartesiaRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await fs.promises.writeFile(filePath, buffer);

          return res.status(200).json({
            success: true,
            audioUrl: publicUrl,
            cached: false,
            provider: "cartesia",
          });
        }

        const rawErr = await cartesiaRes.text().catch(() => "");
        let errMsg = rawErr;
        try {
          const errJson = JSON.parse(rawErr);
          errMsg = errJson?.error?.message || errJson?.error || errJson?.message || errJson?.detail || rawErr;
        } catch {}

        console.error("[Cartesia TTS Error]:", cartesiaRes.status, errMsg, { model, voice, sanitizedText });
        return res.status(cartesiaRes.status >= 400 && cartesiaRes.status < 600 ? cartesiaRes.status : 500).json({
          success: false,
          provider: "cartesia",
          message: `Cartesia speech error (${cartesiaRes.status}): ${errMsg || "Invalid request"}`,
        });
      } catch (cartesiaErr: any) {
        console.error("[Cartesia TTS Fetch Error]:", cartesiaErr);
        return res.status(500).json({
          success: false,
          provider: "cartesia",
          message: `Failed to connect to Cartesia: ${cartesiaErr?.message || "Network error"}`,
        });
      }
    }

    // 5. Deepgram TTS Integration
    if (provider === "deepgram") {
      const apiKey = (
        overrideApiKey ||
        userSettings.speechApiKey ||
        userSettings.deepgramKey ||
        process.env.DEEPGRAM_API_KEY ||
        ""
      ).trim();

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          provider: "deepgram",
          message: "Deepgram API key is required. Please configure it in Settings.",
        });
      }

      const voice = (overrideVoice || userSettings.speechVoice || "").trim();
      const model = (overrideModel || userSettings.speechModel || voice || "aura-2-thalia-en").trim();

      const cacheKey = `deepgram:${model}:${cleanText.toLowerCase()}`;
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
            provider: "deepgram",
          });
        }
      }

      try {
        const deepgramRes = await fetch(
          `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`,
          {
            method: "POST",
            headers: {
              Authorization: `Token ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: cleanText }),
          }
        );

        if (deepgramRes.ok) {
          const arrayBuffer = await deepgramRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await fs.promises.writeFile(filePath, buffer);

          return res.status(200).json({
            success: true,
            audioUrl: publicUrl,
            cached: false,
            provider: "deepgram",
          });
        }

        const errJson = await deepgramRes.json().catch(() => null);
        const errMsg = errJson?.err_msg || errJson?.error || `HTTP ${deepgramRes.status}`;
        console.error("[Deepgram TTS Error]:", deepgramRes.status, errMsg);
        return res.status(deepgramRes.status >= 400 && deepgramRes.status < 600 ? deepgramRes.status : 500).json({
          success: false,
          provider: "deepgram",
          message: `Deepgram speech error (${deepgramRes.status}): ${errMsg}`,
        });
      } catch (deepgramErr: any) {
        console.error("[Deepgram TTS Fetch Error]:", deepgramErr);
        return res.status(500).json({
          success: false,
          provider: "deepgram",
          message: `Failed to connect to Deepgram: ${deepgramErr?.message || "Network error"}`,
        });
      }
    }

    // 6. Fish Audio TTS Integration
    if (provider === "fishaudio") {
      const apiKey = (
        overrideApiKey ||
        userSettings.speechApiKey ||
        userSettings.fishAudioKey ||
        process.env.FISH_AUDIO_API_KEY ||
        ""
      ).trim();

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          provider: "fishaudio",
          message: "Fish Audio API key is required. Please configure it in Settings.",
        });
      }

      const voice = (overrideVoice || userSettings.speechVoice || "").trim();
      const model = (overrideModel || userSettings.speechModel || "s2.1-pro").trim();

      const cacheKey = `fishaudio:${model}:${voice}:${cleanText.toLowerCase()}`;
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
            provider: "fishaudio",
          });
        }
      }

      try {
        const bodyPayload: Record<string, any> = {
          text: cleanText,
          format: "mp3",
        };
        if (voice) {
          bodyPayload.reference_id = voice;
        }

        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        if (model) {
          headers["model"] = model;
        }

        const fishRes = await fetch("https://api.fish.audio/v1/tts", {
          method: "POST",
          headers,
          body: JSON.stringify(bodyPayload),
        });

        if (fishRes.ok) {
          const arrayBuffer = await fishRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await fs.promises.writeFile(filePath, buffer);

          return res.status(200).json({
            success: true,
            audioUrl: publicUrl,
            cached: false,
            provider: "fishaudio",
          });
        }

        const errJson = await fishRes.json().catch(() => null);
        const errMsg = errJson?.message || errJson?.detail || `HTTP ${fishRes.status}`;
        console.error("[Fish Audio TTS Error]:", fishRes.status, errMsg);
        return res.status(fishRes.status >= 400 && fishRes.status < 600 ? fishRes.status : 500).json({
          success: false,
          provider: "fishaudio",
          message: `Fish Audio speech error (${fishRes.status}): ${errMsg}`,
        });
      } catch (fishErr: any) {
        console.error("[Fish Audio TTS Fetch Error]:", fishErr);
        return res.status(500).json({
          success: false,
          provider: "fishaudio",
          message: `Failed to connect to Fish Audio: ${fishErr?.message || "Network error"}`,
        });
      }
    }

    // 7. Custom TTS Integration
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
