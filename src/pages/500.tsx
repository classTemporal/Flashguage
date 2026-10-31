import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function Custom500() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        {/* Visual illustration / icon badge */}
        <div className="relative mb-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-inner">
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
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <span className="absolute -bottom-2 -right-2 rounded-md bg-destructive px-2 py-0.5 text-xs font-mono font-bold text-destructive-foreground shadow-sm">
            500
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Internal Server Error
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm">
          Our servers encountered an unexpected issue while processing your request. Don&apos;t worry, your flashcards and learning progress are safe.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href="/" as="link" size="md">
            Return Home
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
