import { NextApiRequest, NextApiResponse } from "next";
import { getDecks, createDeck, updateDeck, deleteDeck } from "@/server/decks/route";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return getDecks(req, res);
  if (req.method === "POST") return createDeck(req, res);
  if (req.method === "PUT" || req.method === "PATCH") return updateDeck(req, res);
  if (req.method === "DELETE") return deleteDeck(req, res);

  res.setHeader("Allow", ["GET", "POST", "PUT", "PATCH", "DELETE"]);
  return res.status(405).json({ message: "Method not allowed" });
}
