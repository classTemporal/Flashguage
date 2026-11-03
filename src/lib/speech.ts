import { getLanguage } from "./languages";

let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;

export interface SpeechPlayOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  languageCode?: string;
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  voice?: string;
  speed?: number;
  model?: string;
  skipCache?: boolean;
}

export function stopCurrentSpeech() {
  if (typeof window === "undefined") return;
  if (activeAudio) {
    try {
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio.src = "";
    } catch {}
    activeAudio = null;
  }
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  activeUtterance = null;
}

/**
 * Universal browser text-to-speech fallback using SpeechSynthesis.
 * Specifically hardened for Firefox, Chrome, and Safari memory/autoplay management.
 */
export function speakInLanguageNative(text: string, languageCode: string = "en"): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    window.speechSynthesis.cancel();

    // Firefox fix: A brief delay prevents cancel() from aborting the new speech queue
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        activeUtterance = utterance; // Prevent SpiderMonkey/V8 garbage collection mid-playback

        const lang = getLanguage(languageCode);
        utterance.lang = lang.speechVoice || "en-US";
        utterance.rate = 0.95;

        // In Firefox on desktop/Linux, explicitly matching a loaded voice prevents silent dispatcher failures
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const targetLang = (lang.speechVoice || "en-US").toLowerCase();
          const targetPrefix = languageCode.toLowerCase();
          const matched =
            voices.find((v) => v.lang.toLowerCase() === targetLang) ||
            voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix)) ||
            voices.find((v) => v.default);
          if (matched) {
            utterance.voice = matched;
          }
        }

        utterance.onend = () => {
          activeUtterance = null;
        };

        utterance.onerror = (e) => {
          console.warn("[SpeechSynthesis notice]:", e);
          activeUtterance = null;
        };

        window.speechSynthesis.speak(utterance);

        // Firefox wake-up: Kickstart synthesizer if queued in paused state
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (innerErr) {
        console.error("SpeechSynthesis dispatch error:", innerErr);
      }
    }, 25);
  } catch (err) {
    console.error("Speech synthesis error:", err);
  }
}

import { getOfflineCachedAudio, setOfflineCachedAudio } from "./offline-media";

/**
 * High-fidelity neural audio speech with offline caching, Service Worker
 * media retrieval, and automatic fallback to Web Speech Synthesis.
 */
export async function playCardSpeech(
  text: string,
  languageCode: string = "en",
  options?: SpeechPlayOptions
): Promise<void> {
  if (typeof window === "undefined" || !text) return;

  stopCurrentSpeech();

  const isExplicitApiProvider = Boolean(
    options?.provider && options.provider !== "browser"
  );

  try {
    options?.onStart?.();

    // 1. Check offline-cached audio mapping first (if not explicitly skipping cache)
    if (!options?.skipCache) {
      const cachedUrl = getOfflineCachedAudio(
        text,
        languageCode,
        options?.provider,
        options?.voice,
        options?.model
      );

      if (cachedUrl) {
        try {
          const audio = new Audio(cachedUrl);
          audio.preload = "auto";
          activeAudio = audio;

          await new Promise<void>((resolve, reject) => {
            audio.onended = () => {
              activeAudio = null;
              options?.onEnd?.();
              resolve();
            };
            audio.onerror = (e) => {
              activeAudio = null;
              reject(new Error("Cached audio playback failed"));
            };
            audio.play().catch(reject);
          });
          return;
        } catch {
          activeAudio = null;
          // Cached item failed to play, fall through to fetch fresh
        }
      }
    }

    // 2. Fetch from speech API
    const res = await fetch("/api/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        language: languageCode,
        provider: options?.provider,
        apiKey: options?.apiKey,
        baseUrl: options?.baseUrl,
        voice: options?.voice,
        speed: options?.speed,
        model: options?.model,
        skipCache: options?.skipCache,
      }),
    });

    const data = await res.json().catch(() => ({}));

    // If server responded with an error or unfulfilled speech request
    if (!res.ok || !data.success) {
      const errorMsg = data.message || `Speech generation failed (${res.status})`;

      // If an external API provider was requested or detected, DO NOT fall back to robotic browser synthesis!
      if (isExplicitApiProvider || (data.provider && data.provider !== "browser" && data.provider !== "google-tts")) {
        throw new Error(errorMsg);
      }

      // If browser was explicitly selected, fall back to native browser synthesis
      speakInLanguageNative(text, languageCode);
      setTimeout(() => options?.onEnd?.(), 1200);
      return;
    }

    // Play returned audio stream
    if (data.audioUrl) {
      if (!options?.skipCache) {
        setOfflineCachedAudio(
          text,
          languageCode,
          data.audioUrl,
          options?.provider || data.provider,
          options?.voice,
          options?.model
        );
      }

      const audio = new Audio(data.audioUrl);
      audio.preload = "auto";
      activeAudio = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          if (activeAudio === audio) activeAudio = null;
          options?.onEnd?.();
          resolve();
        };
        audio.onerror = () => {
          if (activeAudio !== audio) {
            // Audio was aborted or replaced by newer playback, do not reject
            return;
          }
          activeAudio = null;
          reject(new Error("Failed to play audio stream from provider"));
        };
        audio.play().catch((playErr) => {
          if (activeAudio !== audio) return;
          activeAudio = null;
          if (playErr?.name === "NotAllowedError") {
            console.warn("Autoplay was prevented by browser policy:", playErr);
            resolve();
            return;
          }
          if (playErr?.name === "AbortError") {
            // Audio play interrupted by subsequent play, safe to ignore
            return;
          }
          reject(new Error(playErr?.message || "Failed to play audio stream from provider"));
        });
      });
      return;
    }

    // If no audioUrl returned and browser provider was requested
    if (options?.provider === "browser" || data.provider === "browser") {
      speakInLanguageNative(text, languageCode);
      setTimeout(() => options?.onEnd?.(), 1200);
    } else {
      throw new Error(data.message || "No audio stream returned by provider.");
    }
  } catch (err: any) {
    activeAudio = null;
    console.error("[playCardSpeech Error]:", err);

    // CRITICAL REQUIREMENT:
    // If an external provider is configured or requested, DO NOT silently fall back to browser voice!
    // Give user clear error feedback via onError.
    if (isExplicitApiProvider) {
      options?.onError?.(err);
      return;
    }

    // If the error message indicates an API provider failure, don't play browser fallback
    if (err?.message && (
      err.message.includes("Gemini") ||
      err.message.includes("OpenAI") ||
      err.message.includes("ElevenLabs") ||
      err.message.includes("Custom") ||
      err.message.includes("API key") ||
      err.message.includes("Base URL")
    )) {
      options?.onError?.(err);
      return;
    }

    // Otherwise, browser fallback is acceptable for default browser mode
    speakInLanguageNative(text, languageCode);
    options?.onError?.(err);
    options?.onEnd?.();
  }
}


export interface CaptureSpeechOptions {
  languageCode?: string;
  maxDurationSeconds?: number;
  onListeningStart?: () => void;
  onProcessingStart?: () => void;
  onListeningEnd?: () => void;
}

/**
 * Universal speech recognizer that works in ALL browsers:
 * - Uses native Web Speech API if supported (Chrome, Safari, Edge).
 * - Falls back seamlessly to MediaRecorder + Whisper API for Firefox and other browsers.
 */
export class UniversalSpeechRecognizer {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private recognition: any = null;
  private timer: NodeJS.Timeout | null = null;

  async start(
    options: CaptureSpeechOptions,
    onResult: (text: string) => void,
    onError: (err: string) => void
  ): Promise<() => void> {
    const isNativeSupported =
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

    // Option A: Browser has native Web Speech API (Chrome, Safari, Edge)
    if (isNativeSupported) {
      try {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const rec = new SpeechRec();
        this.recognition = rec;
        rec.lang = options.languageCode || "en-US";
        rec.continuous = false;
        rec.interimResults = false;
        rec.maxAlternatives = 1;

        rec.onstart = () => {
          options.onListeningStart?.();
        };

        rec.onresult = (event: any) => {
          const text = event.results[0]?.[0]?.transcript || "";
          onResult(text);
          options.onListeningEnd?.();
        };

        rec.onerror = (event: any) => {
          options.onListeningEnd?.();
          if (event.error === "no-speech") {
            onError("No voice detected. Please speak closer to your microphone.");
          } else if (event.error === "not-allowed") {
            onError("Microphone access was denied. Please allow microphone permissions.");
          } else {
            onError(`Recognition error: ${event.error}`);
          }
        };

        rec.onend = () => {
          options.onListeningEnd?.();
        };

        rec.start();

        const maxDuration = (options.maxDurationSeconds || 8) * 1000;
        this.timer = setTimeout(() => {
          try {
            rec.stop();
          } catch {}
        }, maxDuration);

        return () => {
          if (this.timer) clearTimeout(this.timer);
          options.onProcessingStart?.();
          try {
            rec.stop();
          } catch {
            try {
              rec.abort();
            } catch {}
          }
        };
      } catch (err: any) {
        // Fall back to MediaRecorder below
      }
    }

    // Option B: Firefox / Browser without native Web Speech API -> MediaRecorder + Whisper
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false, // Don't mute short or low volume vocalizations
            autoGainControl: true,
          },
        });
        this.stream = stream;

        const mimeType =
          typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
            ? "audio/ogg;codecs=opus"
            : "audio/webm";

        const recorder = new MediaRecorder(stream);
        this.mediaRecorder = recorder;
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstart = () => {
          options.onListeningStart?.();
        };

        recorder.onstop = async () => {
          options.onProcessingStart?.();
          try {
            stream.getTracks().forEach((track) => track.stop());
          } catch {}

          if (chunks.length === 0) {
            options.onListeningEnd?.();
            onError("No audio recorded.");
            return;
          }

          const blob = new Blob(chunks, { type: mimeType });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            try {
              const res = await fetch("/api/audio/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audio: base64Audio,
                  mimeType,
                  language: options.languageCode || "en",
                }),
              });

              const data = await res.json();
              if (!res.ok || data.error) {
                options.onListeningEnd?.();
                onError(data.error || "Failed to transcribe audio.");
                return;
              }
              onResult(data.text || "");
              options.onListeningEnd?.();
            } catch (fetchErr: any) {
              options.onListeningEnd?.();
              if (typeof navigator !== "undefined" && !navigator.onLine) {
                onError("Offline. Connect to the internet to transcribe speech.");
              } else {
                onError(fetchErr?.message || "Transcription network error.");
              }
            }
          };
          reader.readAsDataURL(blob);
        };

        recorder.start(100);

        const maxDuration = (options.maxDurationSeconds || 8) * 1000;
        this.timer = setTimeout(() => {
          if (recorder.state === "recording") {
            try {
              recorder.stop();
            } catch {}
          }
        }, maxDuration);

        return () => {
          if (this.timer) clearTimeout(this.timer);
          if (recorder.state === "recording") {
            try {
              recorder.stop();
            } catch {}
          }
        };
      } catch (mediaErr: any) {
        options.onListeningEnd?.();
        if (mediaErr.name === "NotAllowedError" || mediaErr.name === "PermissionDeniedError") {
          onError("Microphone permission was denied. Please allow microphone access in your browser (check the permissions icon in the address bar).");
        } else if (
          mediaErr.name === "NotFoundError" ||
          mediaErr.name === "DevicesNotFoundError" ||
          mediaErr.message?.toLowerCase().includes("not be found")
        ) {
          onError("No microphone detected. Please verify your microphone is plugged in, enabled in your system settings, and selected in your browser.");
        } else if (mediaErr.name === "NotReadableError" || mediaErr.name === "TrackStartError") {
          onError("Microphone is currently in use by another application or blocked by your system privacy settings.");
        } else {
          onError(`Microphone error: ${mediaErr?.message || "Unable to access microphone"}`);
        }
        return () => {};
      }
    }

    onError("Microphone is not supported in this browser.");
    return () => {};
  }
}
