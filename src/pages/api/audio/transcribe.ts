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

    // Retrieve user settings to find OpenAI / Speech API Key
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    });

    const userSettings = user?.settings ? JSON.parse(user.settings as string) : {};

    const apiKey = (
      userSettings.speechApiKey ||
      userSettings.openaiKey ||
      userSettings.aiApiKey ||
      process.env.OPENAI_API_KEY ||
      ""
    ).trim();

    if (!apiKey) {
      return res.status(400).json({
        error: "Firefox requires an OpenAI API key for audio recognition. Please configure it in Settings.",
      });
    }

    // Convert base64 to buffer
    const base64Data = audio.replace(/^data:audio\/[a-z0-9-+.]+;base64,/, "");
    const audioBuffer = Buffer.from(base64Data, "base64");

    const ext = mimeType.includes("ogg")
      ? "ogg"
      : mimeType.includes("mp4") || mimeType.includes("m4a")
      ? "m4a"
      : mimeType.includes("wav")
      ? "wav"
      : "webm";

    const file = new File([audioBuffer], `recording.${ext}`, {
      type: mimeType.split(";")[0] || "audio/webm",
    });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-1");
    if (language) {
      formData.append("language", language.slice(0, 2).toLowerCase());
    }

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      console.error("[Whisper Transcribe Error]:", whisperRes.status, errText);
      return res.status(400).json({
        error: `Transcription service error (${whisperRes.status}): ${errText}`,
      });
    }

    const result = await whisperRes.json();
    return res.status(200).json({ text: result.text || "" });
  } catch (error: any) {
    console.error("[Transcribe Handler Error]:", error);
    return res.status(500).json({
      error: error?.message || "Internal server error during transcription.",
    });
  }
}
