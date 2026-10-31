import { prisma } from "@/lib/prisma";

export interface ReviewLite {
  lastReview: Date | null;
  createdAt: Date;
}

/**
 * Pure function: computes consecutive study streak from an array of reviews.
 * Counts how many distinct days ending at the most recent review date
 * had at least one review.
 */
export function getStreak(reviews: ReviewLite[]): number {
  if (!reviews.length) return 0;

  const daySet = new Set<string>();
  for (const r of reviews) {
    const d = new Date(r.lastReview ?? r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    daySet.add(key);
  }

  const sortedDays = Array.from(daySet).sort((a, b) => b.localeCompare(a));
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  let streak = 0;
  let checkDate = new Date(today);

  for (let i = 0; i < sortedDays.length; i++) {
    const checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
    if (daySet.has(checkKey)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0 && checkKey !== todayKey) {
      // If the most recent review wasn't today or yesterday, streak is 0
      // Actually, let's start from the first day in the list
      const firstDay = sortedDays[0];
      const [fy, fm, fd] = firstDay.split("-").map(Number);
      checkDate = new Date(fy, fm - 1, fd);
      // Re-check this day
      if (daySet.has(checkKey)) {
        streak = 1;
        checkDate.setDate(checkDate.getDate() - 1);
      }
      break;
    } else {
      break;
    }
  }

  return streak;
}

export async function getTotalCards(userId: string): Promise<number> {
  const result = await prisma.card.count({
    where: { deck: { userId } },
  });
  return result;
}

export async function getCardsLearned(userId: string): Promise<number> {
  const result = await prisma.review.findMany({
    where: { userId, repetitions: { gt: 0 } },
    select: { cardId: true },
  });
  const uniqueCards = new Set(result.map((r) => r.cardId));
  return uniqueCards.size;
}

export async function getMasteryLevel(userId: string): Promise<{ level: number; xp: number; nextLevelXp: number }> {
  const reviews = await prisma.review.findMany({
    where: { userId, repetitions: { gt: 0 } },
    select: { repetitions: true },
  });

  // XP formula: each learned review contributes repetitions * 10 XP
  const xp = reviews.reduce((sum, r) => sum + r.repetitions * 10, 0);
  const level = Math.floor(xp / 100) + 1;
  const nextLevelXp = level * 100;

  return { level, xp, nextLevelXp };
}

export async function getWeeklyActivity(userId: string): Promise<{ day: string; count: number }[]> {
  const days: { day: string; count: number }[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

    const count = await prisma.review.count({
      where: {
        userId,
        lastReview: { gte: startOfDay, lt: endOfDay },
      },
    });

    days.push({
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      count,
    });
  }

  return days;
}

export async function getDailyGoalProgress(
  userId: string,
  goal: number
): Promise<{ current: number; goal: number; percentage: number }> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const current = await prisma.review.count({
    where: {
      userId,
      lastReview: { gte: startOfDay, lt: endOfDay },
    },
  });

  const percentage = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0;

  return { current, goal, percentage };
}
