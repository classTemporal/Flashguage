import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/lib/prisma";

export default function StudyPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.user?.id) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const { deckId, lang } = context.query;
  const language = typeof lang === "string" && lang !== "all" ? lang : undefined;

  if (deckId && typeof deckId === "string") {
    return {
      redirect: {
        destination: `/study/${encodeURIComponent(deckId)}`,
        permanent: false,
      },
    };
  }

  // 1. Find the first deck that has due reviews for this user (matching language if provided)
  const dueReview = await prisma.review.findFirst({
    where: {
      userId: session.user.id,
      dueDate: { lte: new Date() },
      ...(language ? { card: { deck: { targetLanguage: language } } } : {}),
    },
    include: { card: true },
    orderBy: { dueDate: "asc" },
  });

  if (dueReview?.card?.deckId) {
    return {
      redirect: {
        destination: `/study/${dueReview.card.deckId}`,
        permanent: false,
      },
    };
  }

  // 2. Otherwise find the most recently updated deck that has cards (matching language if provided)
  const userDeck = await prisma.deck.findFirst({
    where: {
      userId: session.user.id,
      cards: { some: {} },
      ...(language ? { targetLanguage: language } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  if (userDeck) {
    return {
      redirect: {
        destination: `/study/${userDeck.id}`,
        permanent: false,
      },
    };
  }

  // 3. If no decks with cards exist, redirect to decks page
  return {
    redirect: {
      destination: "/decks",
      permanent: false,
    },
  };
};
