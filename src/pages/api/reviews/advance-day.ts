import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { deckId, days = 1 } = req.body;
    const daysShift = Math.max(1, Number(days) || 1);

    const where: any = { userId: session.user.id };
    if (deckId && typeof deckId === "string") {
      where.card = { deckId };
    }

    const reviews = await prisma.review.findMany({
      where,
      select: { id: true, dueDate: true },
    });

    const updates = reviews.map((r) => {
      const newDue = new Date(r.dueDate.getTime() - daysShift * 24 * 60 * 60 * 1000);
      return prisma.review.update({
        where: { id: r.id },
        data: { dueDate: newDue },
      });
    });

    await prisma.$transaction(updates);

    return res.status(200).json({
      message: `Simulated +${daysShift} day(s) forward!`,
      affectedReviews: reviews.length,
    });
  } catch (error) {
    console.error("Advance day error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
