import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { provider, apiKey } = req.query;

  if (req.method !== "GET" || typeof provider !== "string") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!apiKey || typeof apiKey !== "string") {
    return res.status(400).json({ message: "Speech API key required" });
  }

  try {
    let models: string[] = [];

    switch (provider) {
      case "openai": {
        const r = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.error?.message || `OpenAI error ${r.status}`);
        }
        const data = await r.json();
        const detected = (data.data || [])
          .filter((m: any) => m.id && (m.id.includes("tts") || m.id.includes("whisper")))
          .map((m: any) => m.id);
        const defaults = ["tts-1", "tts-1-hd", "whisper-1"];
        models = Array.from(new Set([...detected, ...defaults])).sort();
        break;
      }

      case "gemini": {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
        );
        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Gemini error ${r.status}`);
        }
        const data = await r.json();
        models = (data.models || [])
          .filter((m: any) => {
            const name = (m.name || "").toLowerCase();
            return (
              name.includes("flash") ||
              name.includes("transcribe") ||
              name.includes("tts")
            );
          })
          .map((m: any) => m.name.replace("models/", ""))
          .sort();
        break;
      }

      case "groq": {
        const r = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Groq error ${r.status}`);
        }
        const data = await r.json();
        models = (data.data || [])
          .filter((m: any) => m.id && m.id.includes("whisper"))
          .map((m: any) => m.id)
          .sort();
        if (models.length === 0) {
          models = ["whisper-large-v3", "whisper-large-v3-turbo"];
        }
        break;
      }

      case "elevenlabs": {
        const r = await fetch("https://api.elevenlabs.io/v1/models", {
          headers: { "xi-api-key": apiKey },
        });
        if (!r.ok) {
          throw new Error(`ElevenLabs error ${r.status}`);
        }
        const data = await r.json();
        models = (Array.isArray(data) ? data : [])
          .map((m: any) => m.model_id || m.name)
          .filter(Boolean)
          .sort();
        if (models.length === 0) {
          models = ["eleven_multilingual_v2", "eleven_turbo_v2_5"];
        }
        break;
      }

      default:
        return res.status(400).json({ message: `Unsupported speech provider: ${provider}` });
    }

    return res.status(200).json({ provider, models });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || "Failed to fetch speech models" });
  }
}
