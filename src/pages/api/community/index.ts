import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";
import { CURATED_DICTIONARIES } from "@/lib/dictionaries";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET: Fetch all public community decks + community dictionary decks
  if (req.method === "GET") {
    try {
      const { search, tag } = req.query;

      const decks = await prisma.deck.findMany({
        where: {
          isPublic: true,
          ...(typeof search === "string" && search.trim()
            ? {
                OR: [
                  { name: { contains: search.trim() } },
                  { description: { contains: search.trim() } },
                ],
              }
            : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          cards: {
            select: {
              id: true,
              front: true,
              back: true,
              tags: true,
            },
            take: 5, // preview first 5 cards
          },
          _count: {
            select: { cards: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      // Format user public decks
      const formattedUserDecks = decks.map((deck) => {
        let allTags: string[] = [];
        deck.cards.forEach((c) => {
          try {
            if (c.tags && c.tags !== "[]") {
              const parsed = JSON.parse(c.tags);
              if (Array.isArray(parsed)) allTags.push(...parsed);
            }
          } catch {
            // ignore
          }
        });
        const uniqueTags = Array.from(new Set(allTags));

        return {
          id: deck.id,
          name: deck.name,
          description: deck.description,
          isPublic: deck.isPublic,
          isDictionaryPack: false,
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt,
          author: deck.user.name || deck.user.email.split("@")[0],
          cardCount: deck._count.cards,
          rating: 4.8,
          tags: uniqueTags.length > 0 ? uniqueTags : ["vocabulary", "community"],
          previewCards: deck.cards,
        };
      });

      // Format curated dictionary packs as Community Dictionary Decks
      const formattedDictPacks = CURATED_DICTIONARIES.map((dict) => ({
        id: `dict_${dict.id}`,
        dictionaryId: dict.id,
        name: dict.name,
        description: dict.description,
        isPublic: true,
        isDictionaryPack: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: dict.author,
        cardCount: dict.cardCount,
        rating: dict.rating,
        tags: ["dictionary", dict.category.toLowerCase(), ...dict.tags],
        previewCards: dict.cards.slice(0, 5).map((c, i) => ({
          id: `preview_${i}`,
          front: c.front,
          back: c.back,
        })),
      }));

      // Combine user public decks and community dictionary decks
      let combined = [...formattedUserDecks, ...formattedDictPacks];

      if (typeof search === "string" && search.trim()) {
        const q = search.toLowerCase().trim();
        combined = combined.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.description?.toLowerCase().includes(q) ||
            d.author.toLowerCase().includes(q) ||
            d.tags.some((t) => t.toLowerCase().includes(q))
        );
      }

      if (typeof tag === "string" && tag.trim() && tag !== "All") {
        combined = combined.filter((deck) =>
          deck.tags.some((t) => t.toLowerCase() === tag.toLowerCase().trim())
        );
      }

      return res.status(200).json(combined);
    } catch (error) {
      console.error("Community decks GET error:", error);
      return res.status(500).json({ message: "Failed to fetch community decks" });
    }
  }

  // POST: Clone / Install community deck to user's account
  if (req.method === "POST") {
    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user?.id) {
        return res.status(401).json({ message: "Unauthorized. Please sign in to clone decks." });
      }

      const { deckId } = req.body;
      if (!deckId || typeof deckId !== "string") {
        return res.status(400).json({ message: "deckId is required" });
      }

      // Check if this is a Community Dictionary Deck
      if (deckId.startsWith("dict_")) {
        const dictId = deckId.replace("dict_", "");
        const dictionary = CURATED_DICTIONARIES.find((d) => d.id === dictId);

        if (!dictionary) {
          return res.status(404).json({ message: "Dictionary deck not found" });
        }

        // Create deck for current user
        const clonedDeck = await prisma.deck.create({
          data: {
            name: `${dictionary.name} (Dictionary)`,
            description: `${dictionary.description} [Shared by ${dictionary.author}]`,
            userId: session.user.id,
            isPublic: false,
          },
        });

        // Insert all cards
        if (dictionary.cards && dictionary.cards.length > 0) {
          await prisma.card.createMany({
            data: dictionary.cards.map((c) => ({
              deckId: clonedDeck.id,
              front: c.front,
              back: c.back,
              tags: JSON.stringify(c.tags || [dictionary.category.toLowerCase()]),
              source: `dictionary:${dictionary.id}`,
            })),
          });
          // Fetch the created cards and create Review records so they appear in study
          const createdCards = await prisma.card.findMany({
            where: { deckId: clonedDeck.id },
            select: { id: true },
          });
          if (createdCards.length > 0) {
            await prisma.review.createMany({
              data: createdCards.map((card) => ({
                cardId: card.id,
                userId: session.user.id,
                easeFactor: 2.5,
                interval: 0,
                repetitions: 0,
                dueDate: new Date(),
                lastReview: null,
              })),
            });
          }
        }

        return res.status(201).json({
          message: `Installed "${dictionary.name}" to your decks!`,
          deckId: clonedDeck.id,
          name: clonedDeck.name,
          cardCount: dictionary.cardCount,
        });
      }

      // 1. Fetch public deck and ALL its cards
      const sourceDeck = await prisma.deck.findFirst({
        where: { id: deckId, isPublic: true },
        include: {
          cards: true,
          user: { select: { name: true, email: true } },
        },
      });

      if (!sourceDeck) {
        return res.status(404).json({ message: "Community deck not found or is private." });
      }

      const authorName = sourceDeck.user.name || sourceDeck.user.email.split("@")[0];

      // 2. Create copied Deck for current user
      const clonedDeck = await prisma.deck.create({
        data: {
          name: `${sourceDeck.name} (Community)`,
          description: sourceDeck.description
            ? `${sourceDeck.description} [Shared by ${authorName}]`
            : `Shared by ${authorName} from the Community`,
          userId: session.user.id,
          isPublic: false,
        },
      });

      // 3. Duplicate all cards into user's account
      if (sourceDeck.cards.length > 0) {
        await prisma.card.createMany({
          data: sourceDeck.cards.map((c) => ({
            deckId: clonedDeck.id,
            front: c.front,
            back: c.back,
            tags: c.tags,
            source: `community:${sourceDeck.id}`,
          })),
        });
        // Create Review records so cloned cards are immediately available for study
        const createdCards = await prisma.card.findMany({
          where: { deckId: clonedDeck.id },
          select: { id: true },
        });
        if (createdCards.length > 0) {
          await prisma.review.createMany({
            data: createdCards.map((card) => ({
              cardId: card.id,
              userId: session.user.id,
              easeFactor: 2.5,
              interval: 0,
              repetitions: 0,
              dueDate: new Date(),
              lastReview: null,
            })),
          });
        }
      }

      return res.status(201).json({
        message: "Deck successfully cloned to your account!",
        deckId: clonedDeck.id,
        name: clonedDeck.name,
        cardCount: sourceDeck.cards.length,
      });
    } catch (error) {
      console.error("Clone community deck error:", error);
      return res.status(500).json({ message: "Failed to clone community deck" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
