import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
import { generateDefinition, generateExample, suggestRelatedWords, AIConfig } from "@/lib/ai";

type Action = "definition" | "example" | "suggest";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { action, word, context, config } = req.body as {
    action?: Action;
    word?: string;
    context?: string;
    config?: AIConfig;
  };

  if (!action || !word) {
    return res.status(400).json({
      message: "Missing required fields: action and word are required.",
    });
  }

  // Load configured AI provider settings for this user
  let userConfig: AIConfig = {};
  if (session.user.id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { settings: true },
      });
      if (user?.settings) {
        const s = JSON.parse(user.settings);
        const provider = (s.aiProvider as string) || "openai";
        const apiKey = (s.aiApiKey as string) || (provider === "openai" ? (s.openaiKey as string) || "" : provider === "anthropic" ? (s.anthropicKey as string) || "" : provider === "gemini" ? (s.geminiKey as string) || "" : provider === "custom" ? (s.customApiKey as string) || "" : "") || "";
        const baseUrl = (s.aiBaseUrl as string) || (provider === "ollama" ? (s.ollamaUrl as string) || "" : provider === "custom" ? (s.customBaseUrl as string) || "" : "") || "";
        const model = (s.aiModel as string) || (provider === "openai" ? (s.openaiModel as string) || "" : provider === "anthropic" ? (s.anthropicModel as string) || "" : provider === "gemini" ? (s.geminiModel as string) || "" : provider === "ollama" ? (s.ollamaModel as string) || "" : provider === "custom" ? (s.customModel as string) || "" : "") || "";
        userConfig = {
          provider: provider as any,
          apiKey,
          baseUrl,
          model,
          openaiKey: (s.openaiKey as string) || "",
          anthropicKey: (s.anthropicKey as string) || "",
          geminiKey: (s.geminiKey as string) || "",
          ollamaUrl: (s.ollamaUrl as string) || "",
          ollamaModel: (s.ollamaModel as string) || "",
          customBaseUrl: (s.customBaseUrl as string) || "",
          customApiKey: (s.customApiKey as string) || "",
          customModel: (s.customModel as string) || "",
          openaiModel: (s.openaiModel as string) || undefined,
          anthropicModel: (s.anthropicModel as string) || undefined,
          geminiModel: (s.geminiModel as string) || undefined,
        };
      }
    } catch (e) {
      console.error("Error reading user AI settings in /api/ai:", e);
    }
  }

  const effectiveConfig: AIConfig = {
    ...userConfig,
    ...config,
  };

  try {
    switch (action) {
      case "definition":
        const definition = await generateDefinition(word, context, effectiveConfig);
        return res.status(200).json({ data: definition });

      case "example":
        const example = await generateExample(word, context, effectiveConfig);
        return res.status(200).json({ data: { example } });

      case "suggest":
        const suggestions = await suggestRelatedWords(word, effectiveConfig);
        return res.status(200).json({ data: { suggestions } });

      default:
        return res.status(400).json({ message: `Unknown action: ${action}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed";
    return res.status(500).json({ message });
  }
}

export default handler;
