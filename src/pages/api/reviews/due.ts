import { NextApiRequest, NextApiResponse } from "next";
import { getDueReviews, createReview } from "@/server/reviews/route";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return getDueReviews(req, res);
  if (req.method === "POST") return createReview(req, res);
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ message: "Method not allowed" });
}
