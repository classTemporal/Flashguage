import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
import {
  calculateCardMastery,
  getTimeUntilReview,
  CardMastery,
} from "@/lib/sm2";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const userId = session.user.id;

  if (req.method === "GET") {
    try {
      const { deckId, status, search } = req.query;

      const whereCard: any = {
        deck: { userId },
      };

      if (deckId && typeof deckId === "string" && deckId !== "all") {
        whereCard.deckId = deckId;
      }

      if (search && typeof search === "string" && search.trim()) {
        const query = search.trim();
        whereCard.OR = [
          { front: { contains: query } },
          { back: { contains: query } },
          { tags: { contains: query } },
        ];
      }

      const cards = await prisma.card.findMany({
        where: whereCard,
        include: {
          deck: {
            select: { id: true, name: true },
          },
          reviews: {
            where: { userId },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const processedCards = cards.map((c) => {
        const rev = c.reviews[0] || null;
        const repetitions = rev?.repetitions ?? 0;
        const interval = rev?.interval ?? 0;
        const easeFactor = rev?.easeFactor ?? 2.5;
        const dueDate = rev?.dueDate ? new Date(rev.dueDate) : new Date();
        const lastReview = rev?.lastReview ? new Date(rev.lastReview) : null;
        const hasBeenReviewed = rev?.lastReview !== null && rev?.lastReview !== undefined;

        const mastery: CardMastery = calculateCardMastery(repetitions, interval, hasBeenReviewed);
        const timeUntil = getTimeUntilReview(rev?.dueDate || null);

        let parsedMedia: any = null;
        try {
          if (c.media) parsedMedia = JSON.parse(c.media);
        } catch {}

        let parsedTags: string[] = [];
        try {
          if (c.tags) {
            const parsed = JSON.parse(c.tags);
            parsedTags = Array.isArray(parsed) ? parsed : [];
          }
        } catch {}

        return {
          id: c.id,
          deckId: c.deckId,
          deckName: c.deck.name,
          front: c.front,
          back: c.back,
          tags: parsedTags,
          media: parsedMedia,
          createdAt: c.createdAt.toISOString(),
          review: {
            id: rev?.id || null,
            repetitions,
            interval,
            easeFactor,
            dueDate: dueDate.toISOString(),
            lastReview: lastReview ? lastReview.toISOString() : null,
            isDue: timeUntil.isDue,
            timeUntilDue: timeUntil.label,
            masteryPercentage: mastery.percentage,
            masteryLabel: mastery.label,
            masteryColorClass: mastery.colorClass,
            badgeBg: mastery.badgeBg,
            badgeText: mastery.badgeText,
          },
        };
      });

      // Filter by status if requested
      let filtered = processedCards;
      if (status === "due") {
        filtered = processedCards.filter((c) => c.review.isDue);
      } else if (status === "in_progress") {
        filtered = processedCards.filter(
          (c) => c.review.masteryPercentage > 0 && c.review.masteryPercentage < 100
        );
      } else if (status === "mastered") {
        filtered = processedCards.filter((c) => c.review.masteryPercentage === 100);
      } else if (status === "new") {
        filtered = processedCards.filter(
          (c) => c.review.masteryPercentage === 0 && !c.review.lastReview
        );
      }

      // Compute statistics across all cards for this user/deck
      const totalCount = processedCards.length;
      const dueCount = processedCards.filter((c) => c.review.isDue).length;
      const inProgressCount = processedCards.filter(
        (c) => c.review.masteryPercentage > 0 && c.review.masteryPercentage < 100
      ).length;
      const masteredCount = processedCards.filter(
        (c) => c.review.masteryPercentage === 100
      ).length;
      const newCount = processedCards.filter(
        (c) => c.review.masteryPercentage === 0 && !c.review.lastReview
      ).length;

      const totalMastery = processedCards.reduce(
        (acc, c) => acc + c.review.masteryPercentage,
        0
      );
      const averageMastery = totalCount > 0 ? Math.round(totalMastery / totalCount) : 0;

      return res.status(200).json({
        cards: filtered,
        stats: {
          totalCount,
          dueCount,
          inProgressCount,
          masteredCount,
          newCount,
          averageMastery,
        },
      });
    } catch (error) {
      console.error("Progress cards query error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    try {
      const { cardId, action, intervalDays } = req.body;
      if (!cardId || typeof cardId !== "string" || !action) {
        return res.status(400).json({ message: "cardId and action are required" });
      }

      // Verify user owns the card
      const card = await prisma.card.findFirst({
        where: {
          id: cardId,
          deck: { userId },
        },
      });

      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }

      const existingReview = await prisma.review.findUnique({
        where: {
          cardId_userId: {
            cardId,
            userId,
          },
        },
      });

      let updatedData: {
        repetitions: number;
        interval: number;
        easeFactor: number;
        dueDate: Date;
        lastReview?: Date | null;
      };

      const now = new Date();

      if (action === "review_now") {
        // Bring card to review queue right now
        updatedData = {
          repetitions: existingReview?.repetitions ?? 0,
          interval: 0,
          easeFactor: existingReview?.easeFactor ?? 2.5,
          dueDate: new Date(now.getTime() - 10000), // 10s in the past to ensure isDue
          lastReview: existingReview?.lastReview ?? null,
        };
      } else if (action === "review_tomorrow") {
        // Bring card to review tomorrow (reduce interval to 1 day)
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        updatedData = {
          repetitions: Math.max(1, existingReview?.repetitions ?? 1),
          interval: 1,
          easeFactor: existingReview?.easeFactor ?? 2.5,
          dueDate: tomorrow,
          lastReview: existingReview?.lastReview ?? now,
        };
      } else if (action === "mark_mastered") {
        // Mark as 100% Mastered (so it doesn't appear in daily reviews)
        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + 180); // 6 months

        updatedData = {
          repetitions: 5,
          interval: 180,
          easeFactor: 2.8,
          dueDate: futureDate,
          lastReview: now,
        };
      } else if (action === "reset") {
        // Reset back to new (0% progress)
        updatedData = {
          repetitions: 0,
          interval: 0,
          easeFactor: 2.5,
          dueDate: now,
          lastReview: null,
        };
      } else if (action === "adjust_interval") {
        const days = Math.max(1, Number(intervalDays) || 1);
        const nextDue = new Date(now);
        nextDue.setDate(nextDue.getDate() + days);
        nextDue.setHours(0, 0, 0, 0);

        updatedData = {
          repetitions: existingReview?.repetitions ?? 1,
          interval: days,
          easeFactor: existingReview?.easeFactor ?? 2.5,
          dueDate: nextDue,
          lastReview: existingReview?.lastReview ?? now,
        };
      } else {
        return res.status(400).json({ message: "Unknown action" });
      }

      const updatedReview = await prisma.review.upsert({
        where: {
          cardId_userId: {
            cardId,
            userId,
          },
        },
        create: {
          cardId,
          userId,
          ...updatedData,
        },
        update: updatedData,
      });

      const mastery = calculateCardMastery(
        updatedReview.repetitions,
        updatedReview.interval,
        updatedReview.lastReview !== null
      );
      const timeUntil = getTimeUntilReview(updatedReview.dueDate);

      return res.status(200).json({
        review: updatedReview,
        mastery,
        timeUntil,
        message: "Card progress updated successfully",
      });
    } catch (error) {
      console.error("Progress card action error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
