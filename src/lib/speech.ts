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

  try {
    options?.onStart?.();

    // 1. Check offline-cached audio mapping first (instant playback offline or online)
    const cachedUrl = getOfflineCachedAudio(text, languageCode);
    if (cachedUrl) {
      try {
        const audio = new Audio(cachedUrl);
        activeAudio = audio;

        audio.onended = () => {
          activeAudio = null;
          options?.onEnd?.();
        };

        audio.onerror = () => {
          activeAudio = null;
          // Fall back to native if audio file fails
          speakInLanguageNative(text, languageCode);
          options?.onEnd?.();
        };

        await audio.play();
        return;
      } catch {
        // Fall back to fetch below
      }
    }

    // 2. Fetch from server if online
    if (typeof navigator === "undefined" || navigator.onLine) {
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
          // Store mapping for future offline playback
          setOfflineCachedAudio(text, languageCode, data.audioUrl);
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
    }

    // 3. Fallback to browser's native speech synthesis (operates 100% offline)
    speakInLanguageNative(text, languageCode);
    setTimeout(() => {
      options?.onEnd?.();
    }, 1000);
  } catch (err) {
    speakInLanguageNative(text, languageCode);
    options?.onEnd?.();
  }
}


export interface CaptureSpeechOptions {
  languageCode?: string;
  maxDurationSeconds?: number;
  onListeningStart?: () => void;
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

        return () => {
          try {
            rec.abort();
          } catch {}
          options.onListeningEnd?.();
        };
      } catch (err: any) {
        // Fall back to MediaRecorder below
      }
    }

    // Option B: Firefox / Browser without native Web Speech API -> MediaRecorder + Whisper
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
          options.onListeningEnd?.();
          stream.getTracks().forEach((track) => track.stop());

          if (chunks.length === 0) {
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
                onError(data.error || "Failed to transcribe audio.");
                return;
              }
              onResult(data.text || "");
            } catch (fetchErr: any) {
              if (typeof navigator !== "undefined" && !navigator.onLine) {
                onError("Offline. Connect to the internet to transcribe speech.");
              } else {
                onError(fetchErr?.message || "Transcription network error.");
              }
            }
          };
          reader.readAsDataURL(blob);
        };

        recorder.start();

        const maxDuration = (options.maxDurationSeconds || 3.5) * 1000;
        this.timer = setTimeout(() => {
          if (recorder.state === "recording") {
            recorder.stop();
          }
        }, maxDuration);

        return () => {
          if (this.timer) clearTimeout(this.timer);
          if (recorder.state === "recording") {
            try {
              recorder.stop();
            } catch {}
          }
          stream.getTracks().forEach((track) => track.stop());
        };
      } catch (mediaErr: any) {
        options.onListeningEnd?.();
        if (mediaErr.name === "NotAllowedError" || mediaErr.name === "PermissionDeniedError") {
          onError("Microphone permission was denied. Please allow microphone access in Firefox.");
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
