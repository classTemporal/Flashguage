import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { provider, apiKey, baseUrl, mode = "tts" } = req.query;

  if (req.method !== "GET" || typeof provider !== "string") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  const urlBase = typeof baseUrl === "string" ? baseUrl.trim() : "";
  const isStt = mode === "stt" || mode === "transcribe";

  if (provider !== "custom" && !key) {
    return res.status(400).json({ message: "Speech API key required" });
  }

  if (provider === "custom" && !urlBase) {
    return res.status(400).json({ message: "Base URL required for custom speech provider" });
  }

  try {
    let models: string[] = [];

    switch (provider) {
      case "openai": {
        const r = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.error?.message || `OpenAI error ${r.status}`);
        }
        const data = await r.json();
        if (isStt) {
          const detected = (data.data || [])
            .filter((m: any) => m.id && m.id.includes("whisper"))
            .map((m: any) => m.id);
          models = Array.from(new Set([...detected, "whisper-1"])).sort();
        } else {
          const detected = (data.data || [])
            .filter((m: any) => m.id && m.id.includes("tts"))
            .map((m: any) => m.id);
          const defaults = ["tts-1", "tts-1-hd"];
          models = Array.from(new Set([...detected, ...defaults])).sort();
        }
        break;
      }

      case "gemini": {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
        );
        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Gemini error ${r.status}`);
        }
        const data = await r.json();
        if (isStt) {
          const detected = (data.models || [])
            .filter((m: any) => {
              const name = (m.name || "").toLowerCase();
              return (
                m.supportedGenerationMethods?.includes("generateContent") &&
                (name.includes("transcribe") || name.includes("flash")) &&
                !name.includes("tts") &&
                !name.includes("image") &&
                !name.includes("robotics") &&
                !name.includes("computer-use") &&
                !name.includes("preview-10") &&
                !name.includes("2.5-flash-preview")
              );
            })
            .map((m: any) => m.name.replace("models/", ""));
          const defaults = [
            "gemini-3.5-flash",
            "gemini-3.5-transcribe",
            "gemini-3.8-flash",
            "gemini-3.5-flash-lite",
          ];
          models = Array.from(new Set([...detected, ...defaults])).sort();
        } else {
          const detected = (data.models || [])
            .filter((m: any) => {
              const name = (m.name || "").toLowerCase();
              return name.includes("tts");
            })
            .map((m: any) => m.name.replace("models/", ""));
          const defaults = [
            "gemini-3.8-flash-tts",
            "gemini-3.8-flash-lite-tts",
            "gemini-3.1-flash-tts-preview",
          ];
          models = Array.from(new Set([...detected, ...defaults])).sort();
        }
        break;
      }

      case "groq": {
        const r = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
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
          headers: { "xi-api-key": key },
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

      case "cartesia": {
        try {
          const r = await fetch("https://api.cartesia.ai/voices", {
            headers: {
              "X-API-Key": key,
              "Cartesia-Version": "2024-06-10",
            },
          });
          if (r.ok) {
            models = ["sonic-3.6", "sonic-multilingual", "sonic-english", "sonic"];
          }
        } catch {}
        if (models.length === 0) {
          models = ["sonic-3.6", "sonic-multilingual", "sonic-english", "sonic"];
        }
        break;
      }

      case "deepgram": {
        models = [
          "aura-2-thalia-en",
          "aura-2-andromeda-en",
          "aura-2-helena-en",
          "aura-asteria-en",
          "aura-luna-en",
          "aura-stella-en",
          "aura-athena-en",
          "aura-hera-en",
          "aura-orion-en",
          "aura-arcas-en",
          "aura-perseus-en",
          "aura-angus-en",
          "aura-orpheus-en",
          "aura-helios-en",
          "aura-zeus-en",
        ];
        break;
      }

      case "fishaudio": {
        try {
          const r = await fetch("https://api.fish.audio/model?page_size=20", {
            headers: { Authorization: `Bearer ${key}` },
          });
          if (r.ok) {
            const data = await r.json();
            const items = (data.items || []).map((m: any) => m._id || m.title).filter(Boolean);
            if (items.length > 0) {
              models = ["s2.1-pro", "s2.1-pro-free", "speech-1.5", ...items.slice(0, 5)];
            }
          }
        } catch {}
        if (models.length === 0) {
          models = ["s2.1-pro", "s2.1-pro-free", "speech-1.5"];
        }
        break;
      }

      case "custom": {
        const url = urlBase.replace(/\/$/, "");
        const endpoint = url.endsWith("/v1") ? `${url}/models` : `${url}/v1/models`;
        const headers: Record<string, string> = {};
        if (key) {
          headers.Authorization = `Bearer ${key}`;
        }
        const r = await fetch(endpoint, { headers });
        if (!r.ok) {
          throw new Error(`Custom speech provider error ${r.status}`);
        }
        const data = await r.json();
        models = (data.data || [])
          .filter((m: any) => m.id)
          .map((m: any) => m.id)
          .sort();
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
