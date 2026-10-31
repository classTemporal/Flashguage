export interface DefinitionResult {
  definition: string;
  example: string;
  pronunciation?: string;
  partOfSpeech?: string;
}

export type AIProvider = "openai" | "anthropic" | "gemini" | "ollama" | "custom";
export type ProviderName = AIProvider;

export interface AIConfig {
  provider?: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fallbackChain?: AIProvider[];
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
}

interface CacheEntry {
  expiresAt: number;
}

class AICache {
  public store = new Map<string, CacheEntry>();

  get(key: string): string | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return undefined; // We don't store the value itself; this is a TTL guard only
  }

  set(key: string, ttlMs: number): void {
    this.store.set(key, { expiresAt: Date.now() + ttlMs });
  }
}

const TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new AICache();

function cacheKey(provider: AIProvider, action: string, word: string, context?: string): string {
  return `${provider}:${action}:${word}:${context ?? ""}`;
}

function isCacheHit(provider: AIProvider, action: string, word: string, context?: string): boolean {
  const key = cacheKey(provider, action, word, context);
  const entry = cache.store.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    cache.store.delete(key);
    return false;
  }
  return true;
}

function markCached(provider: AIProvider, action: string, word: string, context?: string): void {
  const key = cacheKey(provider, action, word, context);
  cache.store.set(key, { expiresAt: Date.now() + TTL_MS });
}

function getOpenAIKey(config?: AIConfig): string | undefined {
  if (config?.provider === "openai" && config.apiKey) return config.apiKey;
  return config?.openaiKey || config?.apiKey || process.env.OPENAI_API_KEY;
}

function getAnthropicKey(config?: AIConfig): string | undefined {
  if (config?.provider === "anthropic" && config.apiKey) return config.apiKey;
  return config?.anthropicKey || config?.apiKey || process.env.ANTHROPIC_API_KEY;
}

function getGeminiKey(config?: AIConfig): string | undefined {
  if (config?.provider === "gemini" && config.apiKey) return config.apiKey;
  return config?.geminiKey || config?.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}

function getOllamaUrl(config?: AIConfig): string {
  if (config?.provider === "ollama" && config.baseUrl) return config.baseUrl;
  return config?.ollamaUrl || config?.baseUrl || process.env.OLLAMA_URL || "http://localhost:11434";
}

function getCustomBaseUrl(config?: AIConfig): string | undefined {
  if (config?.provider === "custom" && config.baseUrl) return config.baseUrl;
  return config?.customBaseUrl || config?.baseUrl || process.env.CUSTOM_AI_BASE_URL;
}

function getCustomApiKey(config?: AIConfig): string | undefined {
  if (config?.provider === "custom" && config.apiKey) return config.apiKey;
  return config?.customApiKey || config?.apiKey || process.env.CUSTOM_AI_API_KEY || "";
}

function getCustomModel(config?: AIConfig): string {
  if (config?.provider === "custom" && config.model) return config.model;
  const model = (config?.provider === "custom" && (config.customModel || config.model)) || process.env.CUSTOM_AI_MODEL || "";
  if (!model) throw new Error("Missing model for Custom AI provider");
  return model;
}

// 1. OpenAI Client
export async function callOpenAI(prompt: string, config?: AIConfig): Promise<string> {
  const apiKey = getOpenAIKey(config);
  if (!apiKey) throw new Error("Missing OpenAI API Key");

  const model = (config?.provider === "openai" && (config.openaiModel || config.model)) || "";
  if (!model) throw new Error("Missing model for OpenAI provider");
  const baseUrl = (config?.provider === "openai" && config.baseUrl ? config.baseUrl.replace(/\/+$/, "") : "https://api.openai.com/v1");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    let errMsg = `OpenAI error ${res.status}`;
    try {
      const errJson = await res.json();
      errMsg = errJson.error?.message || errMsg;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) errMsg += `: ${text}`;
    }
    throw new Error(errMsg);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

// 2. Anthropic Client
export async function callAnthropic(prompt: string, config?: AIConfig): Promise<string> {
  const apiKey = getAnthropicKey(config);
  if (!apiKey) throw new Error("Missing Anthropic API Key");

  const model = (config?.provider === "anthropic" && (config.anthropicModel || config.model)) || "";
  if (!model) throw new Error("Missing model for Anthropic provider");
  const baseUrl = (config?.provider === "anthropic" && config.baseUrl ? config.baseUrl.replace(/\/+$/, "") : "https://api.anthropic.com/v1");

  const res = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    let errMsg = `Anthropic error ${res.status}`;
    try {
      const errJson = await res.json();
      errMsg = errJson.error?.message || errMsg;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) errMsg += `: ${text}`;
    }
    throw new Error(errMsg);
  }

  const json = (await res.json()) as {
    content?: { type: string; text: string }[];
  };
  return json.content?.[0]?.text ?? "";
}

// 3. Google Gemini Client
export async function callGemini(prompt: string, config?: AIConfig): Promise<string> {
  const apiKey = getGeminiKey(config);
  if (!apiKey) throw new Error("Missing Google Gemini API Key");

  const model = (config?.provider === "gemini" && (config.geminiModel || config.model)) || "";
  if (!model) throw new Error("Missing model for Google Gemini provider");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 512,
      },
    }),
  });

  if (!res.ok) {
    let errMsg = `Google Gemini error ${res.status}`;
    try {
      const errJson = await res.json();
      errMsg = errJson.error?.message || errMsg;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) errMsg += `: ${text}`;
    }
    throw new Error(errMsg);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  };

  const candidate = json.candidates?.[0];
  if (!candidate) {
    if (json.promptFeedback?.blockReason) {
      throw new Error(`Google Gemini blocked prompt: ${json.promptFeedback.blockReason}`);
    }
    throw new Error("Google Gemini returned no candidate responses");
  }

  return candidate.content?.parts?.[0]?.text ?? "";
}

// 4. Ollama Client
export async function callOllama(prompt: string, config?: AIConfig): Promise<string> {
  const baseUrl = getOllamaUrl(config).replace(/\/+$/, "");
  const model = (config?.provider === "ollama" && (config.ollamaModel || config.model)) || "";
  if (!model) throw new Error("Missing model for Ollama provider");
  const url = `${baseUrl}/api/generate`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama error ${res.status}: ${text || res.statusText}`);
  }

  const json = (await res.json()) as { response?: string };
  return json.response ?? "";
}

// 5. Custom OpenAI-compatible Client
export async function callCustom(prompt: string, config?: AIConfig): Promise<string> {
  const rawBaseUrl = getCustomBaseUrl(config);
  if (!rawBaseUrl) {
    throw new Error("Missing Base URL for Custom OpenAI-compatible provider");
  }

  const baseUrl = rawBaseUrl.replace(/\/+$/, "");
  const endpoint = baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;
  const apiKey = getCustomApiKey(config);
  const model = getCustomModel(config);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    let errMsg = `Custom AI provider error ${res.status}`;
    try {
      const errJson = await res.json();
      errMsg = errJson.error?.message || errJson.message || errMsg;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) errMsg += `: ${text}`;
    }
    throw new Error(errMsg);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

function hasConfigForProvider(provider: AIProvider, config?: AIConfig): boolean {
  switch (provider) {
    case "openai":
      return Boolean(getOpenAIKey(config));
    case "anthropic":
      return Boolean(getAnthropicKey(config));
    case "gemini":
      return Boolean(getGeminiKey(config));
    case "ollama":
      return Boolean(getOllamaUrl(config));
    case "custom":
      return Boolean(getCustomBaseUrl(config));
    default:
      return false;
  }
}

function getFallbackChain(config?: AIConfig): AIProvider[] {
  if (config?.fallbackChain && config.fallbackChain.length > 0) {
    return config.fallbackChain;
  }
  const primary: AIProvider = config?.provider || "openai";
  return [primary];
}

async function tryProviders(
  prompt: string,
  action: string,
  word: string,
  context?: string,
  config?: AIConfig
): Promise<string> {
  const chain = getFallbackChain(config);
  const errors: string[] = [];

  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];

    // Always attempt primary configured provider (index 0). For fallback providers,
    // only attempt if configuration/credentials exist to avoid wasted failing calls.
    if (i > 0 && !hasConfigForProvider(provider, config)) {
      continue;
    }

    try {
      let result = "";
      switch (provider) {
        case "openai":
          result = await callOpenAI(prompt, config);
          break;
        case "anthropic":
          result = await callAnthropic(prompt, config);
          break;
        case "gemini":
          result = await callGemini(prompt, config);
          break;
        case "ollama":
          result = await callOllama(prompt, config);
          break;
        case "custom":
          result = await callCustom(prompt, config);
          break;
      }

      if (result) {
        markCached(provider, action, word, context);
        return result;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`[${provider}] ${msg}`);
      continue;
    }
  }

  throw new Error(`AI generation failed across providers:\n${errors.join("\n")}`);
}

function buildDefinitionPrompt(word: string, context?: string): string {
  const ctx = context ? `\nContext: ${context}` : "";
  return `You are a helpful English-learning assistant. For the word or phrase "${word}"${ctx}, provide:
1. part of speech (noun/verb/adjective/adverb/etc.)
2. a clear, concise definition
3. IPA pronunciation if known
4. one natural example sentence using it

Format strictly as JSON with keys: partOfSpeech, definition, pronunciation, example. Do not include any other text.`;
}

function buildExamplePrompt(word: string, context?: string): string {
  const ctx = context ? `\nContext: ${context}` : "";
  return `You are a helpful English-learning assistant. Generate a single natural example sentence using the word or phrase "${word}"${ctx}. Return only the sentence, no quotes or extra text.`;
}

function buildSuggestPrompt(word: string): string {
  return `You are a helpful English-learning assistant. For the word "${word}", list 8 related words or phrases that are useful to learn together. Return as a JSON array of strings only, no other text. Example: ["synonym1", "antonym1", "collocation1", ...]`;
}

function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim();
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    cleaned = match[1].trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

function cleanJsonArrayOutput(raw: string): string {
  let cleaned = raw.trim();
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    cleaned = match[1].trim();
  }
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }
  return cleaned;
}

export async function generateDefinition(
  word: string,
  context?: string,
  config?: AIConfig
): Promise<DefinitionResult> {
  const prompt = buildDefinitionPrompt(word, context);
  const raw = await tryProviders(prompt, "definition", word, context, config);

  try {
    const cleaned = cleanJsonOutput(raw);
    const parsed = JSON.parse(cleaned) as DefinitionResult;
    return {
      definition: parsed.definition || raw,
      example: parsed.example || "",
      pronunciation: parsed.pronunciation,
      partOfSpeech: parsed.partOfSpeech,
    };
  } catch {
    // If provider returned non-JSON, fall back to plain text
    return { definition: raw, example: "" };
  }
}

export async function generateExample(
  word: string,
  context?: string,
  config?: AIConfig
): Promise<string> {
  const prompt = buildExamplePrompt(word, context);
  const raw = await tryProviders(prompt, "example", word, context, config);
  return raw.trim().replace(/^["']|["']$/g, "");
}

export async function suggestRelatedWords(
  word: string,
  config?: AIConfig
): Promise<string[]> {
  const prompt = buildSuggestPrompt(word);
  const raw = await tryProviders(prompt, "suggest", word, undefined, config);

  try {
    const cleaned = cleanJsonArrayOutput(raw);
    const parsed = JSON.parse(cleaned) as string[];
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s).trim()).filter(Boolean);
    }
  } catch {
    // ignore
  }

  // Fallback: split by commas or newlines
  return raw
    .split(/[\n,]+/)
    .map((s) => s.replace(/^[-*0-9.]+\s*/, "").trim())
    .filter((s) => s.length > 0);
}
