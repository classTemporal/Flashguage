import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground text-balance sm:text-5xl">
              Learn English with{" "}
              <span className="text-primary">smart flashcards</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Spaced repetition, AI-powered examples, and offline support.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5 text-left">
              <div className="text-2xl mb-2">🧠</div>
              <h3 className="font-semibold text-foreground">SM-2 Algorithm</h3>
              <p className="text-sm text-muted-foreground">
                Scientifically proven spaced repetition
              </p>
            </Card>
            <Card className="p-5 text-left">
              <div className="text-2xl mb-2">🤖</div>
              <h3 className="font-semibold text-foreground">AI Generated</h3>
              <p className="text-sm text-muted-foreground">
                Definitions and examples on demand
              </p>
            </Card>
            <Card className="p-5 text-left">
              <div className="text-2xl mb-2">📱</div>
              <h3 className="font-semibold text-foreground">Offline Ready</h3>
              <p className="text-sm text-muted-foreground">
                Study anywhere, sync when online
              </p>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button href="/login" as="link" size="lg">
              Sign In
            </Button>
            <Button href="/register" as="link" variant="secondary" size="lg">
              Create Account
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Free and open source. Built with Next.js + Tailwind.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (session) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }
  return { props: {} };
};
