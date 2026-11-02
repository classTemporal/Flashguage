import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { provider, apiKey, baseUrl } = req.query;

  if (req.method !== "GET" || typeof provider !== "string") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    let models: string[] = [];

    switch (provider) {
      case "openai": {
        if (!apiKey || typeof apiKey !== "string") {
          return res.status(400).json({ message: "API key required" });
        }
        const r = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!r.ok) throw new Error(`OpenAI error ${r.status}`);
        const data = await r.json();
        models = (data.data || [])
          .filter((m: any) => m.id && m.id.includes("gpt"))
          .map((m: any) => m.id)
          .sort();
        break;
      }
      case "anthropic": {
        if (!apiKey || typeof apiKey !== "string") {
          return res.status(400).json({ message: "API key required" });
        }
        const r = await fetch("https://api.anthropic.com/v1/models", {
          headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        });
        if (!r.ok) throw new Error(`Anthropic error ${r.status}`);
        const data = await r.json();
        models = (data.data || [])
          .filter((m: any) => m.id && m.id.includes("claude"))
          .map((m: any) => m.id)
          .sort();
        break;
      }
      case "gemini": {
        if (!apiKey || typeof apiKey !== "string") {
          return res.status(400).json({ message: "API key required" });
        }
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
        );
        if (!r.ok) throw new Error(`Gemini error ${r.status}`);
        const data = await r.json();
        models = (data.models || [])
          .filter((m: any) => {
            const name = (m.name || "").toLowerCase();
            return (
              m.supportedGenerationMethods?.includes("generateContent") &&
              name.includes("gemini") &&
              !name.includes("tts") &&
              !name.includes("image") &&
              !name.includes("robotics") &&
              !name.includes("computer-use") &&
              !name.includes("preview-10")
            );
          })
          .map((m: any) => m.name.replace("models/", ""))
          .sort();
        break;
      }
      case "groq": {
        if (!apiKey || typeof apiKey !== "string") {
          return res.status(400).json({ message: "API key required" });
        }
        const r = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!r.ok) throw new Error(`Groq error ${r.status}`);
        const data = await r.json();
        models = (data.data || [])
          .filter((m: any) => m.id && (m.id.includes("llama") || m.id.includes("mixtral") || m.id.includes("gemma")))
          .map((m: any) => m.id)
          .sort();
        if (models.length === 0) {
          models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
        }
        break;
      }
      case "ollama": {
        const url = (baseUrl as string) || "http://localhost:11434";
        const r = await fetch(`${url.replace(/\/$/, "")}/api/tags`);
        if (!r.ok) throw new Error(`Ollama error ${r.status}`);
        const data = await r.json();
        models = (data.models || []).map((m: any) => m.name).sort();
        break;
      }
      case "custom": {
        if (!baseUrl || typeof baseUrl !== "string") {
          return res.status(400).json({ message: "Base URL required" });
        }
        const url = baseUrl.replace(/\/$/, "");
        const endpoint = url.endsWith("/v1") ? `${url}/models` : `${url}/v1/models`;
        const headers: Record<string, string> = {};
        if (apiKey && typeof apiKey === "string") {
          headers.Authorization = `Bearer ${apiKey}`;
        }
        const r = await fetch(endpoint, { headers });
        if (!r.ok) throw new Error(`Custom provider error ${r.status}`);
        const data = await r.json();
        models = (data.data || [])
          .filter((m: any) => m.id)
          .map((m: any) => m.id)
          .sort();
        break;
      }
      default:
        return res.status(400).json({ message: "Unknown provider" });
    }

    return res.status(200).json({ provider, models });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch models";
    return res.status(500).json({ message: msg });
  }
}
