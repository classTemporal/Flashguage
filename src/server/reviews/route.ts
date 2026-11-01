import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/options";
import { prisma } from "@/lib/prisma";
import type { Card } from "@prisma/client";
import { calculateNextReviewWithState } from "@/lib/sm2";
import { getDailyGoalProgress } from "@/lib/stats";

// ─── GET /api/reviews/due ─────────────────────────────────────────────────────
// Returns cards that are due for review. Crucially, also includes cards that
// have NEVER been reviewed (no Review record) — these are always "new" cards
// that should always be available.

export async function getDueReviews(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { deckId, mode, cram, lang } = req.query;
    const isAllMode = mode === "all" || cram === "true";
    const language = typeof lang === "string" && lang !== "all" ? lang : undefined;

    let deckFilter: { deckId?: string; deck?: { targetLanguage?: string; userId?: string } } | undefined;

    if (deckId && typeof deckId === "string" && deckId !== "all") {
      // Verify deck ownership
      const deck = await prisma.deck.findFirst({
        where: { id: deckId, userId: session.user.id },
      });
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      deckFilter = { deckId };
    } else if (language) {
      deckFilter = { deck: { targetLanguage: language, userId: session.user.id } };
    }

    if (isAllMode) {
      // Return ALL cards in the deck / user collection for free practice
      const allCards = await prisma.card.findMany({
        where: {
          ...(deckFilter || {}),
          ...(deckFilter ? {} : { deck: { userId: session.user.id } }),
        },
        include: {
          deck: { select: { id: true, name: true, targetLanguage: true } },
          reviews: {
            where: { userId: session.user.id },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const formatted = allCards.map((c) => {
        const rev = c.reviews[0];
        if (rev) {
          return {
            id: rev.id,
            cardId: c.id,
            easeFactor: rev.easeFactor,
            interval: rev.interval,
            repetitions: rev.repetitions,
            dueDate: rev.dueDate.toISOString(),
            lastReview: rev.lastReview?.toISOString() || null,
            card: c,
            isNew: false,
          };
        }
        return {
          id: `new_${c.id}`,
          cardId: c.id,
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          dueDate: new Date().toISOString(),
          lastReview: null,
          card: c,
          isNew: true,
        };
      });

      return res.status(200).json(formatted);
    }

    // 1. Get cards that have a due review record
    const dueReviews = await prisma.review.findMany({
      where: {
        userId: session.user.id,
        dueDate: { lte: new Date() },
        ...(deckFilter ? { card: deckFilter } : {}),
      },
      include: {
        card: {
          include: {
            deck: { select: { id: true, name: true, targetLanguage: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // 2. Find cards with NO review record for this user (new/unreviewed cards)
    //    These are always due — the user has never seen them.
    const reviewedCardIds = dueReviews.map((r) => r.card.id);

    // Also get IDs of cards scheduled for future (reviewed but not yet due)
    const futureReviewedCardIds = await prisma.review.findMany({
      where: {
        userId: session.user.id,
        dueDate: { gt: new Date() },
        ...(deckFilter ? { card: deckFilter } : {}),
      },
      select: { cardId: true },
    });
    const excludeIds = new Set([
      ...reviewedCardIds,
      ...futureReviewedCardIds.map((r) => r.cardId),
    ]);

    // Cards that exist in the deck but have no Review at all
    const newCards = await prisma.card.findMany({
      where: {
        ...(deckFilter || {}),
        ...(deckFilter ? {} : { deck: { userId: session.user.id } }),
        ...(excludeIds.size > 0 ? { id: { notIn: [...excludeIds] } } : {}),
      },
      include: {
        deck: { select: { id: true, name: true, targetLanguage: true } },
      },
    });

    // Wrap new cards in a synthetic review-like structure for the frontend
    const newCardReviews = newCards.map((card) => ({
      id: `new_${card.id}`,
      cardId: card.id,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      dueDate: new Date().toISOString(),
      lastReview: null,
      card,
      isNew: true,
    }));

    // New cards come first, then due reviews ordered by due date
    const combined = [...newCardReviews, ...dueReviews];

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true, dailyGoal: true },
    });
    const targetDailyGoal = user?.dailyGoal ?? 20;
    const goalProgress = await getDailyGoalProgress(session.user.id, targetDailyGoal, language);
    const remainingToGoal = Math.max(0, goalProgress.goal - goalProgress.current);

    let effectiveLimit = req.query.limit ? Number(req.query.limit) : undefined;
    if (!isAllMode && remainingToGoal > 0) {
      effectiveLimit = effectiveLimit ? Math.min(effectiveLimit, remainingToGoal) : remainingToGoal;
    }

    // If working towards daily goal, ensure batch has enough cards to fulfill remainingToGoal
    if (!isAllMode && effectiveLimit && combined.length < effectiveLimit && combined.length > 0) {
      const deficit = effectiveLimit - combined.length;
      const allDeckCards = await prisma.card.findMany({
        where: {
          ...(deckFilter || {}),
          ...(deckFilter ? {} : { deck: { userId: session.user.id } }),
        },
        include: {
          deck: { select: { id: true, name: true, targetLanguage: true } },
          reviews: { where: { userId: session.user.id } },
        },
      });

      if (allDeckCards.length > 0) {
        const sortedCandidates = [...allDeckCards].sort((a, b) => {
          const repA = a.reviews[0]?.repetitions ?? 0;
          const repB = b.reviews[0]?.repetitions ?? 0;
          if (repA !== repB) return repA - repB;
          return (a.reviews[0]?.interval ?? 0) - (b.reviews[0]?.interval ?? 0);
        });

        for (let i = 0; i < deficit; i++) {
          const cand = sortedCandidates[i % sortedCandidates.length];
          const rev = cand.reviews[0];
          combined.push({
            id: rev ? `${rev.id}_repeat_${i}` : `new_${cand.id}_repeat_${i}`,
            cardId: cand.id,
            easeFactor: rev?.easeFactor ?? 2.5,
            interval: rev?.interval ?? 0,
            repetitions: rev?.repetitions ?? 0,
            dueDate: rev?.dueDate?.toISOString() ?? new Date().toISOString(),
            lastReview: rev?.lastReview?.toISOString() ?? null,
            card: cand,
            isNew: !rev,
          } as any);
        }
      }
    }

    if (effectiveLimit !== undefined && effectiveLimit > 0) {
      return res.status(200).json(combined.slice(0, effectiveLimit));
    }

    return res.status(200).json(combined);
  } catch (error) {
    console.error("Get due reviews error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─── POST /api/reviews ────────────────────────────────────────────────────────

export async function createReview(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { cardId, quality } = req.body;

    if (!cardId || typeof quality !== "number") {
      return res.status(400).json({ message: "cardId and quality are required" });
    }

    if (![1, 3, 5].includes(quality)) {
      return res.status(400).json({ message: "Quality must be 1, 3, or 5" });
    }

    // Verify card ownership via deck
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        deck: { userId: session.user.id },
      },
      include: {
        reviews: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    const existingReview = card.reviews[0] || null;
    const now = new Date();

    let review;

    if (existingReview) {
      const updatedResult = calculateNextReviewWithState(
        quality,
        existingReview.easeFactor,
        existingReview.interval,
        existingReview.repetitions
      );

      review = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          easeFactor: updatedResult.easeFactor,
          interval: updatedResult.interval,
          repetitions: updatedResult.repetitions,
          dueDate: updatedResult.dueDate,
          lastReview: now,
        },
      });
    } else {
      // First time reviewing this card — create review record
      const result = calculateNextReviewWithState(quality, 2.5, 0, 0);

      review = await prisma.review.create({
        data: {
          cardId: card.id,
          userId: session.user.id,
          easeFactor: result.easeFactor,
          interval: result.interval,
          repetitions: result.repetitions,
          dueDate: result.dueDate,
          lastReview: now,
        },
      });
    }

    // Record review action into ReviewLog for accurate daily goal and activity tracking
    await prisma.reviewLog.create({
      data: {
        userId: session.user.id,
        cardId: card.id,
        quality,
        createdAt: now,
      },
    });

    return res.status(201).json(review);
  } catch (error) {
    console.error("Create review error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
