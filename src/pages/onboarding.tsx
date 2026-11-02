"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  SUPPORTED_LANGUAGES,
  getLanguage,
  setStoredActiveLanguage,
  recordTrackAccess,
} from "@/lib/languages";

const fetcher = (url: string) => fetch(url).then((res) => (res.ok ? res.json() : null));

interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  targetLanguage: string;
  category: string;
  icon: string;
  level: string;
  totalCards: number;
}

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Step 1: Starting Language Track (MANDATORY)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  // Step 2: AI Card Generation Key (OPTIONAL)
  const [aiProvider, setAiProvider] = useState<string>("gemini");
  const [aiApiKey, setAiApiKey] = useState<string>("");
  const [aiModel, setAiModel] = useState<string>("gemini-1.5-flash");
  const [showAiKey, setShowAiKey] = useState<boolean>(false);

  // Step 3: Speech & Pronunciation Key (OPTIONAL)
  const [speechProvider, setSpeechProvider] = useState<string>("browser");
  const [useSameAiKey, setUseSameAiKey] = useState<boolean>(false);
  const [speechApiKey, setSpeechApiKey] = useState<string>("");
  const [speechAutoPlay, setSpeechAutoPlay] = useState<boolean>(true);
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [showSpeechKey, setShowSpeechKey] = useState<boolean>(false);

  // Step 4: Timezone & Habits (OPTIONAL)
  const [timezone, setTimezone] = useState<string>("UTC");
  const [dailyGoal, setDailyGoal] = useState<number>(20);
  const [reviewLimit, setReviewLimit] = useState<number>(50);
  const [sessionBreakMinutes, setSessionBreakMinutes] = useState<number>(25);

  // Step 5: Starter Deck Choice (OPTIONAL)
  const [startingOption, setStartingOption] = useState<"starter-pack" | "blank-deck" | "skip">("starter-pack");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customDeckName, setCustomDeckName] = useState<string>("");

  // Auto-detect timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setTimezone(tz);
    } catch {}
  }, []);

  // Fetch starter templates for the chosen language in step 5
  const { data: starterTemplates } = useSWR<StarterTemplate[]>(
    `/api/decks/starter-templates?lang=${encodeURIComponent(selectedLanguage)}`,
    fetcher
  );

  // Pre-select first starter template when loaded
  useEffect(() => {
    if (starterTemplates && starterTemplates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(starterTemplates[0].id);
    }
  }, [starterTemplates, selectedTemplateId]);

  // Update default custom deck name when language changes
  useEffect(() => {
    const langInfo = getLanguage(selectedLanguage);
    setCustomDeckName(`${langInfo.name} Core Vocabulary`);
  }, [selectedLanguage]);

  // Sync speech API key when "use same" is checked
  useEffect(() => {
    if (useSameAiKey) {
      setSpeechApiKey(aiApiKey);
      if (aiProvider === "gemini" || aiProvider === "openai" || aiProvider === "groq") {
        setSpeechProvider(aiProvider);
      }
    }
  }, [useSameAiKey, aiApiKey, aiProvider]);

  const handleNextStep = () => {
    if (step < 5) {
      setStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSkipStep = () => {
    handleNextStep();
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFinishOnboarding = async () => {
    setIsSubmitting(true);

    try {
      // 1. Save all configured user preferences
      const settingsPayload: Record<string, unknown> = {
        onboarded: true,
        initialLanguage: selectedLanguage,
        timezone: timezone || "UTC",
        dailyGoal,
        reviewLimit,
        sessionBreakMinutes,
        speechAutoPlay,
        speechSpeed,
        speechProvider,
      };

      if (aiApiKey.trim()) {
        settingsPayload.aiProvider = aiProvider;
        settingsPayload.aiApiKey = aiApiKey.trim();
        settingsPayload.aiModel = aiModel;
        if (aiProvider === "gemini") settingsPayload.geminiKey = aiApiKey.trim();
        if (aiProvider === "openai") settingsPayload.openaiKey = aiApiKey.trim();
      }

      const effectiveSpeechKey = useSameAiKey ? aiApiKey.trim() : speechApiKey.trim();
      if (effectiveSpeechKey) {
        settingsPayload.speechApiKey = effectiveSpeechKey;
      }

      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsPayload),
      });

      // 2. Set active language locally
      setStoredActiveLanguage(selectedLanguage);
      recordTrackAccess(selectedLanguage);

      let redirectUrl = `/dashboard?lang=${encodeURIComponent(selectedLanguage)}&welcome=true`;

      // 3. Handle First Deck Generation
      if (startingOption === "starter-pack" && selectedTemplateId) {
        const importRes = await fetch("/api/decks/starter-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: selectedTemplateId }),
        });
        if (importRes.ok) {
          const importData = await importRes.json();
          if (importData.deck?.id) {
            redirectUrl = `/deck/${importData.deck.id}?imported=true`;
          }
        }
      } else if (startingOption === "blank-deck" && customDeckName.trim()) {
        const createRes = await fetch("/api/decks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: customDeckName.trim(),
            targetLanguage: selectedLanguage,
            description: `My primary vocabulary deck for ${getLanguage(selectedLanguage).name}`,
          }),
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          if (createData.id) {
            redirectUrl = `/deck/${createData.id}`;
          }
        }
      }

      showToast("Welcome to Flashguage! Setup completed.", "success");
      window.location.href = redirectUrl;
    } catch {
      showToast("Setup saved. Redirecting to dashboard...", "info");
      window.location.href = `/dashboard?lang=${encodeURIComponent(selectedLanguage)}`;
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLangInfo = getLanguage(selectedLanguage);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Brand Bar */}
      <header className="border-b border-border/80 bg-background/80 backdrop-blur-md px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-600 text-white font-black shadow-xs">
              <span className="text-xs">FG</span>
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-foreground block">
                Flashguage Assistant
              </span>
              <span className="text-[10px] text-muted-foreground font-medium block -mt-0.5">
                Quick Setup Wizard
              </span>
            </div>
          </div>

          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
            <span>Step {step} of 5</span>
            <div className="w-24 sm:w-32 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Wizard Content */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
        <Card className="border border-border/80 bg-card p-6 sm:p-10 shadow-lg rounded-3xl space-y-8 animate-in fade-in duration-200">
          {/* ──────────────── STEP 1: Starting Language Track (MANDATORY) ──────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 text-primary font-bold text-xs">
                  <span>🌐 Step 1 of 5 (Required)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Which language do you want to learn first?
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Every language has its own independent dashboard, spaced repetition schedule, and daily goals. You can activate more languages anytime.
                </p>
              </div>

              {/* 15 Languages Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = selectedLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setSelectedLanguage(lang.code)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/30"
                          : "border-border/70 hover:border-border hover:bg-muted/40"
                      }`}
                    >
                      <span className="text-2xl shrink-0" role="img" aria-label={lang.name}>
                        {lang.flag}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs sm:text-sm font-bold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {lang.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate font-medium">
                          {lang.nativeName}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="text-primary font-bold text-xs shrink-0">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">
                  Selected track: <strong className="text-foreground">{selectedLangInfo.flag} {selectedLangInfo.name}</strong>
                </span>

                <Button
                  type="button"
                  onClick={handleNextStep}
                  size="md"
                  className="font-bold text-xs gap-1.5 shadow-xs"
                >
                  <span>Continue to AI Setup</span>
                  <span>→</span>
                </Button>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 2: AI Card Generation Key (OPTIONAL) ──────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs">
                  <span>✨ Step 2 of 5 (Optional)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Connect AI for Smart Generation
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Add an AI API key to generate flashcards from text, get context scenarios, and smart definitions. You can skip this and configure it anytime in Settings.
                </p>
              </div>

              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Select AI Provider
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "gemini", name: "Gemini", badge: "Free Tier", rec: true },
                    { id: "groq", name: "Groq", badge: "Ultra Fast", rec: false },
                    { id: "openai", name: "OpenAI", badge: "GPT-4o", rec: false },
                    { id: "custom", name: "Custom", badge: "Ollama / Self", rec: false },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setAiProvider(p.id);
                        if (p.id === "gemini") setAiModel("gemini-1.5-flash");
                        if (p.id === "groq") setAiModel("llama-3.3-70b-versatile");
                        if (p.id === "openai") setAiModel("gpt-4o-mini");
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        aiProvider === p.id
                          ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20 font-bold text-foreground"
                          : "border-border/70 hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <p className="text-xs sm:text-sm font-bold">{p.name}</p>
                      <span className="text-[10px] font-semibold opacity-75">{p.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    {aiProvider.toUpperCase()} API Key
                  </label>
                  {aiProvider === "gemini" && (
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      Get free Gemini Key →
                    </a>
                  )}
                  {aiProvider === "groq" && (
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      Get free Groq Key →
                    </a>
                  )}
                </div>

                <div className="relative">
                  <Input
                    type={showAiKey ? "text" : "password"}
                    placeholder={`Paste your ${aiProvider} API key... (or leave empty to skip)`}
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    className="pr-12 text-xs sm:text-sm rounded-xl font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAiKey(!showAiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-semibold"
                  >
                    {showAiKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Helpful Tip Box */}
              <div className="rounded-2xl border border-border/80 bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-1">
                <p className="font-bold text-foreground">💡 Don&apos;t have an API key right now?</p>
                <p>
                  No problem! You can skip this step and start practicing immediately. All built-in starter decks work 100% offline without any API key.
                </p>
              </div>

              <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handlePrevStep}
                  size="sm"
                  className="font-bold text-xs"
                >
                  ← Back
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSkipStep}
                    size="sm"
                    className="font-bold text-xs"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    size="sm"
                    className="font-bold text-xs shadow-xs"
                  >
                    Continue →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 3: Speech & Pronunciation Key (OPTIONAL) ──────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-xs">
                  <span>🎙️ Step 3 of 5 (Optional)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Speech & Native Audio
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Hear authentic native pronunciations for your {selectedLangInfo.name} vocabulary and practice your spoken accent.
                </p>
              </div>

              {/* Speech Provider Choice */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Audio & TTS Engine
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: "browser", name: "Browser Speech", desc: "100% Free & Built-in (No key needed)" },
                    { id: "openai", name: "OpenAI TTS", desc: "Studio-quality neural voices" },
                    { id: "groq", name: "Groq Whisper", desc: "Ultra-fast speech recognition" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSpeechProvider(p.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        speechProvider === p.id
                          ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20"
                          : "border-border/70 hover:bg-muted/40"
                      }`}
                    >
                      <p className={`text-xs sm:text-sm font-bold ${speechProvider === p.id ? "text-primary" : "text-foreground"}`}>
                        {p.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {p.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dedicated Speech API key if not browser */}
              {speechProvider !== "browser" && (
                <div className="space-y-3 pt-2">
                  {aiApiKey.trim() && (
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={useSameAiKey}
                        onChange={(e) => setUseSameAiKey(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span>Use the same API key configured in Step 2</span>
                    </label>
                  )}

                  {!useSameAiKey && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Dedicated Speech API Key
                      </label>
                      <div className="relative">
                        <Input
                          type={showSpeechKey ? "text" : "password"}
                          placeholder="Paste speech / audio API key..."
                          value={speechApiKey}
                          onChange={(e) => setSpeechApiKey(e.target.value)}
                          className="pr-12 text-xs sm:text-sm rounded-xl font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSpeechKey(!showSpeechKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-semibold"
                        >
                          {showSpeechKey ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preferences */}
              <div className="space-y-3 pt-2 border-t border-border/50">
                <label className="flex items-center justify-between p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/30 cursor-pointer">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                      Auto-Pronounce on Reveal
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Automatically speak card pronunciations when flipping flashcards during study.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={speechAutoPlay}
                    onChange={(e) => setSpeechAutoPlay(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                </label>
              </div>

              <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handlePrevStep}
                  size="sm"
                  className="font-bold text-xs"
                >
                  ← Back
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSkipStep}
                    size="sm"
                    className="font-bold text-xs"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    size="sm"
                    className="font-bold text-xs shadow-xs"
                  >
                    Continue →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 4: Timezone & Habits (OPTIONAL) ──────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs">
                  <span>⏱️ Step 4 of 5 (Optional)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Personalize Your Study Routine
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Tailor your daily goals and time settings so Flashguage calculates optimal spaced repetition intervals.
                </p>
              </div>

              {/* Timezone Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Your Timezone (for Daily Goals & Midnight Resets)
                </label>
                <Select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="rounded-xl text-xs sm:text-sm font-semibold"
                >
                  {COMMON_TIMEZONES.includes(timezone) ? null : (
                    <option value={timezone}>{timezone} (Detected)</option>
                  )}
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Daily Goal Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Daily Recall Goal
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 10, label: "10 cards", pace: "Casual • ~5m" },
                    { value: 20, label: "20 cards", pace: "Balanced • Rec", rec: true },
                    { value: 30, label: "30 cards", pace: "Intensive • ~15m" },
                    { value: 50, label: "50 cards", pace: "Immersion • ~25m" },
                  ].map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setDailyGoal(g.value)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        dailyGoal === g.value
                          ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20 font-bold text-foreground"
                          : "border-border/70 hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <p className="text-sm font-black">{g.label}</p>
                      <span className="text-[10px] font-semibold opacity-75">{g.pace}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Review limit and session break */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Max Due Reviews Per Session
                  </label>
                  <Select
                    value={reviewLimit}
                    onChange={(e) => setReviewLimit(Number(e.target.value))}
                    className="rounded-xl text-xs sm:text-sm font-semibold"
                  >
                    <option value={20}>20 cards per review</option>
                    <option value={50}>50 cards per review</option>
                    <option value={100}>100 cards per review</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Pomodoro Study Interval
                  </label>
                  <Select
                    value={sessionBreakMinutes}
                    onChange={(e) => setSessionBreakMinutes(Number(e.target.value))}
                    className="rounded-xl text-xs sm:text-sm font-semibold"
                  >
                    <option value={5}>5-minute quick sprint</option>
                    <option value={15}>15-minute standard block</option>
                    <option value={25}>25-minute Pomodoro session</option>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handlePrevStep}
                  size="sm"
                  className="font-bold text-xs"
                >
                  ← Back
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSkipStep}
                    size="sm"
                    className="font-bold text-xs"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    size="sm"
                    className="font-bold text-xs shadow-xs"
                  >
                    Continue →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 5: Starter Deck Choice (OPTIONAL) ──────────────── */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <span>🗂️ Step 5 of 5</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Choose Your Starting Point
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  How would you like to start your <strong>{selectedLangInfo.name}</strong> journey?
                </p>
              </div>

              {/* 3 Starting Mode Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "starter-pack",
                    title: "Curated Starter Kit",
                    badge: "Recommended",
                    desc: "Import verified high-yield vocabulary ready to study right now.",
                    icon: "📦",
                  },
                  {
                    id: "blank-deck",
                    title: "Create Blank Deck",
                    badge: "Custom",
                    desc: "Create an empty deck and add your own custom flashcards.",
                    icon: "✏️",
                  },
                  {
                    id: "skip",
                    title: "Explore Dashboard",
                    badge: "Later",
                    desc: "Jump straight into the app; create or import decks later.",
                    icon: "🚀",
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStartingOption(opt.id as any)}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      startingOption === opt.id
                        ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20"
                        : "border-border/70 hover:bg-muted/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{opt.icon}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-muted text-muted-foreground">
                          {opt.badge}
                        </span>
                      </div>
                      <p className={`text-sm font-bold ${startingOption === opt.id ? "text-primary" : "text-foreground"}`}>
                        {opt.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Dynamic details based on starting option */}
              {startingOption === "starter-pack" && (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                    Select a Curated Kit for {selectedLangInfo.name}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {(starterTemplates || []).map((t) => {
                      const isSel = selectedTemplateId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(t.id)}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                            isSel
                              ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20"
                              : "border-border/70 hover:bg-muted/40"
                          }`}
                        >
                          <span className="text-2xl shrink-0 mt-0.5">{t.icon || "📚"}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className={`text-xs sm:text-sm font-bold truncate ${isSel ? "text-primary" : "text-foreground"}`}>
                                {t.name}
                              </p>
                              <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                                {t.totalCards} cards
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                              {t.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {startingOption === "blank-deck" && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-foreground">
                    Deck Name
                  </label>
                  <Input
                    placeholder="e.g. My First Vocabulary Deck"
                    value={customDeckName}
                    onChange={(e) => setCustomDeckName(e.target.value)}
                    className="rounded-xl text-xs sm:text-sm font-semibold"
                  />
                  <p className="text-xs text-muted-foreground">
                    Target language track will be set to <strong>{selectedLangInfo.name}</strong>.
                  </p>
                </div>
              )}

              {startingOption === "skip" && (
                <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 text-xs text-muted-foreground space-y-1">
                  <p className="font-bold text-foreground">Ready to explore!</p>
                  <p>
                    You will be redirected straight to your {selectedLangInfo.name} dashboard where you can customize your layout and add decks anytime.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handlePrevStep}
                  size="sm"
                  className="font-bold text-xs"
                >
                  ← Back
                </Button>

                <Button
                  type="button"
                  onClick={handleFinishOnboarding}
                  disabled={isSubmitting}
                  size="md"
                  className="font-bold text-xs sm:text-sm gap-2 shadow-xs bg-gradient-to-tr from-primary to-indigo-600 text-white hover:opacity-95"
                >
                  {isSubmitting ? "Finishing Setup..." : "Launch Flashguage 🎉"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-4 px-4 text-center text-xs text-muted-foreground">
        <span>Flashguage Multi-Language Spaced Recall • You can update all preferences later in Settings</span>
      </footer>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login?onboarding=true",
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
