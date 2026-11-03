export type TTSProviderId =
  | "browser"
  | "gemini"
  | "openai"
  | "elevenlabs"
  | "cartesia"
  | "deepgram"
  | "fishaudio"
  | "custom";

export type STTProviderId =
  | "gemini"
  | "groq"
  | "openai"
  | "deepgram"
  | "custom";

export interface VoiceOption {
  value: string;
  label: string;
}

export interface TTSProviderConfig {
  id: TTSProviderId;
  name: string;
  label: string;
  defaultModel: string;
  defaultVoice: string;
  requiresApiKey: boolean;
  requiresBaseUrl?: boolean;
  voices?: VoiceOption[];
}

export interface STTProviderConfig {
  id: STTProviderId;
  name: string;
  label: string;
  defaultModel: string;
  requiresApiKey: boolean;
  requiresBaseUrl?: boolean;
}

export const TTS_PROVIDERS: TTSProviderConfig[] = [
  {
    id: "browser",
    name: "Browser",
    label: "Browser Web Speech",
    defaultModel: "",
    defaultVoice: "",
    requiresApiKey: false,
  },
  {
    id: "gemini",
    name: "Gemini",
    label: "Google Gemini TTS",
    defaultModel: "gemini-3.8-flash-tts",
    defaultVoice: "Puck",
    requiresApiKey: true,
    voices: [
      { value: "Puck", label: "Puck (Neutral • Natural & conversational — Recommended)" },
      { value: "Aoede", label: "Aoede (Female • Clear & expressive)" },
      { value: "Charon", label: "Charon (Male • Deep & calm)" },
      { value: "Kore", label: "Kore (Female • Warm & friendly)" },
      { value: "Fenrir", label: "Fenrir (Male • Authoritative & confident)" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    label: "OpenAI TTS",
    defaultModel: "tts-1",
    defaultVoice: "nova",
    requiresApiKey: true,
    voices: [
      { value: "nova", label: "Nova (Female • Energetic & natural — Recommended)" },
      { value: "alloy", label: "Alloy (Neutral • Balanced & versatile)" },
      { value: "echo", label: "Echo (Male • Warm, calm & confident)" },
      { value: "fable", label: "Fable (British Accent • Expressive)" },
      { value: "onyx", label: "Onyx (Male • Deep & authoritative)" },
      { value: "shimmer", label: "Shimmer (Female • Clear & resonant)" },
    ],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    label: "ElevenLabs",
    defaultModel: "eleven_multilingual_v2",
    defaultVoice: "21m00Tcm4TlvDq8ikWAM",
    requiresApiKey: true,
    voices: [
      { value: "21m00Tcm4TlvDq8ikWAM", label: "Rachel (Female • Calm & natural)" },
      { value: "AZnzlk1XvdvUeBnXmlld", label: "Domi (Female • Strong & engaging)" },
      { value: "EXAVITQu4vr4xnSDxMaL", label: "Bella (Female • Soft & pleasant)" },
      { value: "ErXwobaYiN019PkySvjV", label: "Antoni (Male • Warm & friendly)" },
      { value: "MF3mGyEYCl7XYWbV9V6O", label: "Elli (Female • Clear & youthful)" },
      { value: "TxGEqnHWrfWFTfGW9XjX", label: "Josh (Male • Conversational)" },
    ],
  },
  {
    id: "cartesia",
    name: "Cartesia",
    label: "Cartesia",
    defaultModel: "sonic-3.6",
    defaultVoice: "a0e99841-438c-4a64-b679-ae501e7d6091",
    requiresApiKey: true,
    voices: [
      { value: "a0e99841-438c-4a64-b679-ae501e7d6091", label: "Barbershop Man (Male • Warm & rich — Recommended)" },
      { value: "79a125e8-cd45-4c13-8a67-188112f4dd22", label: "British Lady (Female • Clear & articulate)" },
      { value: "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4", label: "Sarah (Female • Natural & conversational)" },
      { value: "694f12bc-926e-473d-9d41-382a513c9a63", label: "Doctor (Male • Calm & informative)" },
      { value: "248be419-c632-4f23-adf1-5324ed7dbf10", label: "Classy Lady (Female • Expressive)" },
    ],
  },
  {
    id: "deepgram",
    name: "Deepgram",
    label: "Deepgram",
    defaultModel: "aura-2-thalia-en",
    defaultVoice: "aura-2-thalia-en",
    requiresApiKey: true,
    voices: [
      { value: "aura-2-thalia-en", label: "Thalia (Aura-2 • Female • Conversational — Recommended)" },
      { value: "aura-2-andromeda-en", label: "Andromeda (Aura-2 • Female • Casual & expressive)" },
      { value: "aura-2-helena-en", label: "Helena (Aura-2 • Female • Bright & professional)" },
      { value: "aura-asteria-en", label: "Asteria (Aura-1 • Female • Clear & natural)" },
      { value: "aura-luna-en", label: "Luna (Aura-1 • Female • Calm & soothing)" },
      { value: "aura-stella-en", label: "Stella (Aura-1 • Female • Warm & friendly)" },
      { value: "aura-orion-en", label: "Orion (Aura-1 • Male • Deep & resonant)" },
      { value: "aura-arcas-en", label: "Arcas (Aura-1 • Male • Crisp & clear)" },
      { value: "aura-perseus-en", label: "Perseus (Aura-1 • Male • Warm & conversational)" },
    ],
  },
  {
    id: "fishaudio",
    name: "Fish Audio",
    label: "Fish Audio",
    defaultModel: "s2.1-pro",
    defaultVoice: "",
    requiresApiKey: true,
    voices: [
      { value: "", label: "Default / Account Voice" },
      { value: "80244799014545089f2a96a1a49f7b1b", label: "Energy Male (Dynamic & clear)" },
      { value: "e58d095908f948f0a00e21f78c9d4b8f", label: "Gentle Female (Soft & clear)" },
    ],
  },
  {
    id: "custom",
    name: "Custom",
    label: "Custom Server",
    defaultModel: "tts-1",
    defaultVoice: "alloy",
    requiresApiKey: false,
    requiresBaseUrl: true,
  },
];

export const STT_PROVIDERS: STTProviderConfig[] = [
  {
    id: "gemini",
    name: "Gemini",
    label: "Google Gemini Audio",
    defaultModel: "gemini-3.5-flash",
    requiresApiKey: true,
  },
  {
    id: "groq",
    name: "Groq",
    label: "Groq Whisper",
    defaultModel: "whisper-large-v3-turbo",
    requiresApiKey: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    label: "OpenAI Whisper",
    defaultModel: "whisper-1",
    requiresApiKey: true,
  },
  {
    id: "deepgram",
    name: "Deepgram",
    label: "Deepgram Nova",
    defaultModel: "nova-3",
    requiresApiKey: true,
  },
  {
    id: "custom",
    name: "Custom",
    label: "Custom Whisper",
    defaultModel: "whisper-1",
    requiresApiKey: false,
    requiresBaseUrl: true,
  },
];

export function getTTSProvider(id: string): TTSProviderConfig {
  return TTS_PROVIDERS.find((p) => p.id === id) || TTS_PROVIDERS[0];
}

export function getSTTProvider(id: string): STTProviderConfig {
  return STT_PROVIDERS.find((p) => p.id === id) || STT_PROVIDERS[0];
}

export async function fetchSpeechModels(
  provider: string,
  apiKey: string,
  baseUrl?: string,
  mode: "tts" | "stt" = "tts"
): Promise<string[]> {
  const params = new URLSearchParams({
    provider,
    apiKey: apiKey.trim(),
    mode,
  });
  if (baseUrl?.trim()) {
    params.set("baseUrl", baseUrl.trim());
  }

  const res = await fetch(`/api/ai/speech-models?${params.toString()}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to detect models");
  }
  const data = await res.json();
  return Array.isArray(data.models) ? data.models : [];
}
