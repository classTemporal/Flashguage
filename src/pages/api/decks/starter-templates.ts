import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
import { STARTER_DECKS, StarterDeckTemplate } from "@/lib/starter-decks";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = session.user.id;

  // GET: Fetch list of starter decks with user's import status
  if (req.method === "GET") {
    try {
      const lang = typeof req.query.lang === "string" ? req.query.lang : "en";

      // Check which starter decks the user has already cloned
      const userDecks = await prisma.deck.findMany({
        where: { userId },
        select: { id: true, name: true, targetLanguage: true },
      });

      const userDeckNames = new Set(userDecks.map((d) => d.name.toLowerCase().trim()));

      let matchingTemplates = STARTER_DECKS.filter(
        (deck) => !deck.targetLanguage || deck.targetLanguage === lang || lang === "all"
      );

      // If no language-specific starter decks exist for this track yet, provide universal starter kits
      if (matchingTemplates.length === 0) {
        matchingTemplates = STARTER_DECKS.slice(0, 2).map((d) => ({
          ...d,
          targetLanguage: lang,
        }));
      }

      const availableTemplates = matchingTemplates.map((deck) => ({
        ...deck,
        isImported: userDeckNames.has(deck.name.toLowerCase().trim()),
        matchingUserDeckId: userDecks.find(
          (d) => d.name.toLowerCase().trim() === deck.name.toLowerCase().trim()
        )?.id,
        totalCards: deck.cards.length,
      }));

      return res.status(200).json(availableTemplates);
    } catch (error) {
      console.error("Get starter templates error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // POST: Clone a starter template into the user's account
  if (req.method === "POST") {
    try {
      const { templateId } = req.body;
      if (!templateId || typeof templateId !== "string") {
        return res.status(400).json({ message: "templateId is required" });
      }

      const template = STARTER_DECKS.find((d) => d.id === templateId);
      if (!template) {
        return res.status(404).json({ message: "Starter template not found" });
      }

      // Check if user already has a deck with this name
      const existing = await prisma.deck.findFirst({
        where: {
          userId,
          name: template.name,
          targetLanguage: template.targetLanguage,
        },
      });

      if (existing) {
        return res.status(400).json({
          message: `You already have "${template.name}" in your decks!`,
          deckId: existing.id,
        });
      }

      // Create Deck and Cards in transaction
      const newDeck = await prisma.deck.create({
        data: {
          userId,
          name: template.name,
          description: template.description,
          targetLanguage: template.targetLanguage,
          isPublic: false,
          cards: {
            create: template.cards.map((card) => {
              const mediaObj = {
                imageUrl: card.imageUrl || null,
                image: card.imageUrl || null,
                phonetic: card.phonetic || null,
                partOfSpeech: card.partOfSpeech || null,
                examples: card.example ? [card.example] : [],
                example: card.example || null,
                source: "starter-pack",
              };

              return {
                front: card.front,
                back: card.back,
                tags: JSON.stringify(card.tags),
                source: "starter-template",
                media: JSON.stringify(mediaObj),
              };
            }),
          },
        },
        include: {
          cards: true,
          _count: { select: { cards: true } },
        },
      });

      // Create initial reviews for each card so they are ready for immediate study
      if (newDeck.cards.length > 0) {
        await prisma.review.createMany({
          data: newDeck.cards.map((c) => ({
            cardId: c.id,
            userId,
            easeFactor: 2.5,
            interval: 0,
            repetitions: 0,
            dueDate: new Date(),
            lastReview: null,
          })),
        });
      }

      return res.status(201).json({
        message: `Successfully imported "${template.name}" with ${newDeck.cards.length} cards!`,
        deck: newDeck,
      });
    } catch (error) {
      console.error("Clone starter template error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
