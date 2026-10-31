import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";

interface ParsedCard {
  front: string;
  back: string;
  tags: string[];
}

function parseCsv(raw: string): ParsedCard[] {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const items: ParsedCard[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 2) {
      throw new Error(`CSV line ${i + 1} must have at least front,back`);
    }
    const front = parts[0];
    const back = parts[1];
    const tags = parts.slice(2).filter(Boolean);
    if (!front || !back) {
      throw new Error(`CSV line ${i + 1} has empty front or back`);
    }
    items.push({ front, back, tags });
  }

  return items;
}

function parseJson(raw: string): ParsedCard[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("JSON must be an array of objects");
  }

  return parsed.map((item, idx) => {
    const front = typeof item.front === "string" ? item.front.trim() : "";
    const back = typeof item.back === "string" ? item.back.trim() : "";
    const tags = Array.isArray(item.tags)
      ? item.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
      : typeof item.tags === "string"
        ? item.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [];

    if (!front || !back) {
      throw new Error(`Item at index ${idx} is missing front or back`);
    }

    return { front, back, tags };
  });
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { format, data, deckId } = req.body as {
    format?: "csv" | "json";
    data?: string;
    deckId?: string;
  };

  if (!format || !data || !deckId) {
    return res.status(400).json({
      message: "Missing required fields: format, data, and deckId are required.",
    });
  }

  if (format !== "csv" && format !== "json") {
    return res.status(400).json({ message: "Format must be 'csv' or 'json'" });
  }

  try {
    const deck = await prisma.deck.findFirst({
      where: { id: deckId, userId: session.user.id },
    });

    if (!deck) {
      return res.status(404).json({ message: "Deck not found" });
    }

    let items: ParsedCard[];
    try {
      items = format === "csv" ? parseCsv(data) : parseJson(data);
    } catch (err) {
      return res.status(400).json({
        message: err instanceof Error ? err.message : "Invalid input data",
      });
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!item.front.trim() || !item.back.trim()) {
        skipped++;
        errors.push(`Skipped item ${i + 1}: empty front or back`);
        continue;
      }

      try {
        const card = await prisma.card.create({
          data: {
            front: item.front.trim(),
            back: item.back.trim(),
            tags: JSON.stringify(item.tags),
            deckId,
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
        imported++;
      } catch {
        skipped++;
        errors.push(`Skipped item ${i + 1}: database error`);
      }
    }

    return res.status(200).json({ imported, skipped, errors });
  } catch (error) {
    console.error("Import error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default handler;
