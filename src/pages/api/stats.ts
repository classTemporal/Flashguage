import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
import {
  getStreak,
  getTotalCards,
  getCardsLearned,
  getMasteryLevel,
  getWeeklyActivity,
  getDailyGoalProgress,
} from "@/lib/stats";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = session.user.id;
    const lang = (req.query.lang as string) || undefined;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dailyGoal: true, settings: true },
    });

    let timezone = "UTC";
    if (user?.settings) {
      try {
        const parsed = JSON.parse(user.settings as string);
        if (parsed.timezone && typeof parsed.timezone === "string") {
          timezone = parsed.timezone;
        }
      } catch {}
    }

    const [reviews, totalCards, cardsLearned, mastery, weeklyActivity, goalProgress] =
      await Promise.all([
        prisma.review.findMany({
          where: {
            userId,
            ...(lang && lang !== "all" ? { card: { deck: { targetLanguage: lang } } } : {}),
          },
          select: { lastReview: true, createdAt: true },
        }),
        getTotalCards(userId, lang),
        getCardsLearned(userId, lang),
        getMasteryLevel(userId, lang),
        getWeeklyActivity(userId, lang, timezone),
        getDailyGoalProgress(userId, user?.dailyGoal ?? 20, lang, timezone),
      ]);

    const streak = getStreak(reviews, timezone);

    return res.status(200).json({
      streak,
      totalCards,
      cardsLearned,
      mastery,
      weeklyActivity,
      dailyGoal: goalProgress,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
