import { prisma } from "@/lib/prisma";

export interface ReviewLite {
  lastReview: Date | null;
  createdAt: Date;
}

/**
 * Format a Date into YYYY-MM-DD in the given IANA timezone.
 * Defaults to "UTC".
 */
export function getDateStrInTimezone(date: Date, timezone: string = "UTC"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    let y = 1970, m = 1, d = 1;
    for (const p of parts) {
      if (p.type === "year") y = parseInt(p.value, 10);
      if (p.type === "month") m = parseInt(p.value, 10);
      if (p.type === "day") d = parseInt(p.value, 10);
    }
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Returns UTC Date objects for the start and end of the calendar day
 * corresponding to `date` in the given timezone.
 */
export function getDayBounds(date: Date = new Date(), timezone: string = "UTC"): { startOfDay: Date; endOfDay: Date } {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    let y = 1970, m = 1, d = 1;
    for (const p of parts) {
      if (p.type === "year") y = parseInt(p.value, 10);
      if (p.type === "month") m = parseInt(p.value, 10);
      if (p.type === "day") d = parseInt(p.value, 10);
    }
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    // Noon UTC on that calendar day to determine timezone offset reliably
    const tempUtc = new Date(`${dateStr}T12:00:00Z`);
    const utcDate = new Date(tempUtc.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate = new Date(tempUtc.toLocaleString("en-US", { timeZone: timezone }));
    const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / 60000;

    const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMinutes * 60000);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    return { startOfDay, endOfDay };
  } catch {
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    const d = date.getUTCDate();
    const startOfDay = new Date(Date.UTC(y, m, d, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(y, m, d + 1, 0, 0, 0));
    return { startOfDay, endOfDay };
  }
}

/**
 * Computes consecutive study streak from an array of reviews in the user's timezone.
 * Defaults to "UTC".
 */
export function getStreak(reviews: ReviewLite[], timezone: string = "UTC"): number {
  if (!reviews.length) return 0;

  const daySet = new Set<string>();
  for (const r of reviews) {
    const d = new Date(r.lastReview ?? r.createdAt);
    daySet.add(getDateStrInTimezone(d, timezone));
  }

  const now = new Date();
  const todayKey = getDateStrInTimezone(now, timezone);
  const yesterdayKey = getDateStrInTimezone(new Date(now.getTime() - 24 * 60 * 60 * 1000), timezone);

  // If neither today nor yesterday had any activity, streak is broken (0)
  if (!daySet.has(todayKey) && !daySet.has(yesterdayKey)) {
    return 0;
  }

  let streak = 0;
  let checkTime = daySet.has(todayKey) ? now.getTime() : now.getTime() - 24 * 60 * 60 * 1000;

  while (true) {
    const key = getDateStrInTimezone(new Date(checkTime), timezone);
    if (daySet.has(key)) {
      streak++;
      checkTime -= 24 * 60 * 60 * 1000;
    } else {
      break;
    }
  }

  return streak;
}

export async function getTotalCards(userId: string, language?: string): Promise<number> {
  const result = await prisma.card.count({
    where: {
      deck: {
        userId,
        ...(language && language !== "all" ? { targetLanguage: language } : {}),
      },
    },
  });
  return result;
}

export async function getCardsLearned(userId: string, language?: string): Promise<number> {
  const result = await prisma.review.findMany({
    where: {
      userId,
      repetitions: { gt: 0 },
      ...(language && language !== "all" ? { card: { deck: { targetLanguage: language } } } : {}),
    },
    select: { cardId: true },
  });
  const uniqueCards = new Set(result.map((r) => r.cardId));
  return uniqueCards.size;
}

export async function getMasteryLevel(
  userId: string,
  language?: string
): Promise<{ level: number; xp: number; nextLevelXp: number }> {
  const reviews = await prisma.review.findMany({
    where: {
      userId,
      repetitions: { gt: 0 },
      ...(language && language !== "all" ? { card: { deck: { targetLanguage: language } } } : {}),
    },
    select: { repetitions: true },
  });

  // XP formula: each learned review contributes repetitions * 10 XP
  const xp = reviews.reduce((sum, r) => sum + r.repetitions * 10, 0);
  const level = Math.floor(xp / 100) + 1;
  const nextLevelXp = level * 100;

  return { level, xp, nextLevelXp };
}

export async function getWeeklyActivity(
  userId: string,
  language?: string,
  timezone: string = "UTC"
): Promise<{ day: string; count: number }[]> {
  const days: { day: string; count: number }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const { startOfDay, endOfDay } = getDayBounds(targetDate, timezone);

    const [logCount, reviewCount] = await Promise.all([
      prisma.reviewLog.count({
        where: {
          userId,
          createdAt: { gte: startOfDay, lt: endOfDay },
          ...(language && language !== "all" ? { card: { deck: { targetLanguage: language } } } : {}),
        },
      }),
      prisma.review.count({
        where: {
          userId,
          lastReview: { gte: startOfDay, lt: endOfDay },
          ...(language && language !== "all" ? { card: { deck: { targetLanguage: language } } } : {}),
        },
      }),
    ]);

    let dayLabel = "";
    try {
      dayLabel = targetDate.toLocaleDateString("en-US", { weekday: "short", timeZone: timezone });
    } catch {
      dayLabel = targetDate.toLocaleDateString("en-US", { weekday: "short" });
    }

    days.push({
      day: dayLabel,
      count: Math.max(logCount, reviewCount),
    });
  }

  return days;
}

export async function getDailyGoalProgress(
  userId: string,
  goal: number,
  language?: string,
  timezone: string = "UTC"
): Promise<{ current: number; goal: number; percentage: number }> {
  const { startOfDay, endOfDay } = getDayBounds(new Date(), timezone);

  const [logCount, reviewCount] = await Promise.all([
    prisma.reviewLog.count({
      where: {
        userId,
        createdAt: { gte: startOfDay, lt: endOfDay },
        ...(language && language !== "all" ? { card: { deck: { targetLanguage: language } } } : {}),
      },
    }),
    prisma.review.count({
      where: {
        userId,
        lastReview: { gte: startOfDay, lt: endOfDay },
        ...(language && language !== "all" ? { card: { deck: { targetLanguage: language } } } : {}),
      },
    }),
  ]);

  const current = Math.max(logCount, reviewCount);
  const percentage = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0;

  return { current, goal, percentage };
}
