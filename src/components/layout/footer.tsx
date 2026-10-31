import Link from "next/link";
import { useSession } from "next-auth/react";

export function Footer() {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";

  return (
    <footer className="border-t border-border/80 bg-card/60 backdrop-blur-xs py-8 mt-auto transition-colors">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <div className="flex flex-col items-center sm:items-start gap-1 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs shadow-xs">
              FG
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">
              Flashguage
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Modern spaced repetition with SM-2, AI definitions & multi-language learning tracks.
          </p>
        </div>

        {isLoggedIn ? (
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground" aria-label="Footer Navigation">
            <Link href="/dashboard" className="hover:text-primary transition-colors">
              Dashboard
            </Link>
            <Link href="/progress" className="hover:text-primary transition-colors">
              Progress
            </Link>
            <Link href="/decks" className="hover:text-primary transition-colors">
              Decks
            </Link>
            <Link href="/dictionaries" className="hover:text-primary transition-colors">
              Dictionaries
            </Link>
            <Link href="/community" className="hover:text-primary transition-colors">
              Community
            </Link>
            <Link href="/context-picker" className="hover:text-primary transition-colors">
              Context
            </Link>
            <Link href="/import" className="hover:text-primary transition-colors">
              Import
            </Link>
            <Link href="/export" className="hover:text-primary transition-colors">
              Export
            </Link>
            <Link href="/plugins" className="hover:text-primary transition-colors">
              Plugins
            </Link>
            <Link href="/settings" className="hover:text-primary transition-colors">
              Settings
            </Link>
          </nav>
        ) : (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/login" className="hover:text-primary transition-colors font-semibold">
              Sign In
            </Link>
            <span>•</span>
            <Link href="/register" className="hover:text-primary transition-colors font-semibold">
              Create Account
            </Link>
          </div>
        )}
      </div>
    </footer>
  );
}
