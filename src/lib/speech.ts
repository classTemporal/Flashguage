import { getLanguage } from "./languages";

let activeAudio: HTMLAudioElement | null = null;

export interface SpeechPlayOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  languageCode?: string;
  provider?: string;
  apiKey?: string;
  voice?: string;
  speed?: number;
}

export function stopCurrentSpeech() {
  if (typeof window === "undefined") return;
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {}
    activeAudio = null;
  }
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

/**
 * Universal browser text-to-speech fallback using SpeechSynthesis.
 */
export function speakInLanguageNative(text: string, languageCode: string = "en"): void {
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

/**
 * High-fidelity neural audio speech with server caching and automatic
 * client fallback to Web Speech Synthesis.
 */
export async function playCardSpeech(
  text: string,
  languageCode: string = "en",
  options?: SpeechPlayOptions
): Promise<void> {
  if (typeof window === "undefined" || !text) return;

  stopCurrentSpeech();

  try {
    options?.onStart?.();

    const res = await fetch("/api/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        language: languageCode,
        provider: options?.provider,
        apiKey: options?.apiKey,
        voice: options?.voice,
        speed: options?.speed,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        activeAudio = audio;

        audio.onended = () => {
          activeAudio = null;
          options?.onEnd?.();
        };

        audio.onerror = () => {
          activeAudio = null;
          speakInLanguageNative(text, languageCode);
          options?.onEnd?.();
        };

        await audio.play();
        return;
      }
    }

    // Fallback to browser's native speech synthesis
    speakInLanguageNative(text, languageCode);
    setTimeout(() => {
      options?.onEnd?.();
    }, 1000);
  } catch (err) {
    speakInLanguageNative(text, languageCode);
    options?.onEnd?.();
  }
}
