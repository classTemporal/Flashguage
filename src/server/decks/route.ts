import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/options";
import { prisma } from "../../../lib/prisma";

export async function getDecks(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decks = await prisma.deck.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { cards: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.status(200).json(decks);
  } catch (error) {
    console.error("Get decks error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createDeck(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id, name, description, isPublic } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required" });
    }

    // If ID is provided and exists for this user, perform update (upsert/update)
    if (id && typeof id === "string") {
      const existing = await prisma.deck.findFirst({
        where: { id, userId: session.user.id },
      });

      if (existing) {
        const updated = await prisma.deck.update({
          where: { id },
          data: {
            name: name.trim(),
            description: description?.trim() || null,
            ...(isPublic !== undefined ? { isPublic: Boolean(isPublic) } : {}),
          },
          include: {
            _count: { select: { cards: true } },
          },
        });
        return res.status(200).json(updated);
      }
    }

    const deck = await prisma.deck.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: Boolean(isPublic),
        userId: session.user.id,
      },
      include: {
        _count: { select: { cards: true } },
      },
    });

    return res.status(201).json(deck);
  } catch (error) {
    console.error("Create/update deck error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateDeck(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id, name, description, isPublic } = req.body;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ message: "Deck id is required" });
    }

    const deck = await prisma.deck.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!deck) {
      return res.status(404).json({ message: "Deck not found" });
    }

    const updated = await prisma.deck.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(isPublic !== undefined ? { isPublic: Boolean(isPublic) } : {}),
      },
      include: {
        _count: { select: { cards: true } },
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Update deck error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteDeck(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ message: "Deck id is required" });
    }

    const deck = await prisma.deck.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!deck) {
      return res.status(404).json({ message: "Deck not found" });
    }

    await prisma.deck.delete({
      where: { id },
    });

    return res.status(200).json({ message: "Deck deleted successfully" });
  } catch (error) {
    console.error("Delete deck error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
