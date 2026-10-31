import { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      aiProvider?: string;
      aiApiKey?: string;
      aiBaseUrl?: string;
      aiModel?: string;
    } & {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword,
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { settings: true },
          });
          if (user?.settings) {
            const parsed = JSON.parse(user.settings);
            session.user.aiProvider = parsed.aiProvider;
            session.user.aiApiKey = parsed.aiApiKey;
            session.user.aiBaseUrl = parsed.aiBaseUrl;
            session.user.aiModel = parsed.aiModel;
          }
        } catch {
          // Ignore error reading settings for session
        }
      }
      return session;
    },
  },
};
