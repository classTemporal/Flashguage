"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import {
  SUPPORTED_LANGUAGES,
  getLanguage,
  setStoredActiveLanguage,
  getPinnedTracks,
  setStoredPinnedTracks,
  getTrackAccessTimes,
  recordTrackAccess,
} from "@/lib/languages";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Deck {
  id: string;
  name: string;
  targetLanguage?: string;
  updatedAt?: string;
  createdAt?: string;
  _count?: { cards: number };
}

interface DueReview {
  id: string;
  card?: {
    deck?: {
      targetLanguage?: string;
    };
  };
}

export default function TracksPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [pinnedTracks, setPinnedTracks] = useState<string[]>([]);
  const [accessTimes, setAccessTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    setPinnedTracks(getPinnedTracks());
    setAccessTimes(getTrackAccessTimes());
  }, []);

  const { data: decks, isLoading: decksLoading } = useSWR<Deck[]>("/api/decks", fetcher);
  const { data: dueReviews } = useSWR<DueReview[]>("/api/reviews/due", fetcher);

  // Group user decks, due counts, and latest update timestamps by language
  const userTrackStats = useMemo(() => {
    const map = new Map<string, { deckCount: number; cardCount: number; dueCount: number; latestDeckTime: number }>();

    if (Array.isArray(decks)) {
      decks.forEach((d) => {
        const lang = d.targetLanguage || "en";
        const current = map.get(lang) || { deckCount: 0, cardCount: 0, dueCount: 0, latestDeckTime: 0 };
        current.deckCount += 1;
        current.cardCount += d._count?.cards || 0;
        const dTime = d.updatedAt ? new Date(d.updatedAt).getTime() : d.createdAt ? new Date(d.createdAt).getTime() : 0;
        if (dTime > current.latestDeckTime) {
          current.latestDeckTime = dTime;
        }
        map.set(lang, current);
      });
    }

    if (Array.isArray(dueReviews)) {
      dueReviews.forEach((r) => {
        const lang = r.card?.deck?.targetLanguage || "en";
        const current = map.get(lang);
        if (current) {
          current.dueCount += 1;
        }
      });
    }

    return map;
  }, [decks, dueReviews]);

  // All active and pinned track codes
  const displayTrackCodes = useMemo(() => {
    const set = new Set<string>();
    userTrackStats.forEach((_, code) => set.add(code));
    pinnedTracks.forEach((code) => set.add(code));
    return Array.from(set);
  }, [userTrackStats, pinnedTracks]);

  // Sort: Pinned first -> Most recently accessed / updated -> Most cards -> Alphabetical
  const sortedTrackCodes = useMemo(() => {
    return [...displayTrackCodes].sort((a, b) => {
      const aPinned = pinnedTracks.includes(a);
      const bPinned = pinnedTracks.includes(b);

      // 1. Pinned favorites first
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // 2. Most recent access time or deck update time
      const aTime = accessTimes[a] || userTrackStats.get(a)?.latestDeckTime || 0;
      const bTime = accessTimes[b] || userTrackStats.get(b)?.latestDeckTime || 0;
      if (aTime !== bTime) return bTime - aTime;

      // 3. Fallback: card count descending
      const aCards = userTrackStats.get(a)?.cardCount || 0;
      const bCards = userTrackStats.get(b)?.cardCount || 0;
      if (aCards !== bCards) return bCards - aCards;

      return a.localeCompare(b);
    });
  }, [displayTrackCodes, pinnedTracks, accessTimes, userTrackStats]);

  const handleTogglePin = (code: string) => {
    const lang = getLanguage(code);
    setPinnedTracks((prev) => {
      const isPinned = prev.includes(code);
      const updated = isPinned ? prev.filter((c) => c !== code) : [...prev, code];
      setStoredPinnedTracks(updated);
      if (isPinned) {
        showToast(`Unpinned ${lang.name} from favorites`, "info");
      } else {
        showToast(`📌 Pinned ${lang.name} to favorites!`, "success");
      }
      return updated;
    });
  };

  const handleSelectTrack = (code: string) => {
    const updated = recordTrackAccess(code);
    setAccessTimes(updated);
    setStoredActiveLanguage(code);
    router.push(`/dashboard?lang=${encodeURIComponent(code)}`);
  };

  if (decksLoading) {
    return <LoadingPage message="Loading learning tracks..." />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-24 md:pb-6">
      <Header />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 space-y-10">
        {/* Hero Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-xs font-bold text-primary">
            <span>🌐 Learning Tracks</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Choose Your Learning Track
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Every language has its own independent dashboard, daily goals, decks, and spaced repetition schedule. Select a track to begin.
          </p>
        </div>

        {/* Section 1: Your Active Learning Tracks & Pinned Favorites */}
        {sortedTrackCodes.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Your Active Tracks ({sortedTrackCodes.length})
              </h2>
              <span className="text-[11px] font-semibold text-muted-foreground/80 bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/60 self-start sm:self-auto flex items-center gap-1.5">
                <span>📌 Pinned first</span>
                <span>•</span>
                <span>Sorted by most recent</span>
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedTrackCodes.map((code) => {
                const lang = getLanguage(code);
                const stats = userTrackStats.get(code) || { deckCount: 0, cardCount: 0, dueCount: 0, latestDeckTime: 0 };
                const isPinned = pinnedTracks.includes(code);

                return (
                  <div
                    key={code}
                    className={`group relative bg-card border rounded-3xl p-6 shadow-xs hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between ${
                      isPinned ? "border-amber-500/40 bg-gradient-to-b from-card via-card to-amber-500/5 ring-1 ring-amber-500/20" : "border-border"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl shrink-0" role="img" aria-label={lang.name}>
                            {lang.flag}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors">
                                {lang.name}
                              </h3>
                              {isPinned && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  📌 Pinned
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">
                              {lang.nativeName}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {stats.dueCount > 0 ? (
                            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                              ⚡ {stats.dueCount} due
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              ✓ Ready
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePin(code);
                            }}
                            className={`p-1.5 rounded-xl border transition-all ${
                              isPinned
                                ? "bg-amber-500/20 border-amber-500/40 text-amber-500 shadow-xs hover:bg-amber-500/30"
                                : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                            }`}
                            title={isPinned ? "Unpin favorite track" : "Pin track as favorite"}
                            aria-label={isPinned ? `Unpin ${lang.name}` : `Pin ${lang.name}`}
                          >
                            <span className="text-base leading-none">{isPinned ? "📌" : "🤍"}</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                        <div className="rounded-xl bg-muted/40 p-2.5 text-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Decks
                          </span>
                          <span className="text-base font-black text-foreground">
                            {stats.deckCount}
                          </span>
                        </div>
                        <div className="rounded-xl bg-muted/40 p-2.5 text-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Cards
                          </span>
                          <span className="text-base font-black text-foreground">
                            {stats.cardCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-3">
                      <Button
                        type="button"
                        onClick={() => handleSelectTrack(code)}
                        className="w-full font-bold shadow-xs bg-primary text-primary-foreground hover:opacity-90 gap-1.5"
                      >
                        <span>Open {lang.name} Dashboard</span>
                        <span aria-hidden="true">→</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 2: Explore Other Languages to Learn */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {sortedTrackCodes.length > 0 ? "Start Another Language Track" : "Available Languages"}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SUPPORTED_LANGUAGES.filter((l) => !sortedTrackCodes.includes(l.code)).map((lang) => (
              <div
                key={lang.code}
                className="bg-card border border-border rounded-3xl p-5 shadow-xs hover:border-primary/40 hover:shadow-md transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-3xl shrink-0" role="img" aria-label={lang.name}>
                    {lang.flag}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground truncate">
                      {lang.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate font-medium">
                      {lang.nativeName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(lang.code)}
                    className="p-2 rounded-xl border border-border/60 text-muted-foreground hover:text-amber-500 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all text-xs"
                    title={`Pin ${lang.name} as favorite`}
                    aria-label={`Pin ${lang.name}`}
                  >
                    <span>🤍</span>
                  </button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSelectTrack(lang.code)}
                    className="font-bold text-xs gap-1 hover:border-primary/40"
                  >
                    <span>Start Track</span>
                    <span>→</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
};
