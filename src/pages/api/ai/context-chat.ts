import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
import { callAI, isAIConfigured, AIConfig } from "@/lib/ai";

function cleanJsonString(str: string): string {
  return str
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
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
      action = "scenario",
      word,
      definition = "",
      scenario = "",
      question = "",
      userMessage = "",
      language = "English",
    } = req.body;

    if (!word || typeof word !== "string" || !word.trim()) {
      return res.status(400).json({ message: "Word is required" });
    }

    // Retrieve user AI settings
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    });

    const userSettings: AIConfig = user?.settings ? JSON.parse(user.settings as string) : {};
    const hasAI = isAIConfigured(userSettings);
    const providerName = userSettings.provider || "gemini";

    if (action === "scenario") {
      if (!hasAI) {
        // Return standard template scenario with clear indication that AI key is missing
        return res.status(200).json({
          scenario: `A friend asks you about a situation involving "${word}".`,
          question: `Could you tell me about a time you experienced or used "${word}"?`,
          tip: `Answer in a complete sentence incorporating "${word}".`,
          isAIPowered: false,
          hasConfiguredAI: false,
          provider: providerName,
          sourceNotice:
            "Basic mode (No AI key configured). Add your API key in Settings for personalized scenarios and intelligent feedback.",
        });
      }

      const prompt = `You are an expert language teacher helping a student practice using the vocabulary word or idiom "${word}" (meaning: "${definition}") in active conversation (Target Language: ${language}).
Generate a realistic, relatable micro-scenario and an opening conversational question that naturally invites the student to use "${word}" in their response.

Respond ONLY with a valid JSON object (no markdown, no backticks, raw JSON only):
{
  "scenario": "A 1-sentence real-life situation (e.g. 'You are chatting with a coworker during lunch about your weekend.')",
  "question": "A friendly conversational question that makes it natural to answer using the target word.",
  "tip": "Short 1-sentence tip on how to place the word in the sentence."
}`;

      try {
        const raw = await callAI(prompt, userSettings, "context-chat-scenario", word);
        const parsed = JSON.parse(cleanJsonString(raw));
        return res.status(200).json({
          scenario: parsed.scenario || `Practicing conversation with "${word}"`,
          question: parsed.question || `How would you use "${word}" in a sentence today?`,
          tip: parsed.tip || `Try using "${word}" in your response.`,
          isAIPowered: true,
          hasConfiguredAI: true,
          provider: providerName,
        });
      } catch (err: any) {
        console.warn("[Context-Chat Scenario Fallback]:", err?.message);
        // Fallback default scenario if AI is busy or rate limited
        return res.status(200).json({
          scenario: `A friend asks you about a situation involving "${word}".`,
          question: `Could you tell me about a time you experienced or used "${word}"?`,
          tip: `Answer in a complete sentence incorporating "${word}".`,
          isAIPowered: false,
          hasConfiguredAI: true,
          provider: providerName,
          sourceNotice: "AI response timed out. Showing fallback practice scenario.",
        });
      }
    }

    if (action === "evaluate") {
      if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
        return res.status(400).json({ message: "User message is required for evaluation" });
      }

      if (!hasAI) {
        const containsWord = userMessage.toLowerCase().includes(word.toLowerCase());
        return res.status(200).json({
          rating: containsWord ? "great" : "good",
          usedTargetWord: containsWord,
          feedback: containsWord
            ? `Great job incorporating "${word}" into your answer!`
            : `Good response! Remember to explicitly include the target word "${word}".`,
          correctedSentence: "",
          aiReply: "Thanks for sharing! Keep practicing everyday expressions.",
          isAIPowered: false,
          hasConfiguredAI: false,
          provider: providerName,
          sourceNotice:
            "Standard text-match evaluation. Configure your API key in Settings for complete grammar correction and conversational replies.",
        });
      }

      const prompt = `You are a supportive native language coach evaluating a student's conversational response.
Target vocabulary word: "${word}"
Situation: "${scenario}"
Question: "${question}"
Student's response: "${userMessage}"
Target Language: ${language}

Evaluate the student's response:
1. Did the student use "${word}" or an appropriate form?
2. Is the grammar, collocation, and tone natural in English?
3. Give brief, motivating feedback and a natural reaction to keep the conversation flowing.

Respond ONLY with a valid JSON object (no markdown, no backticks, raw JSON only):
{
  "rating": "great" | "good" | "needs_improvement",
  "usedTargetWord": true | false,
  "feedback": "1-2 concise, motivating sentences evaluating their usage and grammar.",
  "correctedSentence": "A corrected or more natural version if they made a mistake, or empty string if already natural.",
  "aiReply": "A friendly, natural 1-2 sentence conversational reaction from the other person."
}`;

      try {
        const raw = await callAI(prompt, userSettings, "context-chat-evaluate", word, userMessage);
        const parsed = JSON.parse(cleanJsonString(raw));
        return res.status(200).json({
          rating: parsed.rating || "good",
          usedTargetWord: parsed.usedTargetWord ?? true,
          feedback: parsed.feedback || "Good effort using the vocabulary word in context!",
          correctedSentence: parsed.correctedSentence || "",
          aiReply: parsed.aiReply || "Thanks for sharing! That makes complete sense.",
          isAIPowered: true,
          hasConfiguredAI: true,
          provider: providerName,
        });
      } catch (err: any) {
        console.warn("[Context-Chat Evaluate Fallback]:", err?.message);
        const containsWord = userMessage.toLowerCase().includes(word.toLowerCase());
        return res.status(200).json({
          rating: containsWord ? "great" : "good",
          usedTargetWord: containsWord,
          feedback: containsWord
            ? `Great job using "${word}" in your response!`
            : `Good sentence! Next time try to explicitly include "${word}".`,
          correctedSentence: "",
          aiReply: "That's a very natural response! Keep practicing everyday expressions.",
          isAIPowered: false,
          hasConfiguredAI: true,
          provider: providerName,
          sourceNotice: "Standard fallback evaluation. Detailed AI analysis was temporarily unavailable.",
        });
      }
    }

    return res.status(400).json({ message: `Unknown action: ${action}` });
  } catch (error: any) {
    console.error("[Context-Chat Error]:", error);
    return res.status(500).json({
      message: error?.message || "Internal server error during context chat.",
    });
  }
}
