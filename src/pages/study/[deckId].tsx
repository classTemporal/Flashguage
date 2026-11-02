import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { prisma } from "@/lib/prisma";
import { invalidateAppCache } from "@/lib/cache";
import { getNextIntervalPreview, calculateCardMastery } from "@/lib/sm2";
import { speakInLanguage, getSpeechVoice, getLanguage, SUPPORTED_LANGUAGES } from "@/lib/languages";
import { getDailyGoalProgress } from "@/lib/stats";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to load study cards");
  }
  return res.json();
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardMedia {
  imageUrl?: string;
  examples?: string[];
  phonetic?: string;
  partOfSpeech?: string;
}

interface Review {
  id: string;
  cardId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string;
  lastReview: string | null;
  card: {
    id: string;
    front: string;
    back: string;
    tags: string;
    media?: string | null;
    deckId: string;
  };
  isNew?: boolean;
}

type StudyPhase = "question" | "answer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMedia(mediaStr?: string | null): CardMedia {
  if (!mediaStr) return {};
  try {
    return JSON.parse(mediaStr);
  } catch {
    return {};
  }
}

function parseTags(tagsStr: string): string[] {
  try {
    const parsed = JSON.parse(tagsStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Replace every word of `vocab` inside `sentence` with first-letter + block chars */
function blankOutVocab(sentence: string, vocab: string): React.ReactNode[] {
  if (!vocab.trim()) return [sentence];
  const escaped = vocab.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = sentence.split(regex);

  return parts.map((part, i) => {
    if (regex.test(part)) {
      const blanked = part
        .split(" ")
        .map((word) => {
          if (!word) return "";
          return word[0] + "█".repeat(Math.max(0, word.length - 1));
        })
        .join(" ");
      return (
        <span key={i} className="font-mono text-primary font-bold tracking-wider bg-primary/10 px-1.5 py-0.5 rounded">
          {blanked}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function speakText(text: string, langCode: string = "en") {
  speakInLanguage(text, langCode);
}

// ─── Image component with fallback ───────────────────────────────────────────

function CardImage({
  src,
  alt,
  className = "",
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500/10 via-primary/10 to-teal-500/10 text-center p-6 ${className}`}
        aria-label={alt}
      >
        <span className="text-4xl mb-2">💡</span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visual Reference</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden flex items-center justify-center bg-neutral-950/50 ${className}`}>
      {/* Ambient background blur using the same image */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-125 pointer-events-none select-none"
      />
      {/* Foreground sharp uncropped image */}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        className="relative max-h-full max-w-full object-contain z-10 drop-shadow-md select-none transition-transform duration-300"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

// ─── Example Carousel ─────────────────────────────────────────────────────────

function ExampleCarousel({
  examples,
  vocab,
  revealed,
  onSpeakSentence,
}: {
  examples: string[];
  vocab: string;
  revealed: boolean;
  onSpeakSentence?: (text: string) => void;
}) {
  const [idx, setIdx] = useState(0);

  const prev = () => setIdx((i) => (i - 1 + examples.length) % examples.length);
  const next = () => setIdx((i) => (i + 1) % examples.length);

  const sentence = examples[idx] || "";

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-card/60 backdrop-blur shadow-sm p-4 space-y-2.5">
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <span>📖</span> Context Example {examples.length > 1 ? `(${idx + 1}/${examples.length})` : ""}
        </span>
        <div className="flex items-center gap-2">
          {revealed && onSpeakSentence && sentence && (
            <button
              onClick={() => onSpeakSentence(sentence)}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full"
              title="Listen to full sentence"
            >
              <span>🔊</span>
              <span>Listen</span>
            </button>
          )}
          {examples.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={prev}
                className="w-6 h-6 rounded-md bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-xs font-bold transition-colors"
                aria-label="Previous example"
              >
                ‹
              </button>
              <button
                onClick={next}
                className="w-6 h-6 rounded-md bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-xs font-bold transition-colors"
                aria-label="Next example"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="text-sm text-foreground leading-relaxed">
        {revealed ? (
          <span>
            {sentence.includes("___") ? (
              sentence.split(/_{3,}/).map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <strong className="font-extrabold text-primary underline underline-offset-2 mx-1">
                      {vocab}
                    </strong>
                  )}
                </span>
              ))
            ) : (
              sentence
                .split(new RegExp(`(${vocab.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"))
                .map((part, i) =>
                  new RegExp(`^${vocab.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "gi").test(part) ? (
                    <strong key={i} className="font-extrabold text-primary underline underline-offset-2">
                      {part}
                    </strong>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )
            )}
          </span>
        ) : sentence.includes("___") ? (
          <span>
            {sentence.split(/_{3,}/).map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="font-mono text-primary font-bold tracking-wider bg-primary/10 px-2 py-0.5 rounded mx-1">
                    ______
                  </span>
                )}
              </span>
            ))}
          </span>
        ) : (
          blankOutVocab(sentence, vocab)
        )}
      </div>

      {examples.length > 1 && (
        <div className="flex justify-center gap-1 pt-1">
          {examples.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === idx ? "bg-primary w-3" : "bg-muted-foreground/30"
              }`}
              aria-label={`Example ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressRing({
  value,
  max,
  size = 40,
  strokeWidth = 3.5,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max <= 0 ? 0 : Math.min(Math.max(value / max, 0), 1);
  const offset = circumference * (1 - pct);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-label={`Progress: ${value} of ${max}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-muted/30"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="stroke-primary transition-all duration-300 ease-out"
      />
    </svg>
  );
}

// ─── Completion Screen ────────────────────────────────────────────────────────

function CompletionScreen({
  deckId,
  deckName,
  activeLanguage = "en",
  totalReviewed,
  streak,
  againCount,
  reviewLimit = 20,
  sessionBreakMinutes = 5,
  dailyGoalTarget = 20,
  initialDailyGoalCurrent = 0,
  onAdvanceDay,
  isAdvancing,
  isCramMode,
}: {
  deckId: string;
  deckName: string;
  activeLanguage?: string;
  totalReviewed: number;
  streak: number;
  againCount: number;
  reviewLimit?: number;
  sessionBreakMinutes?: number;
  dailyGoalTarget?: number;
  initialDailyGoalCurrent?: number;
  onAdvanceDay: () => void;
  isAdvancing: boolean;
  isCramMode: boolean;
}) {
  const currentLang = getLanguage(activeLanguage);
  const retainedPct = totalReviewed > 0 ? Math.round(((totalReviewed - againCount) / totalReviewed) * 100) : 100;
  const isGoalReached = !isCramMode && initialDailyGoalCurrent + totalReviewed >= dailyGoalTarget;
  const backUrl = deckId === "all" ? `/dashboard?lang=${encodeURIComponent(activeLanguage)}` : `/deck/${deckId}`;
  const backLabel = deckId === "all" ? `Back to ${currentLang.name} Dashboard` : "Back to Deck";

  const [remainingSecs, setRemainingSecs] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(`flashguage_cooldown_${activeLanguage}`);
      if (raw) return Math.max(0, Math.ceil((parseInt(raw, 10) - Date.now()) / 1000));
    } catch {}
    return sessionBreakMinutes * 60;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      try {
        const raw = localStorage.getItem(`flashguage_cooldown_${activeLanguage}`);
        if (raw) {
          const diff = Math.max(0, Math.ceil((parseInt(raw, 10) - Date.now()) / 1000));
          setRemainingSecs(diff);
        }
      } catch {}
    }, 1000);
    return () => clearInterval(timer);
  }, [activeLanguage]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleSkipBreak = () => {
    try {
      localStorage.removeItem(`flashguage_cooldown_${activeLanguage}`);
      window.dispatchEvent(new Event("storage"));
    } catch {}
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center animate-in fade-in duration-300">
      <div className="relative mb-6">
        <div className="text-7xl animate-bounce">{isGoalReached ? "🏆" : "🧠"}</div>
      </div>

      <span className="inline-block rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">
        {isCramMode
          ? "Free Practice Complete"
          : isGoalReached
          ? "🎉 Daily Goal Achieved (100%)"
          : "Session Batch Completed 🎉"}
      </span>

      <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-2 tracking-tight">
        {isGoalReached ? "Daily Goal Completed! 🎉" : "Great study session!"}
      </h1>
      <p className="text-muted-foreground mb-6 max-w-md text-sm">
        {isGoalReached ? (
          <>
            You completed your daily target of <strong className="text-foreground">{dailyGoalTarget} cards</strong> today! Time to rest and let your memory consolidate.
          </>
        ) : (
          <>
            You reviewed <strong className="text-foreground">{totalReviewed}</strong> cards from <strong className="text-foreground">{deckName}</strong>.
          </>
        )}
      </p>

      {/* Brain Break Cooldown Card */}
      {!isCramMode && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 max-w-sm w-full mb-6 text-center space-y-2.5 shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <span>☕</span>
            <span>Brain Break Active (Cooldown)</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You completed your study batch of <strong>{totalReviewed}</strong> card{totalReviewed === 1 ? "" : "s"} (session limit: {reviewLimit}). Take a short <strong>{sessionBreakMinutes}-minute</strong> cognitive break to prevent mental fatigue and consolidate memory before your next batch.
          </p>

          {remainingSecs > 0 ? (
            <div className="pt-2">
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-wider font-mono block">
                ⏳ {formatTimer(remainingSecs)}
              </span>
              <p className="text-[10px] text-muted-foreground mt-1">until your next study batch</p>
            </div>
          ) : (
            <div className="pt-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              🎉 Break complete! You are ready for your next study batch.
            </div>
          )}
        </div>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6">
        <div className="rounded-2xl bg-card border border-border p-3.5 flex flex-col items-center">
          <span className="text-xs text-muted-foreground font-semibold">Reviewed</span>
          <span className="text-2xl font-black text-foreground mt-1">{totalReviewed}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">cards</span>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3.5 flex flex-col items-center">
          <span className="text-xs text-muted-foreground font-semibold">Best Streak</span>
          <span className="text-2xl font-black text-amber-500 mt-1">🔥 {streak}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">consecutive</span>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3.5 flex flex-col items-center">
          <span className="text-xs text-muted-foreground font-semibold">Retention</span>
          <span className="text-2xl font-black text-emerald-500 mt-1">{retainedPct}%</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">accuracy</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2.5 w-full max-w-sm">
        <Link
          href={backUrl}
          className="w-full rounded-2xl bg-primary py-3.5 text-primary-foreground font-bold text-center hover:opacity-90 transition-opacity shadow-md"
        >
          {backLabel}
        </Link>

        {remainingSecs > 0 && !isCramMode && (
          <button
            type="button"
            onClick={handleSkipBreak}
            className="w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 py-3 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/20 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <span>⚡</span> Skip Break & Start Next Batch Now
          </button>
        )}

        <button
          onClick={onAdvanceDay}
          disabled={isAdvancing}
          className="w-full rounded-2xl border border-border bg-card py-3 text-foreground font-semibold hover:bg-muted transition-colors text-sm flex items-center justify-center gap-2"
        >
          <span>⏩</span> {isAdvancing ? "Simulating next day..." : "Simulate Time (+1 Day)"}
        </button>

        <Link
          href={deckId === "all" ? `/study/all?lang=${encodeURIComponent(activeLanguage)}&mode=all` : `/study/${deckId}?mode=all`}
          className="w-full rounded-2xl border border-transparent py-2.5 text-muted-foreground hover:text-foreground font-medium text-xs transition-colors"
        >
          Review Again in Free Practice Mode
        </Link>
      </div>
    </div>
  );
}

// ─── No-cards Screen ──────────────────────────────────────────────────────────

function NoDueCards({
  deckId,
  deckName,
  activeLanguage = "en",
  onAdvanceDay,
  isAdvancing,
}: {
  deckId: string;
  deckName: string;
  activeLanguage?: string;
  onAdvanceDay: () => void;
  isAdvancing: boolean;
}) {
  const currentLang = getLanguage(activeLanguage);
  const backUrl = deckId === "all" ? `/dashboard?lang=${encodeURIComponent(activeLanguage)}` : `/deck/${deckId}`;
  const backLabel = deckId === "all" ? `${currentLang.name} Dashboard` : "Deck";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center animate-in fade-in duration-300">
      <div className="mb-4 text-6xl">🎉</div>
      <span className="inline-block rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">
        {currentLang.flag} {currentLang.name} Track
      </span>
      <h1 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
        All cards caught up!
      </h1>
      <p className="text-muted-foreground mb-8 max-w-sm text-sm">
        {deckId === "all"
          ? `According to your spaced repetition schedule, all cards in your ${currentLang.name} track are currently up to date.`
          : `According to your spaced repetition memory schedule, all vocabulary in ${deckName} is currently reviewed.`}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href={deckId === "all" ? `/study/all?lang=${encodeURIComponent(activeLanguage)}&mode=all` : `/study/${deckId}?mode=all`}
          className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 py-3.5 text-white font-bold text-center transition-colors shadow-md flex items-center justify-center gap-2"
        >
          <span>🎯</span> Free Practice Mode
        </Link>

        <Link
          href={`/decks?lang=${encodeURIComponent(activeLanguage)}`}
          className="w-full rounded-2xl border border-border bg-card py-3 text-foreground font-semibold hover:bg-muted transition-colors text-sm flex items-center justify-center gap-2"
        >
          <span>🗂️</span> Manage {currentLang.name} Decks
        </Link>

        <button
          onClick={onAdvanceDay}
          disabled={isAdvancing}
          className="w-full rounded-2xl border border-dashed border-border bg-card py-2.5 text-foreground font-semibold hover:bg-muted transition-colors text-xs flex items-center justify-center gap-2"
        >
          <span>⏩</span> {isAdvancing ? "Advancing day..." : "Simulate Next Day (+1 Day)"}
        </button>

        <Link
          href={backUrl}
          className="w-full rounded-2xl border border-border py-3 text-muted-foreground hover:text-foreground font-medium text-sm text-center transition-colors"
        >
          ← Back to {backLabel}
        </Link>
      </div>
    </div>
  );
}

// ─── getServerSideProps ───────────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user?.id) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const { deckId, lang } = context.query;
  if (!deckId || typeof deckId !== "string") return { notFound: true };

  const cookieLang = context.req.cookies["flashguage_active_lang"];
  const effectiveLang = typeof lang === "string" && lang.trim() && lang !== "all"
    ? lang.trim()
    : (cookieLang || "en");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { settings: true, dailyGoal: true },
  });

  let reviewLimit = 20;
  let sessionBreakMinutes = 5;
  let timezone = "UTC";
  if (user?.settings) {
    try {
      const parsed = JSON.parse(user.settings as string);
      if (typeof parsed.reviewLimit === "number" && parsed.reviewLimit > 0) {
        reviewLimit = parsed.reviewLimit;
      }
      if (typeof parsed.sessionBreakMinutes === "number" && parsed.sessionBreakMinutes > 0) {
        sessionBreakMinutes = parsed.sessionBreakMinutes;
      }
      if (parsed.timezone && typeof parsed.timezone === "string") {
        timezone = parsed.timezone;
      }
    } catch {}
  }

  const targetDailyGoal = user?.dailyGoal ?? 20;
  const goalProgress = await getDailyGoalProgress(session.user.id, targetDailyGoal, effectiveLang, timezone);
  const remainingToGoal = Math.max(0, goalProgress.goal - goalProgress.current);

  const isCram = context.query.mode === "all";
  const effectiveBatchLimit = !isCram && remainingToGoal > 0
    ? Math.min(reviewLimit, remainingToGoal)
    : reviewLimit;

  if (deckId === "all") {
    return {
      props: {
        session,
        deck: { id: "all", name: "All Decks (Daily Review)", targetLanguage: effectiveLang },
        lang: effectiveLang,
        reviewLimit: effectiveBatchLimit,
        sessionBreakMinutes,
        dailyGoalTarget: targetDailyGoal,
        initialDailyGoalCurrent: goalProgress.current,
      },
    };
  }

  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: session.user.id },
  });

  if (!deck) return { notFound: true };

  return {
    props: {
      session,
      deck: { id: deck.id, name: deck.name, targetLanguage: deck.targetLanguage || effectiveLang },
      lang: deck.targetLanguage || effectiveLang,
      reviewLimit: effectiveBatchLimit,
      sessionBreakMinutes,
      dailyGoalTarget: targetDailyGoal,
      initialDailyGoalCurrent: goalProgress.current,
    },
  };
};

// ─── Main Study Page ──────────────────────────────────────────────────────────

export default function StudySessionPage({
  deck,
  lang: initialLang,
  reviewLimit = 20,
  sessionBreakMinutes = 5,
  dailyGoalTarget = 20,
  initialDailyGoalCurrent = 0,
}: {
  deck: { id: string; name: string; targetLanguage?: string };
  lang?: string;
  reviewLimit?: number;
  sessionBreakMinutes?: number;
  dailyGoalTarget?: number;
  initialDailyGoalCurrent?: number;
}) {
  const router = useRouter();
  const { deckId, mode, lang: queryLang } = router.query;
  const isCramMode = mode === "all";

  const { data: session } = useSession();
  const { showToast } = useToast();

  const activeLanguage =
    (typeof queryLang === "string" && queryLang.trim() && queryLang !== "all" ? queryLang.trim() : null) ||
    deck.targetLanguage ||
    initialLang ||
    (typeof window !== "undefined" ? localStorage.getItem("flashguage_active_lang") : null) ||
    "en";

  // ── Core state ──
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<StudyPhase>("question");
  const [showExamples, setShowExamples] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // ── Practice flavor state (Mixed, Recall Only, Spelling / Typing Only) ──
  const [practiceFlavor, setPracticeFlavor] = useState<"mixed" | "recall" | "spelling">("mixed");
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typingResult, setTypingResult] = useState<"unanswered" | "correct" | "incorrect">("unanswered");

  // ── Queue state (supports re-appending failed cards for in-session mastery) ──
  const [queue, setQueue] = useState<Review[]>([]);
  const [queueInitialized, setQueueInitialized] = useState(false);

  // ── Session stats ──
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [againCount, setAgainCount] = useState(0);
  const [totalReviewed, setTotalReviewed] = useState(0);
  const [revealKey, setRevealKey] = useState(0);

  // ── Auto-pronounce on reveal ──
  const [autoPronounce, setAutoPronounce] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("flashguage_auto_pronounce");
      if (stored !== null) {
        setAutoPronounce(stored !== "false");
      }
    } catch {}
  }, []);

  const effectiveDeckId = deck?.id || (typeof deckId === "string" ? deckId : "");
  const swrUrl = effectiveDeckId
    ? `/api/reviews/due?deckId=${effectiveDeckId}${isCramMode ? "&mode=all" : `&limit=${reviewLimit}`}${
        effectiveDeckId === "all" ? `&lang=${encodeURIComponent(activeLanguage)}` : ""
      }`
    : null;

  const { data: reviews, error, mutate: mutateReviews } = useSWR<Review[]>(swrUrl, fetcher);

  // Initialise local queue when SWR returns
  useEffect(() => {
    if (Array.isArray(reviews) && !queueInitialized) {
      setQueue([...reviews]);
      setQueueInitialized(true);
    }
  }, [reviews, queueInitialized]);

  // Completion check
  useEffect(() => {
    if (queueInitialized && queue.length > 0 && currentIndex >= queue.length) {
      setCompleted(true);
    }
  }, [currentIndex, queue, queueInitialized]);

  // Batch completion cooldown effect
  useEffect(() => {
    if (completed && !isCramMode && queue.length > 0) {
      const cooldownKey = `flashguage_cooldown_${activeLanguage}`;
      try {
        const existing = localStorage.getItem(cooldownKey);
        if (!existing || parseInt(existing, 10) <= Date.now()) {
          const cooldownMs = (sessionBreakMinutes || 5) * 60 * 1000;
          const cooldownEnd = Date.now() + cooldownMs;
          localStorage.setItem(cooldownKey, String(cooldownEnd));
          window.dispatchEvent(new Event("storage"));
        }
      } catch {}
    }
  }, [completed, isCramMode, queue.length, sessionBreakMinutes, activeLanguage]);

  useEffect(() => {
    if (error) showToast("Error loading cards for study", "error");
  }, [error, showToast]);

  // Reset per-card state
  useEffect(() => {
    setPhase("question");
    setShowExamples(false);
    setIsSpeaking(false);
    setTypedAnswer("");
    setTypingResult("unanswered");
    setRevealKey((k) => k + 1);
  }, [currentIndex]);

  const goToNextCard = useCallback(() => {
    setPhase("question");
    setShowExamples(false);
    setIsSpeaking(false);
    setTypedAnswer("");
    setTypingResult("unanswered");
    setRevealKey((k) => k + 1);
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handleRate = useCallback(
    async (quality: number) => {
      if (!queue.length || currentIndex >= queue.length || isSubmitting) return;
      setIsSubmitting(true);
      const currentReview = queue[currentIndex];

      try {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: currentReview.cardId, quality }),
        });
        if (!res.ok) throw new Error("Error submitting review");

        await invalidateAppCache();
        setTotalReviewed((n) => n + 1);

        if (quality === 1) {
          setAgainCount((n) => n + 1);
          setStreak(0);
          showToast("Marked for review in next interval", "info");
        } else {
          setStreak((s) => {
            const next = s + 1;
            setBestStreak((b) => Math.max(b, next));
            return next;
          });
        }

        goToNextCard();
      } catch {
        showToast("Error saving review. Please try again.", "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [queue, currentIndex, isSubmitting, goToNextCard, showToast]
  );

  const currentReview = queue[currentIndex] || null;
  const deckLang = (currentReview?.card as any)?.deck?.targetLanguage || activeLanguage || "en";

  const handleSpeak = useCallback((text: string, customLang?: string) => {
    setIsSpeaking(true);
    speakInLanguage(text, customLang || deckLang);
    setTimeout(() => setIsSpeaking(false), 2000);
  }, [deckLang]);

  const handleAdvanceDay = useCallback(async () => {
    setIsAdvancing(true);
    try {
      const res = await fetch("/api/reviews/advance-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId, lang: activeLanguage }),
      });
      if (!res.ok) throw new Error();
      showToast("Time advanced +1 day! New cards are ready.", "success");
      setQueueInitialized(false);
      setCurrentIndex(0);
      setCompleted(false);
      await mutateReviews();
    } catch {
      showToast("Error advancing day", "error");
    } finally {
      setIsAdvancing(false);
    }
  }, [deckId, activeLanguage, mutateReviews, showToast]);

  // All card-level derivations and hooks MUST run unconditionally before any early returns!
  const card = currentReview?.card || null;
  const media = useMemo(() => parseMedia(card?.media), [card?.media]);
  const tags = useMemo(() => parseTags(card?.tags || "[]"), [card?.tags]);
  const examples = useMemo(() => media.examples?.filter(Boolean) || [], [media.examples]);
  const imageUrl = media.imageUrl;

  const displayImageUrl =
    imageUrl || (card ? `https://source.unsplash.com/400x300/?${encodeURIComponent(card.front)}` : "");

  const badgeLabel =
    media.partOfSpeech?.toUpperCase() || (tags[0] ? tags[0].toUpperCase() : null);

  const remainingInQueue = Math.max(0, queue.length - currentIndex);

  const hardIntervalPreview = currentReview
    ? getNextIntervalPreview(3, currentReview.repetitions ?? 0, currentReview.interval ?? 0, currentReview.easeFactor ?? 2.5)
    : "~1d";

  const masteredIntervalPreview = currentReview
    ? getNextIntervalPreview(5, currentReview.repetitions ?? 0, currentReview.interval ?? 0, currentReview.easeFactor ?? 2.5)
    : "~1d";

  const currentCardMastery = currentReview
    ? calculateCardMastery(currentReview.repetitions ?? 0, currentReview.interval ?? 0, !currentReview.isNew)
    : null;

  const handleDirectMarkMastered = useCallback(async () => {
    if (!queue.length || currentIndex >= queue.length || isSubmitting) return;
    setIsSubmitting(true);
    const rev = queue[currentIndex];
    try {
      const res = await fetch("/api/cards/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: rev.cardId, action: "mark_mastered" }),
      });
      if (!res.ok) throw new Error();
      await invalidateAppCache();
      setTotalReviewed((n) => n + 1);
      showToast("✨ Card graduated to 100% Mastered!", "success");
      goToNextCard();
    } catch {
      showToast("Error updating card", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [queue, currentIndex, isSubmitting, goToNextCard, showToast]);

  const [dynamicPhonetic, setDynamicPhonetic] = useState<string | null>(null);

  useEffect(() => {
    if (media.phonetic) {
      setDynamicPhonetic(media.phonetic);
      return;
    }
    if (!card?.front) {
      setDynamicPhonetic(null);
      return;
    }

    let active = true;
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(card.front.toLowerCase().trim())}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data) && data[0]) {
          const p = data[0].phonetic || data[0].phonetics?.find((x: any) => x.text)?.text;
          if (p) setDynamicPhonetic(p);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [card?.front, media.phonetic]);

  const activePhonetic = media.phonetic || dynamicPhonetic;

  // Interspersed spelling challenge:
  const isTypingCard = useMemo(() => {
    if (practiceFlavor === "recall") return false;
    if (practiceFlavor === "spelling") return true;
    if (!card) return false;
    let hash = 0;
    for (let i = 0; i < card.id.length; i++) {
      hash = (hash << 5) - hash + card.id.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 2 === 1;
  }, [practiceFlavor, card]);

  // Reveal answer handler (explicit user action: Show Answer / Reveal / Spacebar)
  const revealAnswer = useCallback(() => {
    if (phase === "answer") return;
    if (isTypingCard && typingResult === "unanswered") {
      setTypingResult("incorrect");
    }
    setPhase("answer");
    if (autoPronounce && card?.front) {
      handleSpeak(card.front);
    }
  }, [phase, isTypingCard, typingResult, autoPronounce, card?.front, handleSpeak]);

  const handleCheckSpelling = useCallback(() => {
    if (!card) return;
    const cleanTyped = typedAnswer.trim().toLowerCase();
    const cleanFront = card.front.trim().toLowerCase();

    if (cleanTyped === cleanFront) {
      setTypingResult("correct");
      setPhase("answer");
      if (autoPronounce) {
        handleSpeak(card.front);
      }
      showToast("🎉 Perfect spelling!", "success");
    } else {
      setTypingResult("incorrect");
      showToast("Incorrect spelling, check the answer below", "error");
    }
  }, [card, typedAnswer, autoPronounce, handleSpeak, showToast]);

  // Keyboard shortcuts (Space = reveal, 1 = Again, 2 = Hard, 3 = Mastered)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (completed) return;

      if (e.code === "Space" && phase === "question") {
        e.preventDefault();
        revealAnswer();
      } else if (phase === "answer" && !isSubmitting) {
        if (e.key === "1") handleRate(1);
        if (e.key === "2") handleRate(3);
        if (e.key === "3") handleRate(5);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, isSubmitting, completed, handleRate, revealAnswer]);

  // ── Loading state ──
  if (!reviews && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-medium text-sm">Loading study session...</p>
        </div>
      </div>
    );
  }

  const studyBackUrl = deck.id === "all" ? `/dashboard?lang=${encodeURIComponent(activeLanguage)}` : `/deck/${deck.id}`;
  const studyBackLabel = deck.id === "all" ? "Dashboard" : "Deck";

  if (error || (reviews && !Array.isArray(reviews))) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4 px-4 text-center">
        <p className="text-destructive font-bold text-lg">
          {error?.message || "Unable to load cards"}
        </p>
        <Link href={studyBackUrl} className="text-primary hover:underline font-medium">
          ← Back to {studyBackLabel}
        </Link>
      </div>
    );
  }

  if (Array.isArray(reviews) && reviews.length === 0) {
    return (
      <NoDueCards
        deckId={deck.id}
        deckName={deck.name}
        activeLanguage={activeLanguage}
        onAdvanceDay={handleAdvanceDay}
        isAdvancing={isAdvancing}
      />
    );
  }

  if (completed) {
    return (
      <CompletionScreen
        deckId={deck.id}
        deckName={deck.name}
        activeLanguage={activeLanguage}
        totalReviewed={totalReviewed}
        streak={bestStreak}
        againCount={againCount}
        reviewLimit={reviewLimit}
        sessionBreakMinutes={sessionBreakMinutes}
        dailyGoalTarget={dailyGoalTarget}
        initialDailyGoalCurrent={initialDailyGoalCurrent}
        onAdvanceDay={handleAdvanceDay}
        isAdvancing={isAdvancing}
        isCramMode={isCramMode}
      />
    );
  }

  if (!queueInitialized || queue.length === 0 || !card) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border px-4 py-2.5">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          {/* Back button */}
          <Link
            href={studyBackUrl}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Back to ${studyBackLabel}`}
          >
            ←
          </Link>

          {/* Center progress info */}
          <div className="flex items-center gap-3">
            <ProgressRing value={currentIndex} max={queue.length} />
            <div className="text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span>{currentIndex + 1} of {queue.length}</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">
                {isCramMode ? "🎯 Free Practice" : "🧠 SM-2 Spaced Recall"}
              </p>
            </div>
          </div>

          {/* Practice mode pills */}
          <div className="hidden sm:flex items-center bg-muted/60 rounded-full p-0.5 border border-border text-[10px] font-bold">
            <button
              onClick={() => setPracticeFlavor("mixed")}
              className={`px-2 py-1 rounded-full transition-all ${
                practiceFlavor === "mixed" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🔀 Mixed
            </button>
            <button
              onClick={() => setPracticeFlavor("recall")}
              className={`px-2 py-1 rounded-full transition-all ${
                practiceFlavor === "recall" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🧠 Recall
            </button>
            <button
              onClick={() => setPracticeFlavor("spelling")}
              className={`px-2 py-1 rounded-full transition-all ${
                practiceFlavor === "spelling" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ⌨️ Typing
            </button>
          </div>

          {/* Controls: Audio auto-pronounce & Streak */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !autoPronounce;
                setAutoPronounce(next);
                try {
                  localStorage.setItem("flashguage_auto_pronounce", String(next));
                } catch {}
                showToast(next ? "🔊 Auto-pronunciation ON" : "🔇 Auto-pronunciation OFF", "info");
              }}
              className={`flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
                autoPronounce
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-muted/60 text-muted-foreground"
              }`}
              title={autoPronounce ? "Auto-pronounce on reveal: ON" : "Auto-pronounce on reveal: OFF"}
              aria-label="Toggle auto pronunciation"
            >
              <span className="text-xs">{autoPronounce ? "🔊" : "🔇"}</span>
            </button>

            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1">
              <span className="text-sm">🔥</span>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400">{streak}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Study Card Area ── */}
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6 space-y-4 pb-44">
        {/* Memory prompt badge */}
        <div className="flex items-center justify-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/60 px-3 py-0.5 rounded-full">
            {isTypingCard
              ? "⌨️ Spelling Challenge: Type the word"
              : phase === "question"
              ? "Active Recall: Can you remember the word?"
              : "Active Recall Check"}
          </span>
        </div>

        {/* Study Card Container */}
        <div className="rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden transition-all duration-300">
          {/* Definition and Prompt */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {badgeLabel && (
                  <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-0.5 text-[11px] font-bold tracking-wider text-primary uppercase">
                    {badgeLabel}
                  </span>
                )}
                {currentCardMastery && (
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${currentCardMastery.badgeBg} ${currentCardMastery.badgeText}`}
                  >
                    {currentCardMastery.percentage}% Mastery
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
                Remaining: {remainingInQueue}
              </span>
            </div>

            {/* Definition */}
            <p className="text-lg sm:text-xl font-medium text-foreground leading-snug">
              {card.back}
            </p>

            {/* Audio button for question phase: reads definition, NEVER the target word! */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => handleSpeak(card.back)}
                className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isSpeaking
                    ? "bg-primary text-primary-foreground scale-105 shadow-md"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
                aria-label="Listen to definition"
              >
                <span>🔊</span>
                <span>{isSpeaking ? "Playing..." : "Listen Definition"}</span>
              </button>
            </div>

            {/* Interactive Spelling Input Box */}
            {isTypingCard && (
              <div className="pt-3 space-y-2 border-t border-border/60">
                <label className="block text-xs font-bold text-primary uppercase tracking-wider">
                  ⌨️ Spell the word from memory:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && typingResult !== "correct" && typedAnswer.trim()) {
                        handleCheckSpelling();
                      }
                    }}
                    disabled={phase === "answer" && typingResult === "correct"}
                    placeholder="Type the correct spelling..."
                    className={`flex-1 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${
                      typingResult === "correct"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30"
                        : typingResult === "incorrect"
                        ? "border-rose-500 bg-rose-500/10 text-foreground ring-rose-500/30"
                        : "border-border bg-background text-foreground focus:ring-primary"
                    }`}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  {typingResult !== "correct" && (
                    <button
                      type="button"
                      onClick={handleCheckSpelling}
                      disabled={!typedAnswer.trim()}
                      className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 disabled:opacity-50"
                    >
                      Check
                    </button>
                  )}
                </div>

                {typingResult === "correct" && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-between animate-in fade-in">
                    <span>🎉 Perfect spelling!</span>
                  </div>
                )}

                {typingResult === "incorrect" && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1 animate-in fade-in">
                    <p className="font-bold text-rose-600 dark:text-rose-400">
                      ❌ Incorrect. You typed: <span className="font-mono text-foreground">{typedAnswer}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Try again, or click &quot;Show Answer&quot; to reveal.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Visual reference image */}
          <div className="border-t border-border/60 bg-muted/10">
            <CardImage
              src={displayImageUrl}
              alt={card.front}
              className="w-full h-56 sm:h-72"
            />
          </div>

          {/* Context examples toggle before reveal */}
          {phase === "question" && examples.length > 0 && (
            <div className="px-5 py-3 border-t border-border/60 bg-muted/10">
              <button
                onClick={() => setShowExamples((s) => !s)}
                className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-primary hover:underline py-1"
              >
                <span>💡</span>
                <span>{showExamples ? "Hide context clue" : "Show cloze example sentence (Hint)"}</span>
              </button>
            </div>
          )}

          {/* Post-reveal word & phonetics */}
          {phase === "answer" && (
            <div
              key={revealKey}
              className="px-6 py-6 border-t border-border/60 bg-primary/5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 text-center"
            >
              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight capitalize">
                  {card.front}
                </h2>
                {activePhonetic && (
                  <p className="font-mono text-sm sm:text-base text-primary/90 font-bold tracking-wide">
                    {activePhonetic}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => handleSpeak(card.front)}
                  className="flex items-center gap-2 text-xs font-bold text-primary-foreground bg-primary px-4 py-2 rounded-full shadow-xs hover:opacity-90 active:scale-95 transition-all"
                  title="Listen to pronunciation"
                >
                  <span>🔊</span>
                  <span>Pronounce Word</span>
                </button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Example sentence box */}
        {(showExamples || phase === "answer") && examples.length > 0 && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <ExampleCarousel
              examples={examples}
              vocab={card.front}
              revealed={phase === "answer"}
              onSpeakSentence={handleSpeak}
            />
          </div>
        )}
      </main>

      {/* ── Fixed Bottom Actions (Cognitive Science Rating) ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border safe-area-pb">
        {phase === "question" ? (
          <div className="mx-auto max-w-xl px-4 py-3.5 flex gap-2">
            {isTypingCard && typingResult === "unanswered" && (
              <button
                type="button"
                onClick={handleCheckSpelling}
                disabled={!typedAnswer.trim()}
                className="flex-1 rounded-2xl bg-primary py-4 text-primary-foreground font-black text-base hover:opacity-90 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>Check Spelling</span>
                <span className="text-xs opacity-75 font-normal hidden sm:inline">(Enter)</span>
              </button>
            )}
            <button
              onClick={revealAnswer}
              className={`${
                isTypingCard && typingResult === "unanswered"
                  ? "w-1/3 rounded-2xl border border-border bg-card py-4 text-foreground font-bold text-sm hover:bg-muted"
                  : "w-full rounded-2xl bg-primary py-4 text-primary-foreground font-black text-base hover:opacity-90 active:scale-[0.98]"
              } transition-all shadow-md flex items-center justify-center gap-2`}
            >
              <span>{isTypingCard ? "Reveal" : "Show Answer"}</span>
              <span className="text-xs opacity-75 font-normal hidden sm:inline">(Space)</span>
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-xl px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              <span>Memory Recall Strength:</span>
              <span className="hidden sm:inline font-mono text-[10px]">Shortcuts: 1, 2, 3</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Button 1: Re-train / Lapse (quality=1) */}
              <button
                onClick={() => handleRate(1)}
                disabled={isSubmitting}
                className="flex flex-col items-center justify-between rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3 hover:bg-rose-500/20 active:scale-95 transition-all text-left disabled:opacity-50 group"
              >
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                    🔄 Again
                  </span>
                  <span className="text-[10px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded">
                    ~10m
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 w-full line-clamp-1">
                  Repeat in session
                </span>
              </button>

              {/* Button 2: Hard / Hesitant (quality=3) */}
              <button
                onClick={() => handleRate(3)}
                disabled={isSubmitting}
                className="flex flex-col items-center justify-between rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 hover:bg-amber-500/20 active:scale-95 transition-all text-left disabled:opacity-50 group"
              >
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                    ⚡ Hard
                  </span>
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                    {hardIntervalPreview}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 w-full line-clamp-1">
                  Hesitant recall
                </span>
              </button>

              {/* Button 3: Mastered / Easy (quality=5) */}
              <button
                onClick={() => handleRate(5)}
                disabled={isSubmitting}
                className="flex flex-col items-center justify-between rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 hover:bg-emerald-500/20 active:scale-95 transition-all text-left disabled:opacity-50 group"
              >
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    ✨ Mastered
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                    {masteredIntervalPreview}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 w-full line-clamp-1">
                  Clear recall
                </span>
              </button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
