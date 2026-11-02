"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { signOut } from "next-auth/react";
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
import { playCardSpeech } from "@/lib/speech";

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

// Comprehensive fallback list of global IANA timezones in case Intl is unavailable
const FALLBACK_TIMEZONES = [
  "UTC",
  "Africa/Cairo", "Africa/Casablanca", "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi",
  "America/Anchorage", "America/Argentina/Buenos_Aires", "America/Asuncion", "America/Bogota",
  "America/Caracas", "America/Chicago", "America/Denver", "America/Guatemala", "America/Guayaquil",
  "America/Halifax", "America/Havana", "America/La_Paz", "America/Lima", "America/Los_Angeles",
  "America/Manaus", "America/Mexico_City", "America/Montevideo", "America/New_York", "America/Panama",
  "America/Phoenix", "America/Santiago", "America/Santo_Domingo", "America/Sao_Paulo", "America/Tegucigalpa",
  "America/Toronto", "America/Vancouver",
  "Asia/Almaty", "Asia/Amman", "Asia/Baghdad", "Asia/Baku", "Asia/Bangkok", "Asia/Beirut", "Asia/Colombo",
  "Asia/Dhaka", "Asia/Dubai", "Asia/Hong_Kong", "Asia/Jakarta", "Asia/Jerusalem", "Asia/Karachi",
  "Asia/Kathmandu", "Asia/Kolkata", "Asia/Kuala_Lumpur", "Asia/Kuwait", "Asia/Manila", "Asia/Muscat",
  "Asia/Riyadh", "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore", "Asia/Taipei", "Asia/Tashkent",
  "Asia/Tehran", "Asia/Tokyo",
  "Atlantic/Bermuda", "Atlantic/Canary", "Atlantic/Reykjavik",
  "Australia/Adelaide", "Australia/Brisbane", "Australia/Melbourne", "Australia/Perth", "Australia/Sydney",
  "Europe/Amsterdam", "Europe/Athens", "Europe/Belgrade", "Europe/Berlin", "Europe/Brussels",
  "Europe/Bucharest", "Europe/Budapest", "Europe/Copenhagen", "Europe/Dublin", "Europe/Helsinki",
  "Europe/Istanbul", "Europe/Kiev", "Europe/Lisbon", "Europe/London", "Europe/Madrid", "Europe/Moscow",
  "Europe/Oslo", "Europe/Paris", "Europe/Prague", "Europe/Rome", "Europe/Stockholm", "Europe/Vienna",
  "Europe/Warsaw", "Europe/Zurich",
  "Pacific/Auckland", "Pacific/Fiji", "Pacific/Guam", "Pacific/Honolulu"
];

function getAllAvailableTimezones(): string[] {
  try {
    if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
      const zones = Intl.supportedValuesOf("timeZone");
      if (Array.isArray(zones) && zones.length > 0) return zones;
    }
  } catch {}
  return FALLBACK_TIMEZONES;
}

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
  const [aiBaseUrl, setAiBaseUrl] = useState<string>("");
  const [showAiKey, setShowAiKey] = useState<boolean>(false);
  const [detectedAiModels, setDetectedAiModels] = useState<string[]>([]);
  const [detectingAiModels, setDetectingAiModels] = useState<boolean>(false);
  const [testingAi, setTestingAi] = useState<boolean>(false);

  // Step 3: Text-to-Speech (TTS) Key (OPTIONAL)
  const [speechProvider, setSpeechProvider] = useState<string>("browser");
  const [speechApiKey, setSpeechApiKey] = useState<string>("");
  const [speechBaseUrl, setSpeechBaseUrl] = useState<string>("");
  const [speechVoice, setSpeechVoice] = useState<string>("nova");
  const [speechModel, setSpeechModel] = useState<string>("gemini-3.8-flash-tts");
  const [speechAutoPlay, setSpeechAutoPlay] = useState<boolean>(true);
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [showSpeechKey, setShowSpeechKey] = useState<boolean>(false);
  const [detectedSpeechModels, setDetectedSpeechModels] = useState<string[]>([]);
  const [detectingSpeechModels, setDetectingSpeechModels] = useState<boolean>(false);
  const [testingSpeech, setTestingSpeech] = useState<boolean>(false);

  // Step 3: Speech-to-Text (STT) Key (OPTIONAL)
  const [transcribeProvider, setTranscribeProvider] = useState<"gemini" | "groq" | "openai" | "custom">("gemini");
  const [transcribeApiKey, setTranscribeApiKey] = useState<string>("");
  const [transcribeBaseUrl, setTranscribeBaseUrl] = useState<string>("");
  const [transcribeModel, setTranscribeModel] = useState<string>("gemini-3.5-flash");
  const [showTranscribeKey, setShowTranscribeKey] = useState<boolean>(false);
  const [detectedTranscribeModels, setDetectedTranscribeModels] = useState<string[]>([]);
  const [detectingTranscribeModels, setDetectingTranscribeModels] = useState<boolean>(false);

  // Step 4: Timezone & Habits (OPTIONAL)
  const [allTimezones, setAllTimezones] = useState<string[]>([]);
  const [timezoneSearch, setTimezoneSearch] = useState<string>("");
  const [timezone, setTimezone] = useState<string>("UTC");
  const [dailyGoal, setDailyGoal] = useState<number>(20);
  const [reviewLimit, setReviewLimit] = useState<number>(50);
  const [sessionBreakMinutes, setSessionBreakMinutes] = useState<number>(25);

  // Step 5: Starter Deck Choice (OPTIONAL)
  const [startingOption, setStartingOption] = useState<"starter-pack" | "blank-deck" | "skip">("starter-pack");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customDeckName, setCustomDeckName] = useState<string>("");

  // Load complete global list of timezones and detect device timezone
  useEffect(() => {
    const list = getAllAvailableTimezones();
    setAllTimezones(list);

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setTimezone(tz);
    } catch {}
  }, []);

  const filteredTimezones = useMemo(() => {
    if (!timezoneSearch.trim()) return allTimezones;
    const query = timezoneSearch.toLowerCase().trim();
    return allTimezones.filter((z) => z.toLowerCase().includes(query));
  }, [allTimezones, timezoneSearch]);

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

  // Handler: Test AI Connection in Step 2
  const handleTestAiConnection = async () => {
    if (aiProvider === "custom" && !aiBaseUrl.trim()) {
      showToast("Please enter a Base URL first", "error");
      return;
    }
    if (aiProvider !== "custom" && !aiApiKey.trim()) {
      showToast(`Please enter an API key for ${aiProvider.toUpperCase()} first`, "error");
      return;
    }

    setTestingAi(true);
    try {
      const params = new URLSearchParams({ provider: aiProvider });
      if (aiApiKey.trim()) params.set("apiKey", aiApiKey.trim());
      if (aiBaseUrl.trim()) params.set("baseUrl", aiBaseUrl.trim());

      const res = await fetch(`/api/ai/models?${params.toString()}`);
      if (res.ok) {
        showToast(`${aiProvider.toUpperCase()} connection successful!`, "success");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(`Connection failed: ${data.message || res.statusText}`, "error");
      }
    } catch (err: any) {
      showToast(`Connection error: ${err.message || "Network error"}`, "error");
    } finally {
      setTestingAi(false);
    }
  };

  // Handler: Detect AI Models in Step 2
  const detectAiModels = async () => {
    if (aiProvider === "custom" && !aiBaseUrl.trim()) {
      showToast("Please enter a Base URL for your custom AI server first", "error");
      return;
    }
    if (aiProvider !== "custom" && !aiApiKey.trim()) {
      showToast(`Please enter an API key for ${aiProvider.toUpperCase()} first`, "error");
      return;
    }

    setDetectingAiModels(true);
    try {
      const params = new URLSearchParams({ provider: aiProvider });
      if (aiApiKey.trim()) params.set("apiKey", aiApiKey.trim());
      if (aiBaseUrl.trim()) params.set("baseUrl", aiBaseUrl.trim());

      const res = await fetch(`/api/ai/models?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to detect AI models (${res.status})`);
      }
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        setDetectedAiModels(data.models);
        if (!aiModel || !data.models.includes(aiModel)) {
          setAiModel(data.models[0]);
        }
        showToast(`Found ${data.models.length} AI models`, "success");
      } else {
        setDetectedAiModels([]);
        showToast("No models found for this provider", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to detect AI models", "error");
    } finally {
      setDetectingAiModels(false);
    }
  };

  // Handler: Test Speech Output in Wizard
  const handleTestSpeech = async () => {
    setTestingSpeech(true);
    try {
      const sampleSentence = "Welcome to Flashguage! This is a preview of your speech voice.";
      showToast("Generating voice preview...", "info");
      await playCardSpeech(sampleSentence, selectedLanguage || "en", {
        provider: speechProvider,
        apiKey: speechApiKey.trim(),
        baseUrl: speechBaseUrl.trim(),
        voice: speechVoice.trim(),
        speed: Number(speechSpeed),
        model: speechModel.trim(),
        skipCache: true,
        onEnd: () => setTestingSpeech(false),
        onError: (err) => {
          showToast(`Speech test failed: ${err?.message || "Could not generate speech"}`, "error");
          setTestingSpeech(false);
        },
      });
      setTimeout(() => setTestingSpeech(false), 3500);
    } catch (err: any) {
      showToast(`Speech test failed: ${err?.message || "Could not generate speech"}`, "error");
      setTestingSpeech(false);
    }
  };

  // Handler: Detect Text-to-Speech (TTS) Models
  const detectSpeechModels = async () => {
    if (speechProvider === "browser") return;
    if (speechProvider === "custom" && !speechBaseUrl.trim()) {
      showToast("Please enter a Base URL for your custom TTS server first", "error");
      return;
    }
    if (speechProvider !== "custom" && !speechApiKey.trim()) {
      showToast("Please enter a TTS API key first", "error");
      return;
    }

    setDetectingSpeechModels(true);
    try {
      const params = new URLSearchParams({
        provider: speechProvider,
        mode: "tts",
      });
      if (speechApiKey.trim()) params.set("apiKey", speechApiKey.trim());
      if (speechBaseUrl.trim()) params.set("baseUrl", speechBaseUrl.trim());

      const res = await fetch(`/api/ai/speech-models?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to detect TTS models (${res.status})`);
      }
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        setDetectedSpeechModels(data.models);
        if (!speechModel || !data.models.includes(speechModel)) {
          setSpeechModel(data.models[0]);
        }
        showToast(`Found ${data.models.length} TTS models`, "success");
      } else {
        setDetectedSpeechModels([]);
        showToast("No TTS models found for this provider", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to detect TTS models", "error");
    } finally {
      setDetectingSpeechModels(false);
    }
  };

  // Handler: Detect Speech-to-Text (STT) Models
  const detectTranscribeModels = async () => {
    if (transcribeProvider === "custom" && !transcribeBaseUrl.trim()) {
      showToast("Please enter a Base URL for your custom STT server first", "error");
      return;
    }
    if (transcribeProvider !== "custom" && !transcribeApiKey.trim()) {
      showToast(`Please enter an API key for ${transcribeProvider.toUpperCase()} first`, "error");
      return;
    }

    setDetectingTranscribeModels(true);
    try {
      const params = new URLSearchParams({
        provider: transcribeProvider,
        mode: "stt",
      });
      if (transcribeApiKey.trim()) params.set("apiKey", transcribeApiKey.trim());
      if (transcribeBaseUrl.trim()) params.set("baseUrl", transcribeBaseUrl.trim());

      const res = await fetch(`/api/ai/speech-models?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to detect STT models (${res.status})`);
      }
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        setDetectedTranscribeModels(data.models);
        if (!transcribeModel || !data.models.includes(transcribeModel)) {
          setTranscribeModel(data.models[0]);
        }
        showToast(`Found ${data.models.length} speech recognition models`, "success");
      } else {
        setDetectedTranscribeModels([]);
        showToast("No speech recognition models found for this provider", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to detect STT models", "error");
    } finally {
      setDetectingTranscribeModels(false);
    }
  };

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
        speechModel,
        transcribeProvider,
        transcribeModel,
      };

      if (aiApiKey.trim() || aiProvider === "custom") {
        settingsPayload.aiProvider = aiProvider;
        if (aiApiKey.trim()) settingsPayload.aiApiKey = aiApiKey.trim();
        if (aiModel.trim()) settingsPayload.aiModel = aiModel.trim();
        if (aiBaseUrl.trim()) settingsPayload.customBaseUrl = aiBaseUrl.trim();
        if (aiProvider === "gemini" && aiApiKey.trim()) settingsPayload.geminiKey = aiApiKey.trim();
        if (aiProvider === "openai" && aiApiKey.trim()) settingsPayload.openaiKey = aiApiKey.trim();
        if (aiProvider === "anthropic" && aiApiKey.trim()) settingsPayload.anthropicKey = aiApiKey.trim();
        if (aiProvider === "groq" && aiApiKey.trim()) settingsPayload.groqKey = aiApiKey.trim();
      }

      if (speechApiKey.trim()) {
        settingsPayload.speechApiKey = speechApiKey.trim();
      }
      if (speechProvider === "custom" && speechBaseUrl.trim()) {
        settingsPayload.speechBaseUrl = speechBaseUrl.trim();
      }

      if (transcribeApiKey.trim()) {
        settingsPayload.transcribeApiKey = transcribeApiKey.trim();
      }
      if (transcribeProvider === "custom" && transcribeBaseUrl.trim()) {
        settingsPayload.transcribeBaseUrl = transcribeBaseUrl.trim();
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
      <header className="border-b border-border/80 bg-background/80 backdrop-blur-md px-4 py-4 sm:px-8 sticky top-0 z-20">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-600 text-white font-black shadow-sm shrink-0">
              <span className="text-sm">FG</span>
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-foreground block">
                Flashguage Assistant
              </span>
              <span className="text-xs text-muted-foreground font-medium block -mt-0.5">
                Quick Setup Wizard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm font-bold text-muted-foreground whitespace-nowrap">
                Step {step} of 5
              </span>
              <div className="w-16 sm:w-28 h-2.5 rounded-full bg-muted overflow-hidden border border-border/60">
                <div
                  className="h-full bg-gradient-to-r from-primary to-indigo-600 transition-all duration-300"
                  style={{ width: `${(step / 5) * 100}%` }}
                />
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2.5 py-1.5 h-8 gap-1.5 rounded-xl border border-border/60 transition-colors shadow-2xs"
              title="Sign out of this account"
            >
              <span aria-hidden="true">🚪</span>
              <span className="hidden sm:inline">Log out</span>
            </Button>
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

              {/* Wizard Footer for Step 1 */}
              <div className="pt-6 border-t border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Selected track: <strong className="text-foreground">{selectedLangInfo.flag} {selectedLangInfo.name}</strong>
                </span>

                <Button
                  type="button"
                  onClick={handleNextStep}
                  size="md"
                  className="px-6 py-2.5 text-sm font-bold shadow-sm shadow-primary/25 bg-gradient-to-r from-primary to-indigo-600 hover:opacity-95 text-white gap-2"
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs">
                    <span>✨ Step 2 of 5 (Optional)</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                    Connect AI for Smart Generation
                  </h1>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTestAiConnection}
                  disabled={testingAi || (aiProvider === "custom" ? !aiBaseUrl.trim() : !aiApiKey.trim())}
                  className="text-xs h-8 px-3 border border-border flex items-center gap-1.5 self-start sm:self-center shadow-xs"
                >
                  <span>{testingAi ? "Testing..." : "⚡ Test Connection"}</span>
                </Button>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Add an AI API key to generate flashcards from text, get context scenarios, and smart definitions. You can skip this and configure it anytime in Settings.
              </p>

              {/* Provider Selection: Clean buttons without subtitles */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Select AI Provider
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    { id: "gemini", name: "Gemini" },
                    { id: "openai", name: "OpenAI" },
                    { id: "groq", name: "Groq" },
                    { id: "anthropic", name: "Anthropic" },
                    { id: "custom", name: "Custom" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setAiProvider(p.id);
                        setDetectedAiModels([]);
                        if (p.id === "gemini") setAiModel("gemini-1.5-flash");
                        else if (p.id === "groq") setAiModel("llama-3.3-70b-versatile");
                        else if (p.id === "openai") setAiModel("gpt-4o-mini");
                        else if (p.id === "anthropic") setAiModel("claude-3-5-sonnet-20241022");
                        else if (p.id === "custom") setAiModel("gpt-4o-mini");
                      }}
                      className={`h-11 px-3 rounded-xl border text-center font-bold text-xs sm:text-sm transition-all flex items-center justify-center ${
                        aiProvider === p.id
                          ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20 ring-2 ring-primary/30"
                          : "border-border/80 bg-card hover:bg-muted text-foreground"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inputs based on selected provider */}
              <div className="space-y-3">
                {aiProvider === "custom" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Custom AI Base URL
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. http://localhost:11434/v1 or https://api.your-ai.com/v1"
                      value={aiBaseUrl}
                      onChange={(e) => setAiBaseUrl(e.target.value)}
                      className="text-xs sm:text-sm rounded-xl font-mono"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
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
                      className="pr-14 text-xs sm:text-sm rounded-xl font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAiKey(!showAiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-semibold px-1 py-0.5"
                    >
                      {showAiKey ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={detectAiModels}
                    disabled={
                      detectingAiModels ||
                      (aiProvider === "custom" ? !aiBaseUrl.trim() : !aiApiKey.trim())
                    }
                    className="text-xs h-8 px-3 border border-border"
                  >
                    {detectingAiModels ? "Detecting AI models..." : "🔍 Detect AI Models"}
                  </Button>
                </div>

                {detectedAiModels.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-medium text-muted-foreground">Available AI models from your key:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detectedAiModels.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setAiModel(m)}
                          className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                            aiModel === m
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border bg-background text-foreground hover:bg-accent"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    AI Model
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. gemini-1.5-flash, gpt-4o-mini, llama-3.3-70b-versatile, claude-3-5-sonnet-20241022"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="text-xs rounded-xl font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Model used for generating flashcards, example sentences, and explanations.
                  </p>
                </div>
              </div>

              {/* Helpful Tip Box */}
              <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 text-xs text-muted-foreground space-y-1">
                <p className="font-bold text-foreground">💡 Don&apos;t have an API key right now?</p>
                <p>
                  No problem! You can skip this step and start practicing immediately. All built-in starter decks work 100% offline without any API key.
                </p>
              </div>

              {/* Wizard Footer for Step 2 */}
              <div className="pt-6 border-t border-border/70 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handlePrevStep}
                  size="md"
                  className="px-5 text-sm font-bold text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </Button>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSkipStep}
                    size="md"
                    className="px-5 text-sm font-bold border-border bg-card hover:bg-muted text-foreground shadow-xs"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    size="md"
                    className="px-6 text-sm font-bold shadow-sm shadow-primary/25 bg-gradient-to-r from-primary to-indigo-600 hover:opacity-95 text-white"
                  >
                    Continue →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 3: Voice (TTS) & Microphone (STT) Setup (OPTIONAL) ──────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-xs">
                  <span>🎙️ Step 3 of 5 (Optional)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Voice Pronunciation & Microphone Practice
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Configure lifelike voices to hear pronunciation and speech recognition to evaluate your spoken {selectedLangInfo.name}.
                </p>
              </div>

              {/* ── Sub-card 1: Text-to-Speech (TTS) ── */}
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg" aria-hidden="true">🔊</span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        1. Text-to-Speech (TTS) — Voice Pronunciation
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Engine used to pronounce flashcard words and example sentences.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleTestSpeech}
                    disabled={testingSpeech}
                    className="text-xs h-8 px-3 border border-border flex items-center gap-1.5 shadow-xs"
                  >
                    <span>{testingSpeech ? "🔊 Playing..." : "🔊 Test Voice"}</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: "browser", name: "Browser (Free)" },
                      { id: "gemini", name: "Gemini" },
                      { id: "openai", name: "OpenAI" },
                      { id: "elevenlabs", name: "ElevenLabs" },
                      { id: "custom", name: "Custom" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSpeechProvider(p.id);
                          setDetectedSpeechModels([]);
                          if (p.id === "gemini") setSpeechModel("gemini-3.8-flash-tts");
                          else if (p.id === "openai") setSpeechModel("tts-1");
                          else if (p.id === "elevenlabs") setSpeechModel("eleven_multilingual_v2");
                          else if (p.id === "custom") setSpeechModel("tts-1");
                        }}
                        className={`h-10 px-2 rounded-xl border text-center font-bold text-xs transition-all flex items-center justify-center ${
                          speechProvider === p.id
                            ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20 ring-2 ring-primary/30"
                            : "border-border/80 bg-card hover:bg-muted text-foreground"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {speechProvider !== "browser" && (
                  <div className="space-y-3 pt-1">
                    {speechProvider === "custom" && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">
                          Custom TTS Server Base URL
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. http://localhost:8000/v1 or https://my-tts.com/v1"
                          value={speechBaseUrl}
                          onChange={(e) => setSpeechBaseUrl(e.target.value)}
                          className="text-xs rounded-xl font-mono"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        {speechProvider.toUpperCase()} TTS API Key {speechProvider === "custom" ? "(Optional)" : ""}
                      </label>
                      <div className="relative">
                        <Input
                          type={showSpeechKey ? "text" : "password"}
                          placeholder={`Enter your ${speechProvider.toUpperCase()} key for TTS...`}
                          value={speechApiKey}
                          onChange={(e) => setSpeechApiKey(e.target.value)}
                          className="pr-14 text-xs rounded-xl font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSpeechKey(!showSpeechKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-semibold px-1 py-0.5"
                        >
                          {showSpeechKey ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={detectSpeechModels}
                        disabled={
                          detectingSpeechModels ||
                          (speechProvider === "custom" ? !speechBaseUrl.trim() : !speechApiKey.trim())
                        }
                        className="text-xs h-8 px-3 border border-border"
                      >
                        {detectingSpeechModels ? "Detecting TTS models..." : "🔍 Detect TTS Models"}
                      </Button>
                    </div>

                    {detectedSpeechModels.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Available TTS models from your key:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {detectedSpeechModels.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setSpeechModel(m)}
                              className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                                speechModel === m
                                  ? "border-primary bg-primary/10 text-primary font-bold"
                                  : "border-border bg-background text-foreground hover:bg-accent"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        TTS Model
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. gemini-3.8-flash-tts, tts-1, eleven_multilingual_v2"
                        value={speechModel}
                        onChange={(e) => setSpeechModel(e.target.value)}
                        className="text-xs rounded-xl font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Auto-pronounce toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/30 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Auto-Pronounce on Reveal
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Automatically pronounce word when flipping card during study.
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

              {/* ── Sub-card 2: Speech-to-Text (STT) ── */}
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden="true">🎙️</span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      2. Speech-to-Text (STT) — Microphone Recognition & Practice
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Engine used to transcribe your voice when practicing pronunciation into the microphone.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "gemini", name: "Gemini" },
                      { id: "groq", name: "Groq (Whisper)" },
                      { id: "openai", name: "OpenAI (Whisper)" },
                      { id: "custom", name: "Custom" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const newP = p.id as any;
                          setTranscribeProvider(newP);
                          setDetectedTranscribeModels([]);
                          if (newP === "gemini") setTranscribeModel("gemini-3.5-flash");
                          else if (newP === "groq") setTranscribeModel("whisper-large-v3-turbo");
                          else if (newP === "openai") setTranscribeModel("whisper-1");
                          else if (newP === "custom") setTranscribeModel("whisper-1");
                        }}
                        className={`h-10 px-2 rounded-xl border text-center font-bold text-xs transition-all flex items-center justify-center ${
                          transcribeProvider === p.id
                            ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20 ring-2 ring-primary/30"
                            : "border-border/80 bg-card hover:bg-muted text-foreground"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {transcribeProvider === "custom" && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Custom Transcription Server Base URL
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. http://localhost:8000/v1 or https://my-whisper.com/v1"
                        value={transcribeBaseUrl}
                        onChange={(e) => setTranscribeBaseUrl(e.target.value)}
                        className="text-xs rounded-xl font-mono"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">
                      {transcribeProvider.toUpperCase()} STT API Key {transcribeProvider === "custom" ? "(Optional)" : ""}
                    </label>
                    <div className="relative">
                      <Input
                        type={showTranscribeKey ? "text" : "password"}
                        placeholder={`Enter your ${transcribeProvider.toUpperCase()} key for STT transcription...`}
                        value={transcribeApiKey}
                        onChange={(e) => setTranscribeApiKey(e.target.value)}
                        className="pr-14 text-xs rounded-xl font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTranscribeKey(!showTranscribeKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-semibold px-1 py-0.5"
                      >
                        {showTranscribeKey ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={detectTranscribeModels}
                      disabled={
                        detectingTranscribeModels ||
                        (transcribeProvider === "custom" ? !transcribeBaseUrl.trim() : !transcribeApiKey.trim())
                      }
                      className="text-xs h-8 px-3 border border-border"
                    >
                      {detectingTranscribeModels ? "Detecting STT models..." : "🔍 Detect STT Models"}
                    </Button>
                  </div>

                  {detectedTranscribeModels.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-medium text-muted-foreground">Available STT models from your key:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {detectedTranscribeModels.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setTranscribeModel(m)}
                            className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                              transcribeModel === m
                                ? "border-primary bg-primary/10 text-primary font-bold"
                                : "border-border bg-background text-foreground hover:bg-accent"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">
                      STT Model
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. gemini-3.5-flash, whisper-large-v3-turbo, whisper-1"
                      value={transcribeModel}
                      onChange={(e) => setTranscribeModel(e.target.value)}
                      className="text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Wizard Footer for Step 3 */}
              <div className="pt-6 border-t border-border/70 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handlePrevStep}
                  size="md"
                  className="px-5 text-sm font-bold text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </Button>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSkipStep}
                    size="md"
                    className="px-5 text-sm font-bold border-border bg-card hover:bg-muted text-foreground shadow-xs"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    size="md"
                    className="px-6 text-sm font-bold shadow-sm shadow-primary/25 bg-gradient-to-r from-primary to-indigo-600 hover:opacity-95 text-white"
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
                  Tailor your daily goals and time settings so Flashguage calculates accurate spaced repetition intervals.
                </p>
              </div>

              {/* Timezone Selector with Search and Complete IANA List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                    Your Timezone ({allTimezones.length} Available)
                  </label>
                  <span className="text-[11px] font-semibold text-primary">
                    Current: {timezone}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Input
                    type="text"
                    placeholder="Search timezone (e.g. Madrid, Mexico_City, Tokyo, Bogota)..."
                    value={timezoneSearch}
                    onChange={(e) => setTimezoneSearch(e.target.value)}
                    className="rounded-xl text-xs sm:text-sm"
                  />

                  <Select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="rounded-xl text-xs sm:text-sm font-semibold max-h-48"
                  >
                    {!allTimezones.includes(timezone) && (
                      <option value={timezone}>{timezone} (Detected)</option>
                    )}
                    {filteredTimezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Daily Goal Cards */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Daily Recall Goal
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { value: 10, label: "10 cards" },
                    { value: 20, label: "20 cards" },
                    { value: 30, label: "30 cards" },
                    { value: 50, label: "50 cards" },
                  ].map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setDailyGoal(g.value)}
                      className={`h-11 px-3 rounded-xl border text-center font-bold text-sm transition-all flex items-center justify-center ${
                        dailyGoal === g.value
                          ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20 ring-2 ring-primary/30"
                          : "border-border/80 bg-card hover:bg-muted text-foreground"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review limit and session break */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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
                    Study Interval / Break
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

              {/* Wizard Footer for Step 4 */}
              <div className="pt-6 border-t border-border/70 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handlePrevStep}
                  size="md"
                  className="px-5 text-sm font-bold text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </Button>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSkipStep}
                    size="md"
                    className="px-5 text-sm font-bold border-border bg-card hover:bg-muted text-foreground shadow-xs"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    size="md"
                    className="px-6 text-sm font-bold shadow-sm shadow-primary/25 bg-gradient-to-r from-primary to-indigo-600 hover:opacity-95 text-white"
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
                    desc: "Import verified high-yield vocabulary ready to study right now.",
                    icon: "📦",
                  },
                  {
                    id: "blank-deck",
                    title: "Create Blank Deck",
                    desc: "Create an empty deck and add your own custom flashcards.",
                    icon: "✏️",
                  },
                  {
                    id: "skip",
                    title: "Explore Dashboard",
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

              {/* Wizard Footer for Step 5 */}
              <div className="pt-6 border-t border-border/70 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handlePrevStep}
                  size="md"
                  className="px-5 text-sm font-bold text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </Button>

                <Button
                  type="button"
                  onClick={handleFinishOnboarding}
                  disabled={isSubmitting}
                  size="md"
                  className="px-7 py-2.5 text-sm font-bold shadow-sm shadow-primary/25 bg-gradient-to-r from-primary to-indigo-600 hover:opacity-95 text-white gap-2"
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
