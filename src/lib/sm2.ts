// SM-2+ Algorithm implementation with Gentle Early Intervals & Mastery Metrics
// quality values: 1 (Again), 3 (Hard), 5 (Mastered / Got it)

export interface ReviewResult {
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: Date;
}

export interface Card {
  id: string;
  front: string;
  back: string;
}

export interface CardMastery {
  percentage: number;
  label: string;
  colorClass: string;
  badgeBg: string;
  badgeText: string;
}

/**
 * Calculates the next review schedule using a smooth, gentle progression.
 * Starts light (10m -> 1d -> 2d -> 4d -> 7d -> 14d -> 30d+) so early learning
 * doesn't jump prematurely into multi-day gaps.
 */
export function calculateNextReviewWithState(
  quality: number,
  currentEaseFactor: number,
  currentInterval: number,
  currentRepetitions: number
): ReviewResult {
  let easeFactor = currentEaseFactor;
  let interval = currentInterval;
  let repetitions = currentRepetitions;

  if (quality === 1) {
    // Lapse — reset repetition count, short interval (10 minutes from now, same day)
    repetitions = 0;
    interval = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (quality === 3) {
    // Hard — gentle progression
    if (repetitions === 0) {
      interval = 1; // 1 day
    } else if (repetitions === 1) {
      interval = 2; // 2 days
    } else if (repetitions === 2) {
      interval = 3; // 3 days
    } else if (repetitions === 3) {
      interval = 5; // 5 days
    } else {
      interval = Math.max(1, Math.round(interval * Math.max(1.2, easeFactor - 0.15)));
    }
    repetitions++;
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else {
    // quality === 5 → Mastered / Clear recall — confident recall with larger interval leap
    if (repetitions === 0) {
      interval = 2; // 2 days (distinct from Hard: 1 day vs 2 days)
    } else if (repetitions === 1) {
      interval = 4; // 4 days (distinct from Hard: 2 days vs 4 days)
    } else if (repetitions === 2) {
      interval = 7; // 1 week
    } else if (repetitions === 3) {
      interval = 14; // 2 weeks
    } else if (repetitions === 4) {
      interval = 30; // 1 month
    } else {
      interval = Math.min(180, Math.round(interval * easeFactor));
    }
    repetitions++;
    easeFactor = Math.max(1.3, easeFactor + 0.1);
  }

  const dueDate = new Date();
  if (quality === 1) {
    // Re-appear in 10 minutes (same session / same day)
    dueDate.setMinutes(dueDate.getMinutes() + 10);
  } else {
    // Schedule for future day (midnight start of that day)
    dueDate.setDate(dueDate.getDate() + interval);
    dueDate.setHours(0, 0, 0, 0);
  }

  return { easeFactor, interval, repetitions, dueDate };
}

/** Legacy wrapper function kept for backwards compatibility */
export function calculateNextReview(card: Card, quality: number): ReviewResult {
  if (quality < 0 || quality > 5) {
    throw new Error("Quality must be between 0 and 5");
  }
  return calculateNextReviewWithState(quality, 2.5, 0, 0);
}

/**
 * Computes human-friendly interval estimate shown on study buttons
 */
export function getNextIntervalPreview(
  quality: number,
  repetitions: number,
  interval: number,
  easeFactor: number = 2.5
): string {
  if (quality === 1) return "~10m";
  if (quality === 3) {
    if (repetitions === 0) return "~1d";
    if (repetitions === 1) return "~2d";
    if (repetitions === 2) return "~3d";
    if (repetitions === 3) return "~5d";
    return `~${Math.max(1, Math.round(interval * 1.2))}d`;
  }
  // quality === 5 (Mastered / Got it)
  if (repetitions === 0) return "~2d";
  if (repetitions === 1) return "~4d";
  if (repetitions === 2) return "~7d";
  if (repetitions === 3) return "~14d";
  if (repetitions === 4) return "~30d";
  return `~${Math.round(interval * easeFactor)}d+`;
}

/**
 * Computes 0% to 100% learning mastery percentage and metadata for a card
 */
export function calculateCardMastery(
  repetitions: number,
  interval: number,
  hasBeenReviewed: boolean
): CardMastery {
  if (!hasBeenReviewed || (repetitions === 0 && interval === 0)) {
    return {
      percentage: 0,
      label: "New",
      colorClass: "bg-slate-500",
      badgeBg: "bg-slate-500/10",
      badgeText: "text-slate-600 dark:text-slate-400 border-slate-500/20",
    };
  }

  let percentage = 0;
  if (repetitions === 0) percentage = 10;
  else if (repetitions === 1) percentage = 25;
  else if (repetitions === 2) percentage = 45;
  else if (repetitions === 3) percentage = 65;
  else if (repetitions === 4) percentage = 85;
  else percentage = 100;

  if (interval >= 30) percentage = 100;
  else if (interval >= 14 && percentage < 85) percentage = 85;

  if (percentage >= 100) {
    return {
      percentage: 100,
      label: "Mastered",
      colorClass: "bg-emerald-500",
      badgeBg: "bg-emerald-500/10",
      badgeText: "text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  }
  if (percentage >= 70) {
    return {
      percentage,
      label: "Advanced",
      colorClass: "bg-indigo-500",
      badgeBg: "bg-indigo-500/10",
      badgeText: "text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    };
  }
  if (percentage >= 40) {
    return {
      percentage,
      label: "In Progress",
      colorClass: "bg-blue-500",
      badgeBg: "bg-blue-500/10",
      badgeText: "text-blue-600 dark:text-blue-400 border-blue-500/20",
    };
  }
  return {
    percentage,
    label: "Learning",
    colorClass: "bg-amber-500",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-600 dark:text-amber-400 border-amber-500/20",
  };
}

/**
 * Computes time remaining until next scheduled review
 */
export function getTimeUntilReview(dueDate: Date | string | null | undefined): {
  label: string;
  isDue: boolean;
  diffMinutes: number;
} {
  if (!dueDate) {
    return { label: "Ready now", isDue: true, diffMinutes: 0 };
  }
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes <= 0) {
    return { label: "Ready now", isDue: true, diffMinutes };
  }

  if (diffMinutes < 60) {
    return { label: `in ${Math.max(1, diffMinutes)}m`, isDue: false, diffMinutes };
  }

  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) {
    return { label: `in ${hours}h`, isDue: false, diffMinutes };
  }

  const days = Math.round(hours / 24);
  return { label: `in ${days}d`, isDue: false, diffMinutes };
}
