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

export type AIProvider = "openai" | "anthropic" | "gemini" | "ollama" | "custom";

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
  dailyGoal?: number;
  reviewLimit?: number;
  sessionBreakMinutes?: number;
  notifications?: boolean;
  dailyReminder?: boolean;
  weeklyEmail?: boolean;
  soundEffects?: boolean;
  plugins?: string[];
}

const fetcher = async (url: string): Promise<SettingsData> => {
  const res = await fetch(`${url}?t=${Date.now()}`);
  if (!res.ok) {
    throw new Error("Failed to load settings");
  }
  return res.json();
};

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
  const [savingStudy, setSavingStudy] = useState(false);

  // Notification Settings state
  const [dailyReminder, setDailyReminder] = useState<boolean>(true);
  const [weeklyEmail, setWeeklyEmail] = useState<boolean>(false);
  const [soundEffects, setSoundEffects] = useState<boolean>(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

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
      if (typeof apiSettings.dailyReminder === "boolean") {
        setDailyReminder(apiSettings.dailyReminder);
      }
      if (typeof apiSettings.weeklyEmail === "boolean") {
        setWeeklyEmail(apiSettings.weeklyEmail);
      }
      if (typeof apiSettings.soundEffects === "boolean") {
        setSoundEffects(apiSettings.soundEffects);
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

  if (status === "loading" || (isSettingsLoading && !apiSettings)) {
    return <LoadingPage message="Loading settings..." />;
  }

  const currentUserEmail = session?.user?.email || apiSettings?.email || "Not specified";

  return (
    <div className="flex min-h-screen flex-col bg-background">
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

          {/* 3. Study Settings Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl" aria-hidden="true">📚</span>
              <h2 className="text-lg font-semibold text-foreground">Study Settings</h2>
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

          {/* 4. Notification Settings Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl" aria-hidden="true">🔔</span>
              <h2 className="text-lg font-semibold text-foreground">Notification Settings</h2>
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
