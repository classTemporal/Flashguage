import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
import { CURATED_DICTIONARIES } from "@/lib/dictionaries";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid dictionary id" });
  }

  const dictionary = CURATED_DICTIONARIES.find((d) => d.id === id);

  if (!dictionary) {
    return res.status(404).json({ message: "Dictionary not found" });
  }

  // GET: Fetch dictionary metadata and preview cards
  if (req.method === "GET") {
    return res.status(200).json(dictionary);
  }

  // POST: Download dictionary into user's account as a deck with cards
  if (req.method === "POST") {
    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user?.id) {
        return res.status(401).json({ message: "Unauthorized. Please log in to download." });
      }

      // 1. Create a Deck for this dictionary
      const deck = await prisma.deck.create({
        data: {
          name: dictionary.name,
          description: `${dictionary.description} (Imported from Dictionary Store)`,
          userId: session.user.id,
          isPublic: false,
        },
      });

      // 2. Create cards within the new deck
      if (dictionary.cards && dictionary.cards.length > 0) {
        await prisma.card.createMany({
          data: dictionary.cards.map((c) => ({
            deckId: deck.id,
            front: c.front,
            back: c.back,
            tags: JSON.stringify(c.tags || []),
            source: "dictionary-store",
          })),
        });
      }

      return res.status(201).json({
        message: "Dictionary downloaded and installed successfully!",
        deckId: deck.id,
        deckName: deck.name,
        cardCount: dictionary.cards.length,
      });
    } catch (error) {
      console.error("Dictionary download error:", error);
      return res.status(500).json({ message: "Failed to download dictionary" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
