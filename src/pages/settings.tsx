import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Input, Select } from "@/components/ui/input";
import { LoadingPage } from "@/components/ui/loading";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { playCardSpeech } from "@/lib/speech";

export type AIProvider = "openai" | "anthropic" | "gemini" | "ollama" | "custom";
export type SpeechProvider = "browser" | "gemini" | "openai" | "elevenlabs" | "custom";
export type TranscribeProvider = "gemini" | "groq" | "openai" | "custom";

interface SettingsData {
  name?: string;
  email?: string;
  aiProvider?: AIProvider;
  aiApiKey?: string;
  aiBaseUrl?: string;
  aiModel?: string;
  openaiKey?: string;
  anthropicKey?: string;
  geminiKey?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
  customBaseUrl?: string;
  customApiKey?: string;
  customModel?: string;
  openaiModel?: string;
  anthropicModel?: string;
  geminiModel?: string;
  theme?: string;
  timezone?: string;
  dailyGoal?: number;
  reviewLimit?: number;
  sessionBreakMinutes?: number;
  notifications?: boolean;
  dailyReminder?: boolean;
  weeklyEmail?: boolean;
  soundEffects?: boolean;
  plugins?: string[];
  speechProvider?: SpeechProvider;
  speechApiKey?: string;
  speechBaseUrl?: string;
  speechVoice?: string;
  speechSpeed?: number;
  speechAutoPlay?: boolean;
  speechModel?: string;
  transcribeProvider?: TranscribeProvider | "same";
  transcribeApiKey?: string;
  transcribeBaseUrl?: string;
  transcribeModel?: string;
}

const fetcher = async (url: string): Promise<SettingsData> => {
  const res = await fetch(`${url}?t=${Date.now()}`);
  if (!res.ok) {
    throw new Error("Failed to load settings");
  }
  return res.json();
};

const POPULAR_TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time) — Default" },
  { value: "America/New_York", label: "America/New York (Eastern Time - US & Canada)" },
  { value: "America/Chicago", label: "America/Chicago (Central Time - US & Canada)" },
  { value: "America/Denver", label: "America/Denver (Mountain Time - US & Canada)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (Pacific Time - US & Canada)" },
  { value: "America/Anchorage", label: "America/Anchorage (Alaska Time)" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (Hawaii Time)" },
  { value: "America/Hermosillo", label: "America/Hermosillo (Sonora / MST - Mexico)" },
  { value: "America/Tijuana", label: "America/Tijuana (Baja California / PST - Mexico)" },
  { value: "America/Mexico_City", label: "America/Mexico City (Central Mexico)" },
  { value: "America/Bogota", label: "America/Bogotá (Colombia, Ecuador, Peru)" },
  { value: "America/Lima", label: "America/Lima (Peru)" },
  { value: "America/Santiago", label: "America/Santiago (Chile)" },
  { value: "America/Buenos_Aires", label: "America/Buenos Aires (Argentina)" },
  { value: "America/Sao_Paulo", label: "America/São Paulo (Brazil)" },
  { value: "Europe/London", label: "Europe/London (GMT / BST)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (CET / CEST - Spain)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET / CEST - France)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET / CEST - Germany)" },
  { value: "Europe/Rome", label: "Europe/Rome (CET / CEST - Italy)" },
  { value: "Europe/Athens", label: "Europe/Athens (EET / EEST - Greece)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (MSK)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST - UAE)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST - India)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (ICT - Thailand, Vietnam)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST - China)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST - Japan)" },
  { value: "Asia/Seoul", label: "Asia/Seoul (KST - South Korea)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST / AEDT)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST / NZDT)" },
];

export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const {
    data: apiSettings,
    error: apiError,
    isLoading: isSettingsLoading,
    mutate: mutateSettings,
  } = useSWR<SettingsData>("/api/settings", fetcher);

  // AI Configuration state
  const [aiProvider, setAiProvider] = useState<AIProvider>("openai");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [ollamaModel, setOllamaModel] = useState("");
  const [openaiModel, setOpenaiModel] = useState("");
  const [anthropicModel, setAnthropicModel] = useState("");
  const [geminiModel, setGeminiModel] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [customModel, setCustomModel] = useState("");

  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showCustomApiKey, setShowCustomApiKey] = useState(false);

  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [testingAnthropic, setTestingAnthropic] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testingOllama, setTestingOllama] = useState(false);
  const [testingCustom, setTestingCustom] = useState(false);
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [detectingModels, setDetectingModels] = useState(false);
  const [savingAI, setSavingAI] = useState(false);

  // Study Settings state
  const [dailyGoal, setDailyGoal] = useState<number>(20);
  const [reviewLimit, setReviewLimit] = useState<number>(20);
  const [sessionBreakMinutes, setSessionBreakMinutes] = useState<number>(5);
  const [timezone, setTimezone] = useState<string>("UTC");
  const [savingStudy, setSavingStudy] = useState(false);

  // Notification Settings state
  const [dailyReminder, setDailyReminder] = useState<boolean>(true);
  const [weeklyEmail, setWeeklyEmail] = useState<boolean>(false);
  const [soundEffects, setSoundEffects] = useState<boolean>(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Text-to-Speech (TTS) Settings state
  const [speechProvider, setSpeechProvider] = useState<SpeechProvider>("browser");
  const [speechApiKey, setSpeechApiKey] = useState("");
  const [speechBaseUrl, setSpeechBaseUrl] = useState("");
  const [showSpeechApiKey, setShowSpeechApiKey] = useState(false);
  const [speechVoice, setSpeechVoice] = useState("nova");
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [speechAutoPlay, setSpeechAutoPlay] = useState<boolean>(true);
  const [speechModel, setSpeechModel] = useState("gemini-3.8-flash-tts");
  const [detectedSpeechModels, setDetectedSpeechModels] = useState<string[]>([]);
  const [detectingSpeechModels, setDetectingSpeechModels] = useState(false);
  const [savingTTS, setSavingTTS] = useState(false);
  const [testingSpeech, setTestingSpeech] = useState(false);

  // Speech-to-Text (STT) Settings state
  const [transcribeProvider, setTranscribeProvider] = useState<TranscribeProvider>("gemini");
  const [transcribeApiKey, setTranscribeApiKey] = useState("");
  const [transcribeBaseUrl, setTranscribeBaseUrl] = useState("");
  const [showTranscribeApiKey, setShowTranscribeApiKey] = useState(false);
  const [transcribeModel, setTranscribeModel] = useState("gemini-3.5-flash");
  const [detectedTranscribeModels, setDetectedTranscribeModels] = useState<string[]>([]);
  const [detectingTranscribeModels, setDetectingTranscribeModels] = useState(false);
  const [savingSTT, setSavingSTT] = useState(false);

  // Keep state in sync with fetched settings or session
  useEffect(() => {
    if (apiSettings) {
      if (apiSettings.aiProvider) {
        setAiProvider(apiSettings.aiProvider);
      }
      if (apiSettings.openaiKey !== undefined) {
        setOpenaiKey(apiSettings.openaiKey);
      }
      if (apiSettings.anthropicKey !== undefined) {
        setAnthropicKey(apiSettings.anthropicKey);
      }
      if (apiSettings.geminiKey !== undefined) {
        setGeminiKey(apiSettings.geminiKey);
      }
      if (apiSettings.ollamaUrl !== undefined) {
        setOllamaUrl(apiSettings.ollamaUrl);
      }
      if (apiSettings.ollamaModel !== undefined) {
        setOllamaModel(apiSettings.ollamaModel);
      }
      if (apiSettings.customBaseUrl !== undefined) {
        setCustomBaseUrl(apiSettings.customBaseUrl);
      }
      if (apiSettings.customApiKey !== undefined) {
        setCustomApiKey(apiSettings.customApiKey);
      }
      if (apiSettings.customModel !== undefined) {
        setCustomModel(apiSettings.customModel);
      }
      if (apiSettings.openaiModel !== undefined) {
        setOpenaiModel(apiSettings.openaiModel);
      }
      if (apiSettings.anthropicModel !== undefined) {
        setAnthropicModel(apiSettings.anthropicModel);
      }
      if (apiSettings.geminiModel !== undefined) {
        setGeminiModel(apiSettings.geminiModel);
      }
      if (typeof apiSettings.dailyGoal === "number") {
        setDailyGoal(apiSettings.dailyGoal);
      }
      if (typeof apiSettings.reviewLimit === "number") {
        setReviewLimit(apiSettings.reviewLimit);
      }
      if (typeof apiSettings.sessionBreakMinutes === "number") {
        setSessionBreakMinutes(apiSettings.sessionBreakMinutes);
      }
      if (apiSettings.timezone) {
        setTimezone(apiSettings.timezone);
      }
      if (typeof apiSettings.dailyReminder === "boolean") {
        setDailyReminder(apiSettings.dailyReminder);
      }
      if (typeof apiSettings.weeklyEmail === "boolean") {
        setWeeklyEmail(apiSettings.weeklyEmail);
      }
      if (typeof apiSettings.soundEffects === "boolean") {
        setSoundEffects(apiSettings.soundEffects);
      }
      if (apiSettings.speechProvider) {
        setSpeechProvider(apiSettings.speechProvider);
      }
      if (apiSettings.speechApiKey !== undefined) {
        setSpeechApiKey(apiSettings.speechApiKey);
      }
      if (apiSettings.speechBaseUrl !== undefined) {
        setSpeechBaseUrl(apiSettings.speechBaseUrl);
      }
      if (apiSettings.speechVoice !== undefined) {
        setSpeechVoice(apiSettings.speechVoice);
      }
      if (typeof apiSettings.speechSpeed === "number") {
        setSpeechSpeed(apiSettings.speechSpeed);
      }
      if (typeof apiSettings.speechAutoPlay === "boolean") {
        setSpeechAutoPlay(apiSettings.speechAutoPlay);
      }
      if (apiSettings.speechModel !== undefined) {
        setSpeechModel(apiSettings.speechModel);
      }
      if (apiSettings.transcribeProvider && (apiSettings.transcribeProvider as any) !== "same") {
        setTranscribeProvider(apiSettings.transcribeProvider as TranscribeProvider);
      } else {
        setTranscribeProvider("gemini");
      }
      if (apiSettings.transcribeApiKey !== undefined) {
        setTranscribeApiKey(apiSettings.transcribeApiKey);
      }
      if (apiSettings.transcribeBaseUrl !== undefined) {
        setTranscribeBaseUrl(apiSettings.transcribeBaseUrl);
      }
      if (apiSettings.transcribeModel !== undefined) {
        setTranscribeModel(apiSettings.transcribeModel);
      }
    }
  }, [apiSettings]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Handler: Save AI Settings
  const handleSaveAISettings = async () => {
    setSavingAI(true);
    try {
      const payload = {
        aiProvider,
        openaiKey: openaiKey.trim(),
        anthropicKey: anthropicKey.trim(),
        geminiKey: geminiKey.trim(),
        ollamaUrl: ollamaUrl.trim(),
        ollamaModel: ollamaModel.trim(),
        customBaseUrl: customBaseUrl.trim(),
        customApiKey: customApiKey.trim(),
        customModel: customModel.trim(),
        openaiModel: openaiModel.trim(),
        anthropicModel: anthropicModel.trim(),
        geminiModel: geminiModel.trim(),
      };

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save AI settings");
      }

      const updated = await res.json();
      await mutateSettings(updated, false);
      showToast("AI configuration saved successfully!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to save AI settings. Please try again.",
        "error"
      );
    } finally {
      setSavingAI(false);
    }
  };

  // Handler: Test OpenAI Connection
  const testOpenAIConnection = async () => {
    if (!openaiKey.trim()) {
      showToast("Please enter an OpenAI API key first", "error");
      return;
    }
    setTestingOpenAI(true);
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${openaiKey.trim()}` },
      });
      if (res.ok) {
        showToast("OpenAI connection successful!", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(`OpenAI error: ${data.error?.message || res.statusText}`, "error");
      }
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "OpenAI connection failed (network/CORS)",
        "error"
      );
    } finally {
      setTestingOpenAI(false);
    }
  };

  // Handler: Test Anthropic Connection
  const testAnthropicConnection = async () => {
    if (!anthropicKey.trim()) {
      showToast("Please enter an Anthropic API key first", "error");
      return;
    }
    setTestingAnthropic(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": anthropicKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
      });
      if (res.ok) {
        showToast("Anthropic connection successful!", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(`Anthropic error: ${data.error?.message || res.statusText}`, "error");
      }
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Anthropic connection failed (network/CORS)",
        "error"
      );
    } finally {
      setTestingAnthropic(false);
    }
  };

  // Handler: Test Google Gemini Connection
  const testGeminiConnection = async () => {
    if (!geminiKey.trim()) {
      showToast("Please enter a Google Gemini API key first", "error");
      return;
    }
    setTestingGemini(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiKey.trim())}`
      );
      if (res.ok) {
        showToast("Google Gemini connection successful!", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(`Gemini error: ${data.error?.message || res.statusText}`, "error");
      }
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Google Gemini connection failed (network/CORS)",
        "error"
      );
    } finally {
      setTestingGemini(false);
    }
  };

  // Handler: Test Ollama Connection
  const testOllamaConnection = async () => {
    if (!ollamaUrl.trim()) {
      showToast("Please enter an Ollama URL first", "error");
      return;
    }
    setTestingOllama(true);
    try {
      const baseUrl = ollamaUrl.trim().replace(/\/+$/, "");
      const res = await fetch(`${baseUrl}/api/tags`);
      if (res.ok) {
        showToast("Ollama server reached successfully!", "success");
      } else {
        showToast(`Ollama responded with status: ${res.status}`, "error");
      }
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? `Cannot reach Ollama: ${err.message}` : "Ollama connection failed",
        "error"
      );
    } finally {
      setTestingOllama(false);
    }
  };

  // Handler: Test Custom OpenAI-compatible Connection
  const testCustomConnection = async () => {
    if (!customBaseUrl.trim()) {
      showToast("Please enter a Base URL first", "error");
      return;
    }
    setTestingCustom(true);
    try {
      const baseUrl = customBaseUrl.trim().replace(/\/+$/, "");
      const endpoint = baseUrl.endsWith("/models")
        ? baseUrl
        : baseUrl.endsWith("/v1")
        ? `${baseUrl}/models`
        : `${baseUrl}/v1/models`;

      const headers: Record<string, string> = {};
      if (customApiKey.trim()) {
        headers["Authorization"] = `Bearer ${customApiKey.trim()}`;
      }

      const res = await fetch(endpoint, { headers });
      if (res.ok) {
        showToast("Custom OpenAI-compatible endpoint reached successfully!", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(`Custom provider error: ${data.error?.message || res.statusText}`, "error");
      }
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Custom provider connection failed (network/CORS)",
        "error"
      );
    } finally {
      setTestingCustom(false);
    }
  };

  // Detect available models from provider API
  const detectModels = async () => {
    const provider = aiProvider;
    let apiKey = "";
    let baseUrl = "";

    if (provider === "openai") apiKey = openaiKey.trim();
    else if (provider === "anthropic") apiKey = anthropicKey.trim();
    else if (provider === "gemini") apiKey = geminiKey.trim();
    else if (provider === "ollama") baseUrl = ollamaUrl.trim();
    else if (provider === "custom") {
      baseUrl = customBaseUrl.trim();
      apiKey = customApiKey.trim();
    }

    if (!apiKey && provider !== "ollama" && provider !== "custom") {
      showToast("Please enter an API key first", "error");
      return;
    }
    if (!baseUrl && (provider === "ollama" || provider === "custom")) {
      showToast("Please enter a Base URL first", "error");
      return;
    }

    setDetectingModels(true);
    try {
      const params = new URLSearchParams({ provider });
      if (apiKey) params.set("apiKey", apiKey);
      if (baseUrl) params.set("baseUrl", baseUrl);

      const res = await fetch(`/api/ai/models?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to detect models (${res.status})`);
      }
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        setDetectedModels(data.models);
        showToast(`Found ${data.models.length} models`, "success");
      } else {
        setDetectedModels([]);
        showToast("No models found for this provider", "error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to detect models";
      showToast(msg, "error");
      setDetectedModels([]);
    } finally {
      setDetectingModels(false);
    }
  };

  // Handler: Save Study Settings
  const handleSaveStudySettings = async () => {
    setSavingStudy(true);
    try {
      const payload = {
        dailyGoal: Number(dailyGoal) || 20,
        reviewLimit: Number(reviewLimit) || 20,
        sessionBreakMinutes: Number(sessionBreakMinutes) || 5,
        timezone: timezone || "UTC",
      };

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update study settings");
      }

      const updated = await res.json();
      await mutateSettings(updated, false);
      showToast("Study settings saved successfully!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update study settings. Please try again.",
        "error"
      );
    } finally {
      setSavingStudy(false);
    }
  };

  // Handler: Save Notification Settings
  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      const payload = {
        dailyReminder,
        weeklyEmail,
        soundEffects,
        notifications: dailyReminder,
      };

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update notification settings");
      }

      const updated = await res.json();
      await mutateSettings(updated, false);
      showToast("Notification settings saved successfully!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update notification settings. Please try again.",
        "error"
      );
    } finally {
      setSavingNotifications(false);
    }
  };

  // Handler: Save Text-to-Speech (TTS) Settings
  const handleSaveTTSSettings = async () => {
    setSavingTTS(true);
    try {
      const payload = {
        speechProvider,
        speechApiKey: speechApiKey.trim(),
        speechBaseUrl: speechBaseUrl.trim(),
        speechVoice: speechVoice.trim(),
        speechSpeed: Number(speechSpeed),
        speechAutoPlay,
        speechModel: speechModel.trim(),
      };

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update TTS settings");
      }

      const updated = await res.json();
      await mutateSettings(updated, false);
      try {
        localStorage.setItem("flashguage_auto_pronounce", String(speechAutoPlay));
      } catch {}
      showToast("Text-to-Speech (TTS) settings saved successfully!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update TTS settings. Please try again.",
        "error"
      );
    } finally {
      setSavingTTS(false);
    }
  };

  // Handler: Save Speech-to-Text (STT) Settings
  const handleSaveSTTSettings = async () => {
    setSavingSTT(true);
    try {
      const payload = {
        transcribeProvider,
        transcribeApiKey: transcribeApiKey.trim(),
        transcribeBaseUrl: transcribeBaseUrl.trim(),
        transcribeModel: transcribeModel.trim(),
      };

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update STT settings");
      }

      const updated = await res.json();
      await mutateSettings(updated, false);
      showToast("Speech-to-Text (STT) settings saved successfully!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update STT settings. Please try again.",
        "error"
      );
    } finally {
      setSavingSTT(false);
    }
  };

  // Handler: Test Speech Output
  const handleTestSpeech = async () => {
    setTestingSpeech(true);
    try {
      const sampleSentence = "Hello! Welcome to Flashguage. This is a preview of your speech voice.";
      showToast("Generating voice preview...", "info");
      await playCardSpeech(sampleSentence, "en", {
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

  if (status === "loading" || (isSettingsLoading && !apiSettings)) {
    return <LoadingPage message="Loading settings..." />;
  }

  const currentUserEmail = session?.user?.email || apiSettings?.email || "Not specified";

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24 md:pb-6">
      <Header title="Settings" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-4">
          <BackButton href="/dashboard" />
        </div>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Settings & Preferences
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure AI integration, study goals, notifications, and application preferences.
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <span>User Profile & Password</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {apiError && (
          <div className="mb-6 rounded-md bg-destructive/15 p-4 text-sm text-destructive border border-destructive/20">
            Failed to synchronize settings with server. Displaying locally cached values.
          </div>
        )}

        <div className="space-y-6">
          {/* 1. User Profile Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl" aria-hidden="true">👤</span>
              <h2 className="text-lg font-semibold text-foreground">User Profile & Password</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Signed in as <span className="font-medium text-foreground">{currentUserEmail}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button href="/profile" as="link" variant="secondary">
                Edit Profile
              </Button>
            </div>
          </Card>

          {/* 2. AI Configuration Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl" aria-hidden="true">🤖</span>
              <h2 className="text-lg font-semibold text-foreground">AI Configuration</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Configure your API keys and endpoints for automatic flashcard generation.
            </p>

            <div className="border-t border-border pt-4 space-y-5">
              {/* Provider Selector Dropdown */}
              <div>
                <label htmlFor="ai-provider" className="block text-sm font-medium text-foreground mb-1">
                  AI Provider
                </label>
                <Select
                  id="ai-provider"
                  label="AI Provider"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as AIProvider)}
                  hint="Select your primary provider for dictionary definitions and sentence generation."
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="ollama">Ollama</option>
                  <option value="custom">Custom OpenAI-compatible</option>
                </Select>
              </div>

              {/* Provider-specific fields */}
              {aiProvider === "openai" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="openai-key" className="block text-sm font-medium text-foreground mb-1">
                      OpenAI API Key
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          id="openai-key"
                          type={showOpenAIKey ? "text" : "password"}
                          value={openaiKey}
                          onChange={(e) => setOpenaiKey(e.target.value)}
                          placeholder="sk-..."
                          className="w-full rounded-md border border-border bg-background px-3 py-2 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOpenAIKey((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1 text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none"
                          aria-label={showOpenAIKey ? "Hide OpenAI API Key" : "Show OpenAI API Key"}
                        >
                          {showOpenAIKey ? "Hide" : "Show"}
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={testOpenAIConnection}
                        disabled={testingOpenAI}
                        className="sm:w-auto"
                      >
                        {testingOpenAI ? "Testing..." : "Test Connection"}
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Used for GPT-4o-mini powered definitions and example sentences.
                    </p>
                  </div>

                  <div>
                    <Input
                      id="openai-model"
                      label="Model"
                      type="text"
                      value={openaiModel}
                      onChange={(e) => setOpenaiModel(e.target.value)}
                      placeholder="gpt-4o-mini"
                      hint="OpenAI model (e.g. gpt-4o-mini, gpt-4o, gpt-4-turbo)."
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={detectModels}
                      disabled={detectingModels || !openaiKey}
                      className="mt-2 w-full sm:w-auto"
                    >
                      {detectingModels ? "Detecting..." : "Detect Available Models"}
                    </Button>
                  </div>
                </div>
              )}

              {aiProvider === "anthropic" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="anthropic-key" className="block text-sm font-medium text-foreground mb-1">
                      Anthropic API Key
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          id="anthropic-key"
                          type={showAnthropicKey ? "text" : "password"}
                          value={anthropicKey}
                          onChange={(e) => setAnthropicKey(e.target.value)}
                          placeholder="sk-ant-..."
                          className="w-full rounded-md border border-border bg-background px-3 py-2 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAnthropicKey((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1 text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none"
                          aria-label={showAnthropicKey ? "Hide Anthropic API Key" : "Show Anthropic API Key"}
                        >
                          {showAnthropicKey ? "Hide" : "Show"}
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={testAnthropicConnection}
                        disabled={testingAnthropic}
                        className="sm:w-auto"
                      >
                        {testingAnthropic ? "Testing..." : "Test Connection"}
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Used for Claude powered vocabulary generation.
                    </p>
                  </div>

                  <div>
                    <Input
                      id="anthropic-model"
                      label="Model"
                      type="text"
                      value={anthropicModel}
                      onChange={(e) => setAnthropicModel(e.target.value)}
                      placeholder="claude-3-5-haiku-latest"
                      hint="Anthropic model (e.g. claude-3-5-haiku-latest, claude-3-opus)."
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={detectModels}
                      disabled={detectingModels || !anthropicKey}
                      className="mt-2 w-full sm:w-auto"
                    >
                      {detectingModels ? "Detecting..." : "Detect Available Models"}
                    </Button>
                  </div>
                </div>
              )}

              {aiProvider === "gemini" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="gemini-key" className="block text-sm font-medium text-foreground mb-1">
                      Google Gemini API Key
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          id="gemini-key"
                          type={showGeminiKey ? "text" : "password"}
                          value={geminiKey}
                          onChange={(e) => setGeminiKey(e.target.value)}
                          placeholder="AIzaSy..."
                          className="w-full rounded-md border border-border bg-background px-3 py-2 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGeminiKey((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1 text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none"
                          aria-label={showGeminiKey ? "Hide Google Gemini API Key" : "Show Google Gemini API Key"}
                        >
                          {showGeminiKey ? "Hide" : "Show"}
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={testGeminiConnection}
                        disabled={testingGemini}
                        className="sm:w-auto"
                      >
                        {testingGemini ? "Testing..." : "Test Connection"}
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Used for Gemini powered card and sentence generation.
                    </p>
                  </div>

                  <div>
                    <Input
                      id="gemini-model"
                      label="Model"
                      type="text"
                      value={geminiModel}
                      onChange={(e) => setGeminiModel(e.target.value)}
                      placeholder="gemini-3.1-flash-lite"
                      hint="Gemini model (e.g. gemini-3.1-flash-lite, gemini-3.5-flash-lite)."
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={detectModels}
                      disabled={detectingModels || !geminiKey}
                      className="mt-2 w-full sm:w-auto"
                    >
                      {detectingModels ? "Detecting..." : "Detect Available Models"}
                    </Button>
                  </div>
                </div>
              )}

              {aiProvider === "ollama" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="ollama-url" className="block text-sm font-medium text-foreground mb-1">
                      Ollama Base URL
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          id="ollama-url"
                          type="text"
                          value={ollamaUrl}
                          onChange={(e) => setOllamaUrl(e.target.value)}
                          placeholder="http://localhost:11434"
                          className="w-full rounded-md border border-border bg-background px-3 py-2 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={testOllamaConnection}
                        disabled={testingOllama}
                        className="sm:w-auto"
                      >
                        {testingOllama ? "Testing..." : "Test Connection"}
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Local Ollama instance URL for running open-source models.
                    </p>
                  </div>

                  <div>
                    <Input
                      id="ollama-model"
                      label="Model"
                      type="text"
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      placeholder="llama3.2"
                      hint="Model name installed in your Ollama instance (e.g. llama3.2, mistral, qwen2.5)."
                    />
                  </div>
                </div>
              )}

              {aiProvider === "custom" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="custom-url" className="block text-sm font-medium text-foreground mb-1">
                      Custom Base URL
                    </label>
                    <div className="relative">
                      <input
                        id="custom-url"
                        type="text"
                        value={customBaseUrl}
                        onChange={(e) => setCustomBaseUrl(e.target.value)}
                        placeholder="https://api.example.com/v1"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors"
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      OpenAI-compatible endpoint (e.g. DeepSeek, Groq).
                    </p>
                  </div>

                  <div>
                    <label htmlFor="custom-key" className="block text-sm font-medium text-foreground mb-1">
                      API Key
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          id="custom-key"
                          type={showCustomApiKey ? "text" : "password"}
                          value={customApiKey}
                          onChange={(e) => setCustomApiKey(e.target.value)}
                          placeholder="sk-..."
                          className="w-full rounded-md border border-border bg-background px-3 py-2 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCustomApiKey((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1 text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none"
                          aria-label={showCustomApiKey ? "Hide API Key" : "Show API Key"}
                        >
                          {showCustomApiKey ? "Hide" : "Show"}
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={testCustomConnection}
                        disabled={testingCustom}
                        className="sm:w-auto"
                      >
                        {testingCustom ? "Testing..." : "Test Connection"}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Input
                      id="custom-model"
                      label="Model"
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder="e.g. mistralai/mistral-7b-instruct or gpt-4o-mini"
                      hint="Model name as recognized by your custom endpoint."
                    />
                  </div>
                </div>
              )}

              {/* Model selector - outside provider conditionals */}
              {detectedModels.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Available models:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedModels.map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => {
                          if (aiProvider === "openai") setOpenaiModel(model);
                          else if (aiProvider === "anthropic") setAnthropicModel(model);
                          else if (aiProvider === "gemini") setGeminiModel(model);
                          else if (aiProvider === "ollama") setOllamaModel(model);
                          else if (aiProvider === "custom") setCustomModel(model);
                        }}
                        className="inline-flex items-center rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  onClick={handleSaveAISettings}
                  disabled={savingAI}
                  className="w-full sm:w-auto"
                >
                  {savingAI ? "Saving..." : "Save AI Settings"}
                </Button>
              </div>
            </div>
          </Card>

          {/* 3. Text-to-Speech (TTS) Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl" aria-hidden="true">🔊</span>
              <h2 className="text-lg font-semibold text-foreground">3. Text-to-Speech (TTS) — Voice & Pronunciation</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Configure lifelike neural voices to pronounce flashcards, example sentences, and conversation dialogues.
            </p>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                <span className="text-base" aria-hidden="true">💡</span>
                <div>
                  <strong>Audio caching enabled:</strong> Generated speech is cached on the server, so each word or sentence is synthesized only once, saving your API tokens and ensuring instant playback.
                </div>
              </div>

              <div>
                <Select
                  id="speech-provider"
                  label="TTS Engine Provider"
                  value={speechProvider}
                  onChange={(e) => {
                    const newProvider = e.target.value as SpeechProvider;
                    setSpeechProvider(newProvider);
                    setDetectedSpeechModels([]);
                    if (newProvider === "openai") setSpeechModel("tts-1");
                    else if (newProvider === "gemini") setSpeechModel("gemini-3.8-flash-tts");
                    else if (newProvider === "elevenlabs") setSpeechModel("eleven_multilingual_v2");
                    else if (newProvider === "custom") setSpeechModel("tts-1");
                  }}
                  options={[
                    { value: "browser", label: "Browser Web Speech (Free / Universal Cloud Audio / No API Key required)" },
                    { value: "gemini", label: "Google Gemini TTS (Ultra-Realistic Neural Audio)" },
                    { value: "openai", label: "OpenAI TTS (tts-1 / tts-1-hd)" },
                    { value: "elevenlabs", label: "ElevenLabs (Generative Voice Synthesis)" },
                    { value: "custom", label: "Custom (OpenAI-Compatible Local / Self-Hosted Server)" },
                  ]}
                  hint="Select which engine Flashguage should use for pronouncing words and conversation audio."
                />
              </div>

              {speechProvider !== "browser" && (
                <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                  {speechProvider === "custom" && (
                    <div>
                      <label htmlFor="speech-base-url" className="block text-sm font-medium text-foreground mb-1">
                        TTS Server Base URL *
                      </label>
                      <input
                        id="speech-base-url"
                        type="url"
                        value={speechBaseUrl}
                        onChange={(e) => setSpeechBaseUrl(e.target.value)}
                        placeholder="e.g. http://localhost:8080/v1 or https://my-tts-server.com/v1"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Compatible with LocalAI, Kokoro TTS, LiteLLM, and any server implementing the OpenAI /v1/audio/speech endpoint.
                      </p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="speech-api-key" className="block text-sm font-medium text-foreground mb-1">
                      TTS API Key {speechProvider === "custom" ? "(Optional for local servers)" : "*"}
                    </label>
                    <div className="relative">
                      <input
                        id="speech-api-key"
                        type={showSpeechApiKey ? "text" : "password"}
                        value={speechApiKey}
                        onChange={(e) => setSpeechApiKey(e.target.value)}
                        placeholder={
                          speechProvider === "custom"
                            ? "Bearer token (optional for self-hosted)"
                            : `Enter your ${speechProvider.toUpperCase()} API key`
                        }
                        className="w-full rounded-md border border-border bg-background px-3 py-2 pr-20 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSpeechApiKey((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                      >
                        {showSpeechApiKey ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      API key used exclusively for synthesizing voice and pronunciation audio.
                    </p>

                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={detectSpeechModels}
                        disabled={
                          detectingSpeechModels ||
                          (speechProvider === "custom" ? !speechBaseUrl.trim() : !speechApiKey.trim())
                        }
                        className="text-xs border border-border"
                      >
                        {detectingSpeechModels ? "Detecting TTS models..." : "🔍 Detect TTS Models"}
                      </Button>
                    </div>
                  </div>

                  {detectedSpeechModels.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Available TTS models from your key:</p>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="speech-model" className="block text-sm font-medium text-foreground mb-1">
                        TTS Model
                      </label>
                      <input
                        id="speech-model"
                        type="text"
                        value={speechModel}
                        onChange={(e) => setSpeechModel(e.target.value)}
                        placeholder="e.g. gemini-3.8-flash-tts, tts-1, eleven_multilingual_v2"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Selected model for voice generation.
                      </p>
                    </div>

                    {(speechProvider === "openai" || speechProvider === "elevenlabs" || speechProvider === "gemini") && (
                      <div>
                        <Select
                          id="speech-voice"
                          label="Voice Persona"
                          value={speechVoice}
                          onChange={(e) => setSpeechVoice(e.target.value)}
                          options={
                            speechProvider === "gemini"
                              ? [
                                  { value: "Puck", label: "Puck (Neutral • Natural & conversational — Recommended)" },
                                  { value: "Aoede", label: "Aoede (Female • Clear & expressive)" },
                                  { value: "Charon", label: "Charon (Male • Deep & calm)" },
                                  { value: "Kore", label: "Kore (Female • Warm & friendly)" },
                                  { value: "Fenrir", label: "Fenrir (Male • Authoritative & confident)" },
                                ]
                              : speechProvider === "openai"
                              ? [
                                  { value: "nova", label: "Nova (Female • Energetic & natural — Recommended)" },
                                  { value: "alloy", label: "Alloy (Neutral • Balanced & versatile)" },
                                  { value: "echo", label: "Echo (Male • Warm, calm & confident)" },
                                  { value: "fable", label: "Fable (British Accent • Expressive)" },
                                  { value: "onyx", label: "Onyx (Male • Deep & authoritative)" },
                                  { value: "shimmer", label: "Shimmer (Female • Clear & resonant)" },
                                ]
                              : [
                                  { value: "21m00Tcm4TlvDq8ikWAM", label: "Rachel (Female • Calm & natural)" },
                                  { value: "AZnzlk1XvdvUeBnXmlld", label: "Domi (Female • Strong & engaging)" },
                                  { value: "EXAVITQu4vr4xnSDxMaL", label: "Bella (Female • Soft & pleasant)" },
                                  { value: "ErXwobaYiN019PkySvjV", label: "Antoni (Male • Warm & friendly)" },
                                  { value: "MF3mGyEYCl7XYWbV9V6O", label: "Elli (Female • Clear & youthful)" },
                                  { value: "TxGEqnHWrfWFTfGW9XjX", label: "Josh (Male • Conversational)" },
                                ]
                          }
                          hint="Voice timbre and speaker persona for audio playback."
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Speech Speed Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="speech-speed" className="text-sm font-medium text-foreground">
                    Speech Playback Speed
                  </label>
                  <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {speechSpeed.toFixed(2)}x {speechSpeed < 1 ? "(Slower for comprehension)" : speechSpeed === 1 ? "(Normal)" : "(Fast)"}
                  </span>
                </div>
                <input
                  id="speech-speed"
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.05"
                  value={speechSpeed}
                  onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                  <span>0.75x (Careful)</span>
                  <span>1.0x (Standard)</span>
                  <span>1.25x (Native fluent)</span>
                </div>
              </div>

              {/* Auto-play toggle */}
              <div className="flex items-center gap-3 pt-1">
                <input
                  id="speech-autoplay"
                  type="checkbox"
                  checked={speechAutoPlay}
                  onChange={(e) => setSpeechAutoPlay(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                />
                <label htmlFor="speech-autoplay" className="text-sm text-foreground cursor-pointer select-none">
                  <strong>Auto-Pronounce on Reveal:</strong> Automatically speak the word when flipping to the answer during study.
                </label>
              </div>

              {/* Actions: Save TTS & Test Voice */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Button
                  onClick={handleSaveTTSSettings}
                  disabled={savingTTS}
                  className="w-full sm:w-auto"
                >
                  {savingTTS ? "Saving..." : "Save TTS Settings"}
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleTestSpeech}
                  disabled={testingSpeech}
                  className="w-full sm:w-auto border border-border"
                >
                  {testingSpeech ? "🔊 Playing preview..." : "🔊 Test Voice"}
                </Button>
              </div>
            </div>
          </Card>

          {/* 4. Speech-to-Text (STT) Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl" aria-hidden="true">🎙️</span>
              <h2 className="text-lg font-semibold text-foreground">4. Speech-to-Text (STT) — Voice Recognition & Practice</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Configure speech recognition to evaluate pronunciation and transcribe your voice when practicing with the microphone.
            </p>

            <div className="space-y-4">
              <div>
                <Select
                  id="transcribe-provider"
                  label="Speech Recognition Provider"
                  value={transcribeProvider}
                  onChange={(e) => {
                    const newP = e.target.value as TranscribeProvider;
                    setTranscribeProvider(newP);
                    setDetectedTranscribeModels([]);
                    if (newP === "gemini") setTranscribeModel("gemini-3.5-flash");
                    else if (newP === "groq") setTranscribeModel("whisper-large-v3-turbo");
                    else if (newP === "openai") setTranscribeModel("whisper-1");
                    else if (newP === "custom") setTranscribeModel("whisper-1");
                  }}
                  options={[
                    { value: "gemini", label: "Google Gemini (Multimodal Audio Transcription)" },
                    { value: "groq", label: "Groq (Ultra-Fast Whisper STT)" },
                    { value: "openai", label: "OpenAI (Whisper Speech-to-Text)" },
                    { value: "custom", label: "Custom (OpenAI-compatible Whisper / Local Server)" },
                  ]}
                  hint="Choose which provider transcribes your microphone when practicing pronunciation or dictating answers."
                />
              </div>

              <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                {transcribeProvider === "custom" && (
                  <div>
                    <label htmlFor="transcribe-base-url" className="block text-sm font-medium text-foreground mb-1">
                      Transcription Server Base URL *
                    </label>
                    <input
                      id="transcribe-base-url"
                      type="url"
                      value={transcribeBaseUrl}
                      onChange={(e) => setTranscribeBaseUrl(e.target.value)}
                      placeholder="e.g. http://localhost:8080/v1 or https://my-whisper-server.com/v1"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Compatible with LocalAI, Faster-Whisper, and any server implementing the OpenAI /v1/audio/transcriptions endpoint.
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="transcribe-api-key" className="block text-sm font-medium text-foreground mb-1">
                    STT API Key {transcribeProvider === "custom" ? "(Optional for local servers)" : "*"}
                  </label>
                  <div className="relative">
                    <input
                      id="transcribe-api-key"
                      type={showTranscribeApiKey ? "text" : "password"}
                      value={transcribeApiKey}
                      onChange={(e) => setTranscribeApiKey(e.target.value)}
                      placeholder={
                        transcribeProvider === "custom"
                          ? "Bearer token (optional for self-hosted)"
                          : `Enter your ${transcribeProvider.toUpperCase()} API key`
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 pr-20 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTranscribeApiKey((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                    >
                      {showTranscribeApiKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dedicated API key for transcribing microphone audio during pronunciation evaluation.
                  </p>

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={detectTranscribeModels}
                      disabled={
                        detectingTranscribeModels ||
                        (transcribeProvider === "custom" ? !transcribeBaseUrl.trim() : !transcribeApiKey.trim())
                      }
                      className="text-xs border border-border"
                    >
                      {detectingTranscribeModels ? "Detecting STT models..." : "🔍 Detect STT Models"}
                    </Button>
                  </div>
                </div>

                {detectedTranscribeModels.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Available STT models from your key:</p>
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

                <div>
                  <label htmlFor="transcribe-model" className="block text-sm font-medium text-foreground mb-1">
                    STT Model
                  </label>
                  <input
                    id="transcribe-model"
                    type="text"
                    value={transcribeModel}
                    onChange={(e) => setTranscribeModel(e.target.value)}
                    placeholder="e.g. gemini-3.5-flash, whisper-large-v3-turbo, whisper-1"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Selected model for microphone audio transcription.
                  </p>
                </div>
              </div>

              {/* Actions: Save STT Settings */}
              <div className="pt-2">
                <Button
                  onClick={handleSaveSTTSettings}
                  disabled={savingSTT}
                  className="w-full sm:w-auto"
                >
                  {savingSTT ? "Saving..." : "Save STT Settings"}
                </Button>
              </div>
            </div>
          </Card>

          {/* 5. Study Settings Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl" aria-hidden="true">📚</span>
              <h2 className="text-lg font-semibold text-foreground">5. Study Settings</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Customize your daily study goals and review limits.
            </p>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-relaxed">
                💡 <strong>How study limits work:</strong> <strong>Daily Goal</strong> is your cumulative target for the entire day. <strong>Review Limit</strong> sets the size of each individual study batch. Editing your Daily Goal does not alter your Review Limit.
              </div>

              <div>
                <label htmlFor="daily-goal" className="block text-sm font-medium text-foreground mb-1">
                  Daily Study Goal (cards)
                </label>
                <input
                  id="daily-goal"
                  type="number"
                  min="1"
                  max="200"
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(Number(e.target.value))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Overall target number of cards you aim to study across the entire day.
                </p>
              </div>

              <div>
                <label htmlFor="review-limit" className="block text-sm font-medium text-foreground mb-1">
                  Review Limit per Session (cards)
                </label>
                <input
                  id="review-limit"
                  type="number"
                  min="1"
                  max="500"
                  value={reviewLimit}
                  onChange={(e) => setReviewLimit(Number(e.target.value))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Maximum cards served in a single study session batch to prevent mental fatigue.
                </p>
              </div>

              <div>
                <label htmlFor="break-minutes" className="block text-sm font-medium text-foreground mb-1">
                  Session Break Duration (minutes)
                </label>
                <input
                  id="break-minutes"
                  type="number"
                  min="1"
                  max="120"
                  value={sessionBreakMinutes}
                  onChange={(e) => setSessionBreakMinutes(Number(e.target.value))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Recommended rest time after finishing a session batch before starting the next one.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="study-timezone" className="block text-sm font-medium text-foreground">
                    Study Timezone
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
                        if (detected) setTimezone(detected);
                      } catch {}
                    }}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>📍</span> Detect Device Timezone
                  </button>
                </div>
                <select
                  id="study-timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                >
                  {POPULAR_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                  {typeof Intl !== "undefined" &&
                    "supportedValuesOf" in Intl &&
                    (Intl as any)
                      .supportedValuesOf("timeZone")
                      .filter((z: string) => !POPULAR_TIMEZONES.some((pt) => pt.value === z))
                      .map((tz: string) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Determines when your Daily Goal and study streaks reset each day. Default is UTC.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSaveStudySettings}
                  disabled={savingStudy}
                  className="w-full sm:w-auto"
                >
                  {savingStudy ? "Saving..." : "Save Study Settings"}
                </Button>
              </div>
            </div>
          </Card>

          {/* 6. Notification Settings Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl" aria-hidden="true">🔔</span>
              <h2 className="text-lg font-semibold text-foreground">6. Notification Settings</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Control study reminders and email notifications.
            </p>

            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={dailyReminder}
                  onChange={(e) => setDailyReminder(e.target.checked)}
                  className="h-4 w-4 rounded border border-border bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 accent-primary"
                />
                <span className="text-sm font-medium text-foreground">Daily study reminder</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={weeklyEmail}
                  onChange={(e) => setWeeklyEmail(e.target.checked)}
                  className="h-4 w-4 rounded border border-border bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 accent-primary"
                />
                <span className="text-sm font-medium text-foreground">Weekly email summary</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => setSoundEffects(e.target.checked)}
                  className="h-4 w-4 rounded border border-border bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 accent-primary"
                />
                <span className="text-sm font-medium text-foreground">Sound effects</span>
              </label>

              <div className="pt-2">
                <Button
                  onClick={handleSaveNotifications}
                  disabled={savingNotifications}
                  className="w-full sm:w-auto"
                >
                  {savingNotifications ? "Saving..." : "Save Notification Settings"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};
