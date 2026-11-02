import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const aiProviderSchema = z.enum(["openai", "anthropic", "gemini", "ollama", "custom"]);
export type AIProvider = z.infer<typeof aiProviderSchema>;

export const settingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  // Multi-provider AI settings
  aiProvider: aiProviderSchema.optional(),
  aiApiKey: z.string().optional(),
  aiBaseUrl: z.string().optional(),
  aiModel: z.string().optional(),
  openaiModel: z.string().optional(),
  anthropicModel: z.string().optional(),
  geminiModel: z.string().optional(),
  // Provider-specific fields (for convenience and backward compatibility)
  openaiKey: z.string().optional(),
  anthropicKey: z.string().optional(),
  geminiKey: z.string().optional(),
  ollamaUrl: z.string().optional(),
  ollamaModel: z.string().optional(),
  customBaseUrl: z.string().optional(),
  customApiKey: z.string().optional(),
  customModel: z.string().optional(),
  // App settings
  theme: z.enum(["light", "dark", "system"]).optional(),
  timezone: z.string().optional(),
  dailyGoal: z.number().int().min(1).max(200).optional(),
  reviewLimit: z.number().int().min(1).max(500).optional(),
  sessionBreakMinutes: z.number().int().min(1).max(120).optional(),
  notifications: z.boolean().optional(),
  dailyReminder: z.boolean().optional(),
  weeklyEmail: z.boolean().optional(),
  soundEffects: z.boolean().optional(),
  plugins: z.array(z.string()).optional(),
});

export const pickSettings = (
  data: Record<string, unknown>,
  user?: { name?: string | null; email?: string | null }
) => {
  const rawProvider = data.aiProvider as string;
  const aiProvider: AIProvider = ["openai", "anthropic", "gemini", "ollama", "custom"].includes(rawProvider)
    ? (rawProvider as AIProvider)
    : "openai";

  // Provider-specific fallbacks
  const openaiKey = ((data.openaiKey as string) ?? (data.openaiApiKey as string) ?? "").trim();
  const anthropicKey = ((data.anthropicKey as string) ?? (data.anthropicApiKey as string) ?? "").trim();
  const geminiKey = ((data.geminiKey as string) ?? "").trim();
  const ollamaUrl = ((data.ollamaUrl as string) ?? "http://localhost:11434").trim();
  const ollamaModel = ((data.ollamaModel as string) ?? "").trim();
  const customBaseUrl = ((data.customBaseUrl as string) ?? "").trim();
  const customApiKey = ((data.customApiKey as string) ?? "").trim();
  const customModel = ((data.customModel as string) ?? "").trim();

  // Active credentials based on selected provider if not explicitly set
  let aiApiKey = ((data.aiApiKey as string) ?? "").trim();
  if (!aiApiKey) {
    if (aiProvider === "openai") aiApiKey = openaiKey;
    else if (aiProvider === "anthropic") aiApiKey = anthropicKey;
    else if (aiProvider === "gemini") aiApiKey = geminiKey;
    else if (aiProvider === "custom") aiApiKey = customApiKey;
  }

  let aiBaseUrl = ((data.aiBaseUrl as string) ?? "").trim();
  if (!aiBaseUrl) {
    if (aiProvider === "ollama") aiBaseUrl = ollamaUrl;
    else if (aiProvider === "custom") aiBaseUrl = customBaseUrl;
  }

  // Active model: prefer provider-specific model, fall back to generic aiModel
  let aiModel = ((data.aiModel as string) ?? "").trim();
  if (!aiModel) {
    if (aiProvider === "openai") aiModel = (data.openaiModel as string)?.trim() ?? "";
    else if (aiProvider === "anthropic") aiModel = (data.anthropicModel as string)?.trim() ?? "";
    else if (aiProvider === "gemini") aiModel = (data.geminiModel as string)?.trim() ?? "";
    else if (aiProvider === "ollama") aiModel = ollamaModel ?? "";
    else if (aiProvider === "custom") aiModel = customModel ?? "";
  }

  return {
    name: (user?.name as string | undefined) ?? (data.name as string | undefined) ?? "",
    email: user?.email ?? "",
    // Multi-provider settings
    aiProvider,
    aiApiKey,
    aiBaseUrl,
    openaiModel: (data.openaiModel as string | undefined)?.trim() ?? (aiProvider === "openai" ? aiModel : undefined),
    anthropicModel: (data.anthropicModel as string | undefined)?.trim() ?? (aiProvider === "anthropic" ? aiModel : undefined),
    geminiModel: (data.geminiModel as string | undefined)?.trim() ?? (aiProvider === "gemini" ? aiModel : undefined),
    aiModel,
    // Provider specific fields
    openaiKey: openaiKey || (aiProvider === "openai" ? aiApiKey : ""),
    anthropicKey: anthropicKey || (aiProvider === "anthropic" ? aiApiKey : ""),
    geminiKey: geminiKey || (aiProvider === "gemini" ? aiApiKey : ""),
    ollamaUrl: ollamaUrl || (aiProvider === "ollama" ? aiBaseUrl : ""),
    ollamaModel: ollamaModel || (aiProvider === "ollama" ? aiModel : ""),
    customBaseUrl: customBaseUrl || (aiProvider === "custom" ? aiBaseUrl : ""),
    customApiKey: customApiKey || (aiProvider === "custom" ? aiApiKey : ""),
    customModel: customModel || (aiProvider === "custom" ? aiModel : ""),
    // General user preferences
    theme: (data.theme as string) ?? "system",
    timezone: (data.timezone as string) || "UTC",
    dailyGoal: (data.dailyGoal as number) ?? 20,
    reviewLimit: (data.reviewLimit as number) ?? 20,
    sessionBreakMinutes: (data.sessionBreakMinutes as number) ?? 5,
    notifications: (data.notifications as boolean) ?? true,
    dailyReminder: (data.dailyReminder as boolean) ?? true,
    weeklyEmail: (data.weeklyEmail as boolean) ?? (data.emailNotifications as boolean) ?? false,
    soundEffects: (data.soundEffects as boolean) ?? true,
    plugins: (data.plugins as string[]) ?? [],
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, settings: true, dailyGoal: true, notifications: true, theme: true },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const parsedSettings = JSON.parse((user.settings as string) ?? "{}");
      const settings = pickSettings(
        {
          theme: user.theme,
          dailyGoal: user.dailyGoal,
          notifications: user.notifications,
          ...parsedSettings,
        },
        user
      );

      // Log for debugging
      console.log("[Settings GET] Returning settings for user", user.email, JSON.stringify(settings));

      return res.status(200).json(settings);
    } catch (error) {
      console.error("Get settings error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "PUT") {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const body = settingsSchema.safeParse(req.body);
      if (!body.success) {
        return res.status(400).json({ message: "Invalid settings", errors: body.error.flatten() });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, settings: true, dailyGoal: true, notifications: true, theme: true },
      });

      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const existingSettings = JSON.parse((currentUser.settings as string) ?? "{}");

      // Clean body data: don't save empty provider-specific models over existing ones
      const cleanedData = { ...body.data };
      if (cleanedData.openaiModel === "") delete cleanedData.openaiModel;
      if (cleanedData.anthropicModel === "") delete cleanedData.anthropicModel;
      if (cleanedData.geminiModel === "") delete cleanedData.geminiModel;
      if (cleanedData.ollamaModel === "") delete cleanedData.ollamaModel;
      if (cleanedData.customModel === "") delete cleanedData.customModel;

      // Auto-populate active fields if provider was changed or updated
      const updatedData = { ...cleanedData };
      if (updatedData.aiProvider) {
        if (!updatedData.aiApiKey) {
          if (updatedData.aiProvider === "openai") updatedData.aiApiKey = updatedData.openaiKey ?? existingSettings.openaiKey ?? "";
          else if (updatedData.aiProvider === "anthropic") updatedData.aiApiKey = updatedData.anthropicKey ?? existingSettings.anthropicKey ?? "";
          else if (updatedData.aiProvider === "gemini") updatedData.aiApiKey = updatedData.geminiKey ?? existingSettings.geminiKey ?? "";
          else if (updatedData.aiProvider === "custom") updatedData.aiApiKey = updatedData.customApiKey ?? existingSettings.customApiKey ?? "";
        }
        if (!updatedData.aiBaseUrl) {
          if (updatedData.aiProvider === "ollama") updatedData.aiBaseUrl = updatedData.ollamaUrl ?? existingSettings.ollamaUrl ?? "";
          else if (updatedData.aiProvider === "custom") updatedData.aiBaseUrl = updatedData.customBaseUrl ?? existingSettings.customBaseUrl ?? "";
        }
      }

      const mergedSettings = {
        ...existingSettings,
        ...updatedData,
      };

      const userUpdateData: {
        settings: string;
        name?: string;
        dailyGoal?: number;
        notifications?: boolean;
        theme?: string;
      } = {
        settings: JSON.stringify(mergedSettings),
      };

      if (body.data.name !== undefined) {
        userUpdateData.name = body.data.name;
      }
      if (body.data.dailyGoal !== undefined) {
        userUpdateData.dailyGoal = body.data.dailyGoal;
      }
      if (body.data.notifications !== undefined) {
        userUpdateData.notifications = body.data.notifications;
      }
      if (body.data.theme !== undefined) {
        userUpdateData.theme = body.data.theme;
      }

      const user = await prisma.user.update({
        where: { id: session.user.id },
        data: userUpdateData,
        select: { name: true, email: true, settings: true, dailyGoal: true, notifications: true, theme: true },
      });

      // Log what was saved for debugging
      try {
        const savedSettings = JSON.parse(user.settings as string);
        console.log("[Settings PUT] Saved settings for user", session.user.email, JSON.stringify(savedSettings));
      } catch (e) {
        console.error("[Settings PUT] Error logging saved settings:", e);
      }

      const parsedSettings = JSON.parse((user.settings as string) ?? "{}");
      const settings = pickSettings(
        {
          theme: user.theme,
          dailyGoal: user.dailyGoal,
          notifications: user.notifications,
          ...parsedSettings,
        },
        user
      );
      return res.status(200).json(settings);
    } catch (error) {
      console.error("Update settings error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  return res.status(405).json({ message: "Method not allowed" });
}
