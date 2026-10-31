import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";

export default function StudyIndexPage() {
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
  const cookieLang = context.req.cookies["flashguage_active_lang"];
  const language = typeof lang === "string" && lang.trim() && lang !== "all"
    ? lang.trim()
    : (cookieLang || "en");

  if (deckId && typeof deckId === "string") {
    return {
      redirect: {
        destination: `/study/${encodeURIComponent(deckId)}?lang=${encodeURIComponent(language)}`,
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: `/study/all?lang=${encodeURIComponent(language)}`,
      permanent: false,
    },
  };
};
