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

  const requestedModel =
    (config?.provider === "gemini" && (config.geminiModel || config.model)) ||
    "gemini-3.1-flash-lite";

  const modelsToTry = [
    requestedModel,
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
  ].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

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
            maxOutputTokens: 600,
          },
        }),
      });

      if (!res.ok) {
        let errMsg = `Google Gemini (${model}) error ${res.status}`;
        try {
          const errJson = await res.json();
          errMsg = errJson.error?.message || errMsg;
        } catch {
          const text = await res.text().catch(() => "");
          if (text) errMsg += `: ${text}`;
        }
        lastError = new Error(errMsg);
        continue;
      }

      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        promptFeedback?: { blockReason?: string };
      };

      const candidate = json.candidates?.[0];
      if (candidate?.content?.parts?.[0]?.text) {
        return candidate.content.parts[0].text;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("Google Gemini failed to generate a response");
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
  const allProviders: AIProvider[] = ["gemini", "openai", "anthropic", "custom", "ollama"];
  const primary: AIProvider =
    config?.provider || (hasConfigForProvider("gemini", config) ? "gemini" : "openai");
  const chain: AIProvider[] = [primary];
  for (const p of allProviders) {
    if (p !== primary && hasConfigForProvider(p, config)) {
      chain.push(p);
    }
  }
  return chain;
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

function buildDefinitionPrompt(word: string, context?: string, targetLanguage = "the target language"): string {
  const ctx = context ? `\nContext: ${context}` : "";
  return `You are an expert language-learning teacher creating active-recall study flashcards for spaced repetition.
For the word, idiom, compound expression, or phrase "${word}" in ${targetLanguage}${ctx}:
Even if the term is an invented phrase, metaphorical compound, slang, or colloquialism, analyze its elements thoughtfully and provide a meaningful, educational explanation.

CRITICAL FLASHCARD PEDAGOGY RULES:
1. part of speech (noun phrase, idiom, phrasal verb, adjective, etc.)
2. definition: Explain the concept clearly, memorably, and concisely for language learners.
   STRICT ANTI-SPOILER RULE: NEVER include the target word "${word}" or direct inflections/derivatives of it in the definition. The learner looks at this definition during review to guess the word, so including it spoils the active recall practice! Define the meaning purely with synonyms and conceptual explanation.
3. phonetic pronunciation or IPA if known
4. example: A modern, authentic, and vivid example sentence in ${targetLanguage} illustrating how native speakers use "${word}" in everyday conversation, work, or culture (avoid bizarre, archaic, or stiff textbook sentences).

Format strictly as JSON with keys: partOfSpeech, definition, pronunciation, example. Do not include markdown code fences or any other text.`;
}

function buildExamplePrompt(word: string, context?: string, targetLanguage = "the target language"): string {
  const ctx = context ? `\nContext: ${context}` : "";
  return `You are an expert language-learning teacher designing study flashcards. Generate a single modern, natural, and vivid example sentence in ${targetLanguage} using the word or phrase "${word}"${ctx}.
The sentence must demonstrate authentic everyday or practical conversational usage (avoid bizarre, overly academic, or archaic sentences). It must clearly show how the word is used in context for a learner practicing active recall. Return only the sentence, no quotes or extra text.`;
}

function buildSuggestPrompt(word: string, targetLanguage = "the target language"): string {
  return `You are an expert language-learning assistant. For the word "${word}" in ${targetLanguage}, list 8 related words or phrases in ${targetLanguage} that are useful to learn together. Return as a JSON array of strings only, no other text. Example: ["word1", "word2", "word3", ...]`;
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
  config?: AIConfig,
  targetLanguage?: string
): Promise<DefinitionResult> {
  const prompt = buildDefinitionPrompt(word, context, targetLanguage);
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
  config?: AIConfig,
  targetLanguage?: string
): Promise<string> {
  const prompt = buildExamplePrompt(word, context, targetLanguage);
  const raw = await tryProviders(prompt, "example", word, context, config);
  return raw.trim().replace(/^["']|["']$/g, "");
}

export async function suggestRelatedWords(
  word: string,
  config?: AIConfig,
  targetLanguage?: string
): Promise<string[]> {
  const prompt = buildSuggestPrompt(word, targetLanguage);
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
