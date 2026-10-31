import { NextApiRequest, NextApiResponse } from "next";
import { resolveSemanticImage } from "@/lib/image-search";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const query = (req.method === "POST" ? req.body.query : req.query.query) as string | undefined;
  const definition = (req.method === "POST" ? req.body.definition : req.query.definition) as string | undefined;
  const example = (req.method === "POST" ? req.body.example : req.query.example) as string | undefined;
  const visualQuery = (req.method === "POST" ? req.body.visualQuery : req.query.visualQuery) as string | undefined;
  const page = Number(req.method === "POST" ? req.body.page : req.query.page) || 0;

  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ message: "query parameter is required" });
  }

  try {
    const result = await resolveSemanticImage(
      query.trim(),
      definition?.trim(),
      visualQuery?.trim(),
      page,
      example?.trim()
    );

    return res.status(200).json({
      imageUrl: result.imageUrl,
      candidates: result.candidates,
      query: query.trim(),
      source: result.source,
      title: result.title,
      page,
    });
  } catch (error) {
    console.error("Image search error:", error);
    return res.status(500).json({ message: "Failed to search image" });
  }
}
