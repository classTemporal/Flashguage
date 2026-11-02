import React, { useState, useEffect, useRef } from "react";
import { getSpeechVoice } from "@/lib/languages";
import { UniversalSpeechRecognizer } from "@/lib/speech";

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
  if (c1 === c2) return 1.0;
  if (!c1 || !c2) return 0;
  
  // Substring match check (e.g. user said "the ubiquitous" for "ubiquitous")
  if (c1.includes(c2) || c2.includes(c1)) {
    const longer = Math.max(c1.length, c2.length);
    const shorter = Math.min(c1.length, c2.length);
    return Math.max(0.8, shorter / longer);
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
        onListeningStart: () => setIsListening(true),
        onListeningEnd: () => setIsListening(false),
      },
      (transcript) => {
        setSpokenTranscript(transcript);
        const calculatedScore = computePronunciationScore(transcript, targetWord);
        setScore(calculatedScore);
        setIsListening(false);
      },
      (err) => {
        setIsListening(false);
        setErrorMsg(err);
      }
    );
    cleanupRef.current = cleanup;
  };

  const stopListening = () => {
    if (cleanupRef.current) {
      try {
        cleanupRef.current();
      } catch {}
      cleanupRef.current = null;
    }
    setIsListening(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          startListening();
        }}
        className="inline-flex items-center gap-2 text-xs font-bold text-violet-300 bg-violet-950/40 hover:bg-violet-900/50 border border-violet-500/40 px-4 py-2 rounded-full transition-all active:scale-95 shadow-sm"
        title="Practice your pronunciation with the microphone"
      >
        <span className="text-sm">🎙️</span>
        <span>Evaluate Pronunciation</span>
      </button>
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
            stopListening();
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

      {/* Listening State */}
      {isListening && (
        <div className="flex flex-col items-center justify-center gap-2.5 py-3">
          <div className="relative flex items-center justify-center">
            <span className="absolute h-14 w-14 rounded-full bg-red-500/20 animate-ping" />
            <div className="relative h-12 w-12 rounded-full bg-red-600 flex items-center justify-center text-white shadow-md">
              <span className="text-lg animate-pulse">🎙️</span>
            </div>
          </div>
          <p className="text-xs font-medium text-foreground animate-pulse">
            Listening... Say &ldquo;{targetWord}&rdquo; out loud
          </p>
          <button
            onClick={stopListening}
            className="text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Result State */}
      {!isListening && score !== null && (
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
            <button
              onClick={startListening}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground px-3.5 py-1.5 rounded-full hover:opacity-90 active:scale-95 transition-all"
            >
              <span>🔄</span>
              <span>Try Again</span>
            </button>

            {onListenAgain && (
              <button
                onClick={onListenAgain}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-muted text-foreground px-3.5 py-1.5 rounded-full hover:bg-muted/80 active:scale-95 transition-all"
              >
                <span>🔊</span>
                <span>Listen Native</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {!isListening && errorMsg && (
        <div className="text-center py-2 space-y-2.5">
          <p className="text-xs text-rose-500 font-medium px-2">{errorMsg}</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={startListening}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground px-3.5 py-1.5 rounded-full hover:opacity-90 active:scale-95 transition-all"
            >
              <span>🔄</span>
              <span>Retry</span>
            </button>
            {(errorMsg.includes("Settings") ||
              errorMsg.includes("API Key") ||
              errorMsg.includes("Speech")) && (
              <a
                href="/settings"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border px-3.5 py-1.5 rounded-full transition-all"
              >
                <span>⚙️</span>
                <span>Configure in Settings</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Idle start state (when opened without active recognition) */}
      {!isListening && score === null && !errorMsg && (
        <div className="text-center py-2">
          <button
            onClick={startListening}
            className="inline-flex items-center gap-2 text-xs font-bold bg-primary text-primary-foreground px-4 py-2 rounded-full hover:opacity-90 active:scale-95 transition-all shadow-xs"
          >
            <span>🎙️</span>
            <span>Tap to Speak</span>
          </button>
        </div>
      )}
    </div>
  );
}
