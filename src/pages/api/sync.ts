import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";

type QueueItem = {
  id: string;
  action: "create" | "update" | "delete";
  entity: "card" | "review" | "deck";
  data: Record<string, unknown>;
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

    const body = req.body as { items: QueueItem[] };
    const items = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return res.status(200).json({ results: [] });
    }

    const results = await Promise.all(
      items.map(async (item) => {
        try {
          if (item.entity === "deck") {
            await applyDeckChange(session.user.id, item);
          } else if (item.entity === "card") {
            await applyCardChange(session.user.id, item);
          } else if (item.entity === "review") {
            await applyReviewChange(session.user.id, item);
          }

          return { id: item.id, success: true };
        } catch {
          return { id: item.id, success: false };
        }
      })
    );

    return res.status(200).json({ results });
  } catch (error) {
    console.error("Sync error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function applyDeckChange(userId: string, item: QueueItem) {
  const data = item.data as { id?: string; name?: string; description?: string };

  if (item.action === "create") {
    await prisma.deck.create({
      data: {
        name: data.name as string,
        description: (data.description as string | null) ?? null,
        userId,
      },
    });
  } else if (item.action === "update" && data.id) {
    await prisma.deck.updateMany({
      where: { id: data.id as string, userId },
      data: {
        name: data.name as string,
        description: (data.description as string | null) ?? null,
      },
    });
  } else if (item.action === "delete" && data.id) {
    await prisma.deck.deleteMany({
      where: { id: data.id as string, userId },
    });
  }
}

async function applyCardChange(userId: string, item: QueueItem) {
  const data = item.data as { id?: string; front?: string; back?: string; tags?: string; deckId?: string };

  if (item.action === "create") {
    await prisma.card.create({
      data: {
        front: data.front as string,
        back: data.back as string,
        tags: data.tags ?? "[]",
        deckId: data.deckId as string,
      },
    });
  } else if (item.action === "update" && data.id) {
    await prisma.card.updateMany({
      where: { id: data.id as string },
      data: {
        front: data.front as string,
        back: data.back as string,
        tags: data.tags ?? "[]",
      },
    });
  } else if (item.action === "delete" && data.id) {
    await prisma.card.deleteMany({
      where: { id: data.id as string },
    });
  }
}

async function applyReviewChange(userId: string, item: QueueItem) {
  const data = item.data as {
    id?: string;
    cardId?: string;
    easeFactor?: number;
    interval?: number;
    repetitions?: number;
    dueDate?: string;
    lastReview?: string;
  };

  if (item.action === "create") {
    await prisma.review.create({
      data: {
        cardId: data.cardId as string,
        userId,
        easeFactor: data.easeFactor ?? 2.5,
        interval: data.interval ?? 0,
        repetitions: data.repetitions ?? 0,
        dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
        lastReview: data.lastReview ? new Date(data.lastReview) : undefined,
      },
    });
  } else if (item.action === "update" && data.id) {
    await prisma.review.updateMany({
      where: { id: data.id as string, userId },
      data: {
        easeFactor: data.easeFactor,
        interval: data.interval,
        repetitions: data.repetitions,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        lastReview: data.lastReview ? new Date(data.lastReview) : undefined,
      },
    });
  } else if (item.action === "delete" && data.id) {
    await prisma.review.deleteMany({
      where: { id: data.id as string, userId },
    });
  }
}
