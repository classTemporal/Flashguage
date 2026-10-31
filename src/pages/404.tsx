import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function Custom404() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        {/* Visual illustration / icon badge */}
        <div className="relative mb-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <span className="absolute -bottom-2 -right-2 rounded-md bg-primary px-2 py-0.5 text-xs font-mono font-bold text-primary-foreground shadow-sm">
            404
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Page Not Found
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm">
          The flashcard, deck, or page you were looking for doesn&apos;t exist or has moved. Like an idiom taken too literally, it seems lost in translation.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href="/dashboard" as="link" size="md">
            Go to Dashboard
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => window.history.back()}
          >
            ← Previous Page
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
