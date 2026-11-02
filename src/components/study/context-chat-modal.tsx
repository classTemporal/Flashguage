import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { playCardSpeech, UniversalSpeechRecognizer } from "@/lib/speech";

interface ContextChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: string;
  definition: string;
  targetLanguage?: string;
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
}: ContextChatModalProps) {
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [loadingScenario, setLoadingScenario] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
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
        sourceNotice: "Evaluación local sin conexión. Conéctate para feedback con IA.",
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
        sourceNotice: "Verificación de respaldo por error de red.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDictate = async () => {
    if (typeof window === "undefined") return;
    try {
      const recognizer = new UniversalSpeechRecognizer();
      await recognizer.start(
        {
          languageCode: targetLanguage === "Spanish" ? "es-ES" : "en-US",
          onListeningStart: () => setIsDictating(true),
          onListeningEnd: () => setIsDictating(false),
        },
        (text) => {
          if (text) {
            setUserMessage((prev) => (prev ? `${prev} ${text}` : text));
          }
          setIsDictating(false);
        },
        () => {
          setIsDictating(false);
        }
      );
    } catch {
      setIsDictating(false);
    }
  };

  const handlePlayQuestionAudio = () => {
    if (!scenarioData?.question) return;
    setIsPlayingAudio(true);
    playCardSpeech(scenarioData.question, "en", {
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
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
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
                  <p className="font-bold">Modo sin conexión a internet</p>
                  <p className="text-[11px] text-amber-500/90 leading-relaxed">
                    Estás practicando con un escenario estándar de respaldo. Conéctate a internet para desbloquear escenarios dinámicos y evaluación por IA.
                  </p>
                </div>
              </div>
            )}

            {isOnline && !scenarioData.isOffline && !scenarioData.hasConfiguredAI && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 p-3 text-xs text-sky-400">
                <span className="text-base leading-none">💡</span>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-300">Modo de práctica estándar (Sin API Key)</span>
                    <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                      Plantilla
                    </span>
                  </div>
                  <p className="text-[11px] text-sky-200/80 leading-relaxed">
                    Para desbloquear escenarios conversacionales únicos y correcciones inteligentes de gramática y fluidez, configura una clave gratuita (Gemini, Groq u OpenAI) en Ajustes.
                  </p>
                  <a
                    href="/settings"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-xs text-sky-300 hover:text-white underline pt-0.5"
                  >
                    ⚙️ Configurar API Key en Ajustes &rarr;
                  </a>
                </div>
              </div>
            )}

            {/* Scenario Box */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    Real Scenario
                  </span>
                  {scenarioData.isAIPowered ? (
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>✨ IA ({scenarioData.provider?.toUpperCase() || "GEMINI"})</span>
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Básico
                    </span>
                  )}
                </div>
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

              <p className="text-xs text-muted-foreground italic">
                {scenarioData.scenario}
              </p>

              <div className="pt-1">
                <p className="text-sm sm:text-base font-semibold text-foreground">
                  &ldquo;{scenarioData.question}&rdquo;
                </p>
              </div>

              {scenarioData.tip && (
                <p className="text-[11px] text-muted-foreground/90 border-t border-primary/10 pt-2">
                  💡 {scenarioData.tip}
                </p>
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        isDictating
                          ? "bg-rose-500 text-white animate-pulse border-rose-500 shadow-sm"
                          : "bg-muted/80 hover:bg-muted text-foreground border-border"
                      }`}
                      title="Dictate with microphone"
                    >
                      <span>🎙️</span>
                      <span>{isDictating ? "Listening..." : "Dictate Voice"}</span>
                    </button>

                    <Button
                      onClick={handleSendReply}
                      disabled={!userMessage.trim() || isSubmitting}
                      size="sm"
                      className="rounded-full px-5 text-xs font-bold"
                    >
                      {isSubmitting ? "Evaluating..." : "Send Reply ➤"}
                    </Button>
                  </div>
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
                  <p className="text-xs leading-relaxed text-foreground/90 font-medium">
                    {evaluation.feedback}
                  </p>
                </div>

                {/* What user said */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">You said:</span>
                  <p className="font-medium text-foreground italic">&ldquo;{userMessage}&rdquo;</p>
                </div>

                {/* Suggested correction if any */}
                {evaluation.correctedSentence && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1">
                    <span className="font-bold text-primary uppercase text-[10px]">Natural alternative:</span>
                    <p className="font-semibold text-foreground">&ldquo;{evaluation.correctedSentence}&rdquo;</p>
                  </div>
                )}

                {/* Conversation Partner Reaction */}
                {evaluation.aiReply && (
                  <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs text-xs space-y-1.5">
                    <span className="font-bold text-primary uppercase text-[10px] flex items-center gap-1">
                      <span>🗣️</span> Partner&apos;s reply:
                    </span>
                    <p className="text-sm font-medium text-foreground leading-relaxed">
                      &ldquo;{evaluation.aiReply}&rdquo;
                    </p>
                  </div>
                )}

                {/* Evaluation Source / Fallback Notice */}
                {!evaluation.isAIPowered && (
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
                    <span>💡 Evaluación básica. Configura tu API key para análisis de tono, fluidez y corrección.</span>
                    <a
                      href="/settings"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-semibold whitespace-nowrap"
                    >
                      Ajustes &rarr;
                    </a>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={loadScenario}
                    className="text-xs rounded-full border border-border"
                  >
                    🔄 Try Another Scenario
                  </Button>

                  <Button
                    size="sm"
                    onClick={onClose}
                    className="text-xs rounded-full px-5"
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
