import { NextApiRequest, NextApiResponse } from "next";
import { getCards, createCard, updateCard, deleteCard } from "@/server/cards/route";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return getCards(req, res);
  if (req.method === "POST") return createCard(req, res);
  if (req.method === "PUT") return updateCard(req, res);
  if (req.method === "DELETE") return deleteCard(req, res);
  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res.status(405).json({ message: "Method not allowed" });
}
