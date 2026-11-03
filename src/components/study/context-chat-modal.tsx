import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PhoneticSentence } from "@/components/study/phonetic-sentence";
import { InteractiveSentence } from "@/components/study/interactive-sentence";
import { playCardSpeech, UniversalSpeechRecognizer } from "@/lib/speech";

interface ContextChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: string;
  definition: string;
  targetLanguage?: string;
  deckId?: string;
}

interface ScenarioData {
  scenario: string;
  question: string;
  tip: string;
  isAIPowered?: boolean;
  hasConfiguredAI?: boolean;
  provider?: string;
  sourceNotice?: string;
  isOffline?: boolean;
}

interface EvaluationResult {
  rating: "great" | "good" | "needs_improvement";
  usedTargetWord: boolean;
  feedback: string;
  correctedSentence: string;
  aiReply: string;
  isAIPowered?: boolean;
  hasConfiguredAI?: boolean;
  sourceNotice?: string;
}

export function ContextChatModal({
  isOpen,
  onClose,
  word,
  definition,
  targetLanguage = "English",
  deckId,
}: ContextChatModalProps) {
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [loadingScenario, setLoadingScenario] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isDictateProcessing, setIsDictateProcessing] = useState(false);
  const dictateCleanupRef = useRef<(() => void) | null>(null);
  const [dictateError, setDictateError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isQuestionListened, setIsQuestionListened] = useState(false);
  const [isPartnerListened, setIsPartnerListened] = useState(false);
  const [isPlayingPartnerAudio, setIsPlayingPartnerAudio] = useState(false);
  const [isAlternativeListened, setIsAlternativeListened] = useState(false);
  const [isPlayingAlternativeAudio, setIsPlayingAlternativeAudio] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Track browser online/offline status
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch or generate scenario when modal opens with a new word
  const loadScenario = async () => {
    setLoadingScenario(true);
    setEvaluation(null);
    setUserMessage("");
    setIsQuestionListened(false);
    setIsPartnerListened(false);
    setIsAlternativeListened(false);

    // If offline, provide instant fallback scenario without waiting for network failure
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setScenarioData({
        scenario: `A friend asks you about a situation involving "${word}".`,
        question: `Could you tell me how you would use "${word}" in a sentence?`,
        tip: `Try answering in a complete sentence using "${word}".`,
        isAIPowered: false,
        hasConfiguredAI: false,
        isOffline: true,
      });
      setLoadingScenario(false);
      return;
    }

    try {
      const res = await fetch("/api/ai/context-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scenario",
          word,
          definition,
          language: targetLanguage,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setScenarioData(data);
      }
    } catch (err) {
      console.error("Failed to load scenario:", err);
      // Fallback on network error
      setScenarioData({
        scenario: `A friend asks you about a situation involving "${word}".`,
        question: `Could you tell me about a time you experienced or used "${word}"?`,
        tip: `Answer in a complete sentence incorporating "${word}".`,
        isAIPowered: false,
        hasConfiguredAI: false,
        isOffline: true,
      });
    } finally {
      setLoadingScenario(false);
    }
  };

  useEffect(() => {
    if (isOpen && word) {
      loadScenario();
    }
  }, [isOpen, word]);

  const handleSendReply = async () => {
    if (!userMessage.trim() || isSubmitting || !scenarioData) return;
    setIsSubmitting(true);

    // If offline, evaluate locally
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const containsWord = userMessage.toLowerCase().includes(word.toLowerCase());
      setEvaluation({
        rating: containsWord ? "great" : "good",
        usedTargetWord: containsWord,
        feedback: containsWord
          ? `Great job incorporating "${word}" into your answer while offline!`
          : `Good sentence! Remember to explicitly include the word "${word}".`,
        correctedSentence: "",
        aiReply: "Thanks for sharing! Keep practicing everyday expressions.",
        isAIPowered: false,
        hasConfiguredAI: false,
        sourceNotice: "Offline local evaluation. Reconnect to get AI-powered feedback.",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/ai/context-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          word,
          scenario: scenarioData.scenario,
          question: scenarioData.question,
          userMessage: userMessage.trim(),
          language: targetLanguage,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEvaluation(data);
      }
    } catch (err) {
      console.error("Failed to evaluate reply:", err);
      const containsWord = userMessage.toLowerCase().includes(word.toLowerCase());
      setEvaluation({
        rating: containsWord ? "great" : "good",
        usedTargetWord: containsWord,
        feedback: containsWord
          ? `Great job using "${word}" in your response!`
          : `Good sentence! Next time try to explicitly include "${word}".`,
        correctedSentence: "",
        aiReply: "That's a very natural response! Keep practicing everyday expressions.",
        isAIPowered: false,
        hasConfiguredAI: false,
        sourceNotice: "Fallback check due to network error.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDictate = async () => {
    if (typeof window === "undefined") return;

    // Toggle stop: If already listening, stop immediately and transcribe speech recorded so far
    if (isDictating) {
      if (dictateCleanupRef.current) {
        try {
          dictateCleanupRef.current();
        } catch {}
        dictateCleanupRef.current = null;
      }
      return;
    }

    setDictateError(null);
    try {
      const recognizer = new UniversalSpeechRecognizer();
      const cleanup = await recognizer.start(
        {
          languageCode: targetLanguage === "Spanish" ? "es-ES" : "en-US",
          targetWord: word,
          maxDurationSeconds: 15,
          onListeningStart: () => {
            setIsDictating(true);
            setIsDictateProcessing(false);
            setDictateError(null);
          },
          onProcessingStart: () => {
            setIsDictateProcessing(true);
          },
          onListeningEnd: () => {
            setIsDictating(false);
            setIsDictateProcessing(false);
            dictateCleanupRef.current = null;
          },
        },
        (text) => {
          if (text) {
            setUserMessage((prev) => (prev ? `${prev} ${text}` : text));
          }
          setIsDictating(false);
          setIsDictateProcessing(false);
          dictateCleanupRef.current = null;
        },
        (err) => {
          setIsDictating(false);
          setIsDictateProcessing(false);
          dictateCleanupRef.current = null;
          setDictateError(err);
        }
      );
      dictateCleanupRef.current = cleanup;
    } catch {
      setIsDictating(false);
      setIsDictateProcessing(false);
      dictateCleanupRef.current = null;
    }
  };

  const handlePlayQuestionAudio = () => {
    if (!scenarioData?.question) return;
    setIsPlayingAudio(true);
    setIsQuestionListened(true);
    playCardSpeech(scenarioData.question, "en", {
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
  };

  const handlePlayPartnerAudio = () => {
    if (!evaluation?.aiReply) return;
    setIsPlayingPartnerAudio(true);
    setIsPartnerListened(true);
    playCardSpeech(evaluation.aiReply, "en", {
      onEnd: () => setIsPlayingPartnerAudio(false),
      onError: () => setIsPlayingPartnerAudio(false),
    });
  };

  const handlePlayAlternativeAudio = () => {
    if (!evaluation?.correctedSentence) return;
    setIsPlayingAlternativeAudio(true);
    setIsAlternativeListened(true);
    playCardSpeech(evaluation.correctedSentence, "en", {
      onEnd: () => setIsPlayingAlternativeAudio(false),
      onError: () => setIsPlayingAlternativeAudio(false),
    });
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">💬</span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Practice &ldquo;{word}&rdquo; in Context
              </h3>
              <p className="text-xs text-muted-foreground">
                Respond to the scenario using the vocabulary word
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close practice in context modal"
          >
            ✕
          </button>
        </div>

        {/* Loading Scenario State */}
        {loadingScenario && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-xs font-semibold text-muted-foreground animate-pulse">
              Creating a real-life conversation scenario with AI...
            </p>
          </div>
        )}

        {/* Loaded Scenario */}
        {!loadingScenario && scenarioData && (
          <div className="space-y-4">
            {/* Status Feedback Banners */}
            {(!isOnline || scenarioData.isOffline) && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-500">
                <span className="text-base leading-none">📶</span>
                <div className="space-y-0.5">
                  <p className="font-bold">Offline Mode</p>
                  <p className="text-[11px] text-amber-500/90 leading-relaxed">
                    You are practicing with a standard offline scenario. Reconnect to the internet for dynamic AI scenarios and real-time feedback.
                  </p>
                </div>
              </div>
            )}

            {isOnline && !scenarioData.isOffline && !scenarioData.hasConfiguredAI && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 p-3 text-xs text-sky-400">
                <span className="text-base leading-none">💡</span>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-300">Standard Practice Mode (No AI Key)</span>
                    <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                      Template
                    </span>
                  </div>
                  <p className="text-[11px] text-sky-200/80 leading-relaxed">
                    To unlock unique conversation scenarios for every word and real-time grammar feedback, configure a free API key (Gemini, Groq, or OpenAI) in Settings.
                  </p>
                  <a
                    href="/settings"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-xs text-sky-300 hover:text-white underline pt-0.5"
                  >
                    ⚙️ Configure AI Key in Settings &rarr;
                  </a>
                </div>
              </div>
            )}

            {/* Scenario Box */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  Real Scenario
                </span>
                <button
                  type="button"
                  onClick={handlePlayQuestionAudio}
                  disabled={isPlayingAudio}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  title="Listen to the question"
                >
                  <span>{isPlayingAudio ? "🔊 Playing..." : "🔊 Listen"}</span>
                </button>
              </div>

              <div className="text-xs text-muted-foreground italic">
                <InteractiveSentence
                  text={scenarioData.scenario}
                  lang="en"
                  deckId={deckId}
                />
              </div>

              <div className="pt-1">
                <PhoneticSentence
                  text={scenarioData.question}
                  lang="en"
                  isRevealed={isQuestionListened}
                  deckId={deckId}
                  className="text-sm sm:text-base font-semibold text-foreground"
                />
              </div>

              {scenarioData.tip && (
                <div className="text-[11px] text-muted-foreground/90 border-t border-primary/10 pt-2 flex items-start gap-1">
                  <span className="shrink-0">💡</span>
                  <InteractiveSentence
                    text={scenarioData.tip}
                    lang="en"
                    deckId={deckId}
                  />
                </div>
              )}
            </div>

            {/* User Response Area */}
            {!evaluation && (
              <div className="space-y-3">
                <label
                  htmlFor="context-chat-reply"
                  className="block text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Your reply in English:
                </label>
                <div className="relative">
                  <textarea
                    id="context-chat-reply"
                    rows={3}
                    value={userMessage}
                    onChange={(e) => setUserMessage(e.target.value)}
                    placeholder={`Type or dictate your answer, remembering to use "${word}"...`}
                    className="w-full rounded-2xl border border-border bg-background p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    autoFocus
                  />
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleDictate}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isDictateProcessing
                          ? "bg-amber-500 text-white animate-pulse border-amber-500 shadow-sm"
                          : isDictating
                          ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse border-rose-500 shadow-sm ring-2 ring-rose-400/40"
                          : "bg-muted/80 hover:bg-muted text-foreground border-border"
                      }`}
                      title={
                        isDictateProcessing
                          ? "Transcribing your speech..."
                          : isDictating
                          ? "Click to stop listening and submit"
                          : "Click to dictate with voice, click again to stop"
                      }
                    >
                      <span>{isDictateProcessing ? "⏳" : isDictating ? "⏹️" : "🎙️"}</span>
                      <span>
                        {isDictateProcessing
                          ? "Processing..."
                          : isDictating
                          ? "Stop & Done"
                          : "Dictate Voice"}
                      </span>
                    </button>

                    <Button
                      onClick={handleSendReply}
                      disabled={!userMessage.trim() || isSubmitting}
                      size="sm"
                      className="px-5 text-xs font-bold shadow-xs"
                    >
                      {isSubmitting ? "Evaluating..." : "Send Reply ➤"}
                    </Button>
                  </div>
                  {dictateError && (
                    <p className="mt-2 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-1.5 animate-in fade-in">
                      ⚠️ {dictateError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* AI Evaluation & Feedback Result */}
            {evaluation && (
              <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Result Badge */}
                <div
                  className={`p-3.5 rounded-2xl border space-y-2 ${
                    evaluation.rating === "great"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : evaluation.rating === "good"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {evaluation.rating === "great" ? "🌟" : evaluation.rating === "good" ? "👍" : "💪"}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {evaluation.rating === "great"
                        ? "Excellent Usage!"
                        : evaluation.rating === "good"
                        ? "Good Response!"
                        : "Keep Practicing!"}
                    </span>
                  </div>
                  <div className="text-xs leading-relaxed text-foreground/90 font-medium">
                    <InteractiveSentence
                      text={evaluation.feedback}
                      lang="en"
                      deckId={deckId}
                    />
                  </div>
                </div>

                {/* What user said */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">You said:</span>
                  <p className="font-medium text-foreground italic">&ldquo;{userMessage}&rdquo;</p>
                </div>

                {/* Suggested correction if any */}
                {evaluation.correctedSentence && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary uppercase text-[10px]">Natural alternative:</span>
                      <button
                        type="button"
                        onClick={handlePlayAlternativeAudio}
                        disabled={isPlayingAlternativeAudio}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                        title="Listen to natural alternative"
                      >
                        <span>{isPlayingAlternativeAudio ? "🔊 Playing..." : "🔊 Listen"}</span>
                      </button>
                    </div>
                    <div className="pt-0.5">
                      <PhoneticSentence
                        text={evaluation.correctedSentence}
                        lang="en"
                        deckId={deckId}
                        isRevealed={isAlternativeListened}
                        className="font-semibold text-foreground text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Conversation Partner Reaction */}
                {evaluation.aiReply && (
                  <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary uppercase text-[10px] flex items-center gap-1">
                        <span>🗣️</span> Partner&apos;s reply:
                      </span>
                      <button
                        type="button"
                        onClick={handlePlayPartnerAudio}
                        disabled={isPlayingPartnerAudio}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
                        title="Listen to partner's reply"
                      >
                        <span>{isPlayingPartnerAudio ? "🔊 Playing..." : "🔊 Listen"}</span>
                      </button>
                    </div>
                    <div className="pt-1">
                      <PhoneticSentence
                        text={evaluation.aiReply}
                        lang="en"
                        deckId={deckId}
                        isRevealed={isPartnerListened}
                        className="text-sm font-medium text-foreground leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* Evaluation Source / Fallback Notice */}
                {!evaluation.isAIPowered && (
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
                    <span>💡 Basic evaluation. Configure an AI key in Settings for fluency tips and grammar analysis.</span>
                    <a
                      href="/settings"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-semibold whitespace-nowrap"
                    >
                      Settings &rarr;
                    </a>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={loadScenario}
                    className="text-xs border border-border shadow-xs"
                  >
                    🔄 Try Another Scenario
                  </Button>

                  <Button
                    size="sm"
                    onClick={onClose}
                    className="text-xs px-5 shadow-xs"
                  >
                    ✓ Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
