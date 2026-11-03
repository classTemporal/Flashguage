import React, { useState, useEffect, useRef } from "react";
import { getSpeechVoice } from "@/lib/languages";
import { UniversalSpeechRecognizer } from "@/lib/speech";
import { Button } from "@/components/ui/button";

interface PronunciationCheckerProps {
  targetWord: string;
  langCode?: string;
  onListenAgain?: () => void;
}

function cleanString(str: string): string {
  return str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function computePronunciationScore(spoken: string, target: string): number {
  const c1 = cleanString(spoken);
  const c2 = cleanString(target);
  if (!c1 || !c2) return 0;
  if (c1 === c2) return 1.0;

  // Exact word found in spoken phrase (e.g. user said "the pluck" or "say pluck")
  const words = c1.split(/\s+/);
  if (words.includes(c2)) return 1.0;

  // Substring match check (e.g. user said "the ubiquitous" for "ubiquitous")
  if (c1.includes(c2) || c2.includes(c1)) {
    const longer = Math.max(c1.length, c2.length);
    const shorter = Math.min(c1.length, c2.length);
    return Math.max(0.85, shorter / longer);
  }

  const maxLen = Math.max(c1.length, c2.length);
  const distance = levenshteinDistance(c1, c2);
  return Math.max(0, 1 - distance / maxLen);
}

export function PronunciationChecker({
  targetWord,
  langCode = "en",
  onListenAgain,
}: PronunciationCheckerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Check Web Speech Recognition or MediaRecorder support
  const isSupported =
    typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window ||
      "SpeechRecognition" in window ||
      (typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia));

  // Stop recognition on unmount or targetWord change
  useEffect(() => {
    setSpokenTranscript(null);
    setScore(null);
    setErrorMsg(null);
    if (cleanupRef.current) {
      try {
        cleanupRef.current();
      } catch {}
      cleanupRef.current = null;
    }
    setIsListening(false);
    setIsEvaluating(false);
  }, [targetWord]);

  const startListening = async () => {
    if (!isSupported) {
      setErrorMsg("Microphone audio is not supported in this browser.");
      return;
    }

    setErrorMsg(null);
    setSpokenTranscript(null);
    setScore(null);

    const recognizer = new UniversalSpeechRecognizer();
    const cleanup = await recognizer.start(
      {
        languageCode: getSpeechVoice(langCode) || "en-US",
        targetWord: targetWord,
        maxDurationSeconds: 7,
        onListeningStart: () => {
          setIsListening(true);
          setIsEvaluating(false);
        },
        onProcessingStart: () => {
          setIsEvaluating(true);
        },
        onListeningEnd: () => {
          setIsListening(false);
          setIsEvaluating(false);
          cleanupRef.current = null;
        },
      },
      (transcript) => {
        setSpokenTranscript(transcript);
        const calculatedScore = computePronunciationScore(transcript, targetWord);
        setScore(calculatedScore);
        setIsListening(false);
        setIsEvaluating(false);
        cleanupRef.current = null;
      },
      (err) => {
        setIsListening(false);
        setIsEvaluating(false);
        cleanupRef.current = null;
        setErrorMsg(err);
      }
    );
    cleanupRef.current = cleanup;
  };

  const finishListeningAndEvaluate = () => {
    if (cleanupRef.current) {
      try {
        cleanupRef.current();
      } catch {}
      cleanupRef.current = null;
    }
  };

  const cancelListening = () => {
    if (cleanupRef.current) {
      try {
        cleanupRef.current();
      } catch {}
      cleanupRef.current = null;
    }
    setIsListening(false);
    setIsEvaluating(false);
  };

  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setIsOpen(true);
          startListening();
        }}
        className="gap-2 font-bold text-violet-600 dark:text-violet-400 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 shadow-xs"
        title="Practice your pronunciation with the microphone"
      >
        <span className="text-sm">🎙️</span>
        <span>Evaluate Pronunciation</span>
      </Button>
    );
  }

  const percentage = score !== null ? Math.round(score * 100) : 0;
  const isExcellent = percentage >= 85;
  const isClose = percentage >= 60 && percentage < 85;

  return (
    <div className="w-full max-w-sm mx-auto p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">🎙️</span>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pronunciation Check
          </span>
        </div>
        <button
          onClick={() => {
            cancelListening();
            setIsOpen(false);
          }}
          className="text-muted-foreground hover:text-foreground text-xs p-1"
          aria-label="Close pronunciation check"
        >
          ✕
        </button>
      </div>

      {/* Target Word Guidance */}
      <div className="text-center py-1">
        <p className="text-xs text-muted-foreground">Target word:</p>
        <p className="text-lg font-bold text-foreground capitalize tracking-tight">
          &ldquo;{targetWord}&rdquo;
        </p>
      </div>

      {/* Evaluating State */}
      {isEvaluating && (
        <div className="flex flex-col items-center justify-center gap-2.5 py-4 animate-in fade-in">
          <div className="h-8 w-8 rounded-full border-3 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-foreground">
            Analyzing your pronunciation...
          </p>
        </div>
      )}

      {/* Listening State */}
      {isListening && !isEvaluating && (
        <div className="flex flex-col items-center justify-center gap-2.5 py-3">
          <button
            type="button"
            onClick={finishListeningAndEvaluate}
            className="relative flex items-center justify-center group cursor-pointer focus:outline-none"
            title="Click to stop listening and evaluate"
          >
            <span className="absolute h-14 w-14 rounded-full bg-rose-500/30 animate-ping" />
            <div className="relative h-12 w-12 rounded-full bg-rose-600 group-hover:bg-rose-700 flex items-center justify-center text-white shadow-md transition-all">
              <span className="text-lg">⏹️</span>
            </div>
          </button>
          <div className="text-center space-y-0.5">
            <p className="text-xs font-bold text-foreground animate-pulse">
              Listening... Say &ldquo;{targetWord}&rdquo; out loud
            </p>
            <p className="text-[11px] text-muted-foreground">
              Click the square icon or button below when done
            </p>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button
              size="sm"
              variant="primary"
              onClick={finishListeningAndEvaluate}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1 px-3.5 shadow-xs text-xs cursor-pointer"
            >
              <span>⏹️</span>
              <span>Stop & Evaluate</span>
            </Button>
            <button
              type="button"
              onClick={cancelListening}
              className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Result State */}
      {!isListening && !isEvaluating && score !== null && (
        <div className="space-y-2.5 text-center animate-in fade-in duration-200">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold ${
              isExcellent
                ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                : isClose
                ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                : "bg-rose-500/15 text-rose-500 border border-rose-500/30"
            }`}
          >
            <span>{isExcellent ? "🎉" : isClose ? "👍" : "💪"}</span>
            <span>
              {isExcellent
                ? `Excellent Pronunciation! (${percentage}%)`
                : isClose
                ? `Very Close! (${percentage}%)`
                : `Keep Practicing (${percentage}%)`}
            </span>
          </div>

          {spokenTranscript && (
            <p className="text-xs text-muted-foreground">
              We heard: <span className="font-semibold text-foreground italic">&ldquo;{spokenTranscript}&rdquo;</span>
            </p>
          )}

          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              onClick={startListening}
              className="gap-1.5 shadow-xs"
            >
              <span>🔄</span>
              <span>Try Again</span>
            </Button>

            {onListenAgain && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onListenAgain}
                className="gap-1.5 shadow-xs"
              >
                <span>🔊</span>
                <span>Listen Native</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {!isListening && !isEvaluating && errorMsg && (
        <div className="text-center py-2 space-y-2.5">
          <p className="text-xs text-rose-500 font-medium px-2">{errorMsg}</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={startListening}
              className="gap-1.5 shadow-xs"
            >
              <span>🔄</span>
              <span>Retry</span>
            </Button>
            {(errorMsg.includes("Settings") ||
              errorMsg.includes("API Key") ||
              errorMsg.includes("Speech")) && (
              <Button
                variant="secondary"
                size="sm"
                as="link"
                href="/settings"
                target="_blank"
                rel="noreferrer"
                className="gap-1 shadow-xs"
              >
                <span>⚙️</span>
                <span>Configure in Settings</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Idle start state (when opened without active recognition) */}
      {!isListening && !isEvaluating && score === null && !errorMsg && (
        <div className="text-center py-2">
          <Button
            variant="primary"
            size="sm"
            onClick={startListening}
            className="gap-2 shadow-xs"
          >
            <span>🎙️</span>
            <span>Tap to Speak</span>
          </Button>
        </div>
      )}
    </div>
  );
}
