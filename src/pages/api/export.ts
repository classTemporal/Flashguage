import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";

function buildCsv(cards: { front: string; back: string; tags: string }[]): string {
  const header = "front,back,tags";
  const rows = cards.map((c) => {
    const front = escapeCsv(c.front);
    const back = escapeCsv(c.back);
    const tags = c.tags || "[]";
    return `${front},${back},${tags}`;
  });
  return [header, ...rows].join("\n");
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function buildJson(cards: { front: string; back: string; tags: string }[]): string {
  return JSON.stringify(
    cards.map((c) => ({
      front: c.front,
      back: c.back,
      tags: c.tags ? JSON.parse(c.tags) : [],
    })),
    null,
    2
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { deckId, format } = req.query;

  if (typeof deckId !== "string" || deckId.trim().length === 0) {
    return res.status(400).json({ message: "deckId is required" });
  }

  const fmt = typeof format === "string" ? format.toLowerCase() : "json";
  if (fmt !== "csv" && fmt !== "json") {
    return res.status(400).json({ message: "format must be 'csv' or 'json'" });
  }

  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: session.user.id },
    select: { id: true, name: true },
  });

  if (!deck) {
    return res.status(404).json({ message: "Deck not found" });
  }

  const cards = await prisma.card.findMany({
    where: { deckId },
    select: { front: true, back: true, tags: true },
    orderBy: { createdAt: "asc" },
  });

  const safeName = deck.name.replace(/[^a-z0-Z_-]/g, "_").toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `${safeName}_${timestamp}.${fmt}`;

  const content = fmt === "csv" ? buildCsv(cards) : buildJson(cards);

  res.setHeader("Content-Type", fmt === "csv" ? "text/csv" : "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Cache-Control", "no-store");

  return res.status(200).send(content);
}
