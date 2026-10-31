import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/options";
import { prisma } from "../../../lib/prisma";

export async function getCards(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { deckId } = req.query;

    if (!deckId || typeof deckId !== "string") {
      return res.status(400).json({ message: "deckId is required" });
    }

    if (deckId === "all") {
      const cards = await prisma.card.findMany({
        where: { deck: { userId: session.user.id } },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json(cards);
    }

    const deck = await prisma.deck.findFirst({
      where: { id: deckId, userId: session.user.id },
    });

    if (!deck) {
      return res.status(404).json({ message: "Deck not found" });
    }

    const cards = await prisma.card.findMany({
      where: { deckId },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(cards);
  } catch (error) {
    console.error("Get cards error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createCard(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { front, back, tags, deckId, imageUrl, examples, phonetic, partOfSpeech } = req.body;

    if (!front || !back || !deckId) {
      return res.status(400).json({ message: "Front, back, and deckId are required" });
    }

    const deck = await prisma.deck.findFirst({
      where: { id: deckId, userId: session.user.id },
    });

    if (!deck) {
      return res.status(404).json({ message: "Deck not found" });
    }

    // Build media JSON if any rich fields are provided
    let mediaJson: string | undefined = undefined;
    if (imageUrl || examples || phonetic || partOfSpeech) {
      const mediaObj: Record<string, unknown> = {};
      if (imageUrl) mediaObj.imageUrl = imageUrl;
      if (phonetic) mediaObj.phonetic = phonetic;
      if (partOfSpeech) mediaObj.partOfSpeech = partOfSpeech;
      if (examples) {
        // Accept array or newline-separated string
        mediaObj.examples = Array.isArray(examples)
          ? examples
          : examples.split("\n").map((s: string) => s.trim()).filter(Boolean);
      }
      mediaJson = JSON.stringify(mediaObj);
    }

    const card = await prisma.card.create({
      data: {
        front: front.trim(),
        back: back.trim(),
        tags: Array.isArray(tags) ? JSON.stringify(tags) : (tags || "[]"),
        deckId,
        ...(mediaJson ? { media: mediaJson } : {}),
      },
    });

    // Create initial review so card is immediately available for study
    await prisma.review.create({
      data: {
        cardId: card.id,
        userId: session.user.id,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        dueDate: new Date(),
        lastReview: null,
      },
    });

    return res.status(201).json(card);
  } catch (error) {
    console.error("Create card error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateCard(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id, front, back, tags, imageUrl, examples, phonetic, partOfSpeech } = req.body;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ message: "Card id is required" });
    }

    const card = await prisma.card.findFirst({
      where: {
        id,
        deck: { userId: session.user.id },
      },
    });

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    let mediaJson: string | undefined = undefined;
    if (imageUrl !== undefined || examples !== undefined || phonetic !== undefined || partOfSpeech !== undefined) {
      let existingMedia: Record<string, unknown> = {};
      try {
        if (card.media) existingMedia = JSON.parse(card.media);
      } catch {}

      if (imageUrl !== undefined) existingMedia.imageUrl = imageUrl || undefined;
      if (phonetic !== undefined) existingMedia.phonetic = phonetic || undefined;
      if (partOfSpeech !== undefined) existingMedia.partOfSpeech = partOfSpeech || undefined;
      if (examples !== undefined) {
        existingMedia.examples = Array.isArray(examples)
          ? examples
          : examples ? examples.split("\n").map((s: string) => s.trim()).filter(Boolean) : undefined;
      }
      mediaJson = JSON.stringify(existingMedia);
    }

    const updated = await prisma.card.update({
      where: { id },
      data: {
        ...(front !== undefined ? { front: front.trim() } : {}),
        ...(back !== undefined ? { back: back.trim() } : {}),
        ...(tags !== undefined ? { tags: Array.isArray(tags) ? JSON.stringify(tags) : tags } : {}),
        ...(mediaJson !== undefined ? { media: mediaJson } : {}),
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Update card error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteCard(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = (req.query.id as string) || req.body?.id;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ message: "Card id is required" });
    }

    const card = await prisma.card.findFirst({
      where: {
        id,
        deck: { userId: session.user.id },
      },
    });

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    // Delete associated reviews first
    await prisma.review.deleteMany({
      where: { cardId: id },
    });

    await prisma.card.delete({
      where: { id },
    });

    return res.status(200).json({ message: "Card deleted successfully" });
  } catch (error) {
    console.error("Delete card error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
