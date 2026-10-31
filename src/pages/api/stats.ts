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

    const [reviews, totalCards, cardsLearned, mastery, weeklyActivity, user] =
      await Promise.all([
        prisma.review.findMany({
          where: { userId },
          select: { lastReview: true, createdAt: true },
        }),
        getTotalCards(userId),
        getCardsLearned(userId),
        getMasteryLevel(userId),
        getWeeklyActivity(userId),
        prisma.user.findUnique({
          where: { id: userId },
          select: { dailyGoal: true },
        }),
      ]);

    const streak = getStreak(reviews);
    const goal = user?.dailyGoal ?? 20;
    const goalProgress = await getDailyGoalProgress(userId, goal);

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
