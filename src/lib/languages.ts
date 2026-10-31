// Supported Languages Registry & Speech Configuration for Flashguage

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  speechVoice: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "🇺🇸",
    speechVoice: "en-US",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    flag: "🇪🇸",
    speechVoice: "es-ES",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    flag: "🇫🇷",
    speechVoice: "fr-FR",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    flag: "🇩🇪",
    speechVoice: "de-DE",
  },
  {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    flag: "🇮🇹",
    speechVoice: "it-IT",
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    flag: "🇧🇷",
    speechVoice: "pt-BR",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    flag: "🇯🇵",
    speechVoice: "ja-JP",
  },
  {
    code: "zh",
    name: "Chinese",
    nativeName: "中文 (Mandarin)",
    flag: "🇨🇳",
    speechVoice: "zh-CN",
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    flag: "🇰🇷",
    speechVoice: "ko-KR",
  },
  {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    flag: "🇷🇺",
    speechVoice: "ru-RU",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    flag: "🇸🇦",
    speechVoice: "ar-SA",
  },
];

export function getLanguage(code?: string | null): LanguageInfo {
  if (!code) return SUPPORTED_LANGUAGES[0];
  const normalized = code.toLowerCase().trim();
  const match = SUPPORTED_LANGUAGES.find(
    (l) => l.code === normalized || l.name.toLowerCase() === normalized
  );
  return match || SUPPORTED_LANGUAGES[0];
}

export function getSpeechVoice(code?: string | null): string {
  const lang = getLanguage(code);
  return lang.speechVoice;
}

/**
 * Universal browser text-to-speech for any supported language.
 */
export function speakInLanguage(text: string, languageCode: string = "en"): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = getLanguage(languageCode);
    utterance.lang = lang.speechVoice;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Speech synthesis error:", err);
  }
}

export function getStoredActiveLanguage(): string {
  if (typeof window === "undefined") return "en";
  try {
    return localStorage.getItem("flashguage_active_lang") || "en";
  } catch {
    return "en";
  }
}

export function setStoredActiveLanguage(code: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("flashguage_active_lang", code);
    document.cookie = `flashguage_active_lang=${encodeURIComponent(code)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (err) {
    console.error("Failed to store active language:", err);
  }
}

export function getPinnedTracks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("flashguage_pinned_tracks");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setStoredPinnedTracks(pinned: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("flashguage_pinned_tracks", JSON.stringify(pinned));
  } catch (err) {
    console.error("Failed to save pinned tracks:", err);
  }
}

export function getTrackAccessTimes(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("flashguage_track_last_accessed");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordTrackAccess(code: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const times = getTrackAccessTimes();
    times[code] = Date.now();
    localStorage.setItem("flashguage_track_last_accessed", JSON.stringify(times));
    return times;
  } catch {
    return {};
  }
}


