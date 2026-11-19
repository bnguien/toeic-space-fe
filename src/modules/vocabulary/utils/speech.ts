export type SpeechLang = "en-US" | "vi-VN";

interface SpeakOptions {
  rate?: number;
  onEnd?: () => void;
}

const isSupported = (): boolean =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  typeof window.SpeechSynthesisUtterance !== "undefined";

/** Best voice for a language; `undefined` = no list yet, `null` = the browser has none for it. */
const pickVoice = (lang: SpeechLang): SpeechSynthesisVoice | null | undefined => {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return undefined;
  const prefix = lang.slice(0, 2).toLowerCase();
  const normalized = (voice: SpeechSynthesisVoice) => voice.lang.replace("_", "-").toLowerCase();
  return (
    voices.find((voice) => normalized(voice) === lang.toLowerCase()) ??
    voices.find((voice) => normalized(voice).startsWith(prefix)) ??
    null
  );
};

/**
 * Speaks `text` with the Web Speech API. Silent when the browser has no speech support
 * or no voice for the language (never reads Vietnamese with an English voice).
 * Returns whether speech was started.
 */
export function speak(text: string, lang: SpeechLang, options: SpeakOptions = {}): boolean {
  if (!text.trim() || !isSupported()) return false;

  const voice = pickVoice(lang);
  if (voice === null) return false;

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = options.rate ?? (lang === "en-US" ? 0.9 : 1);
  if (voice) utterance.voice = voice;
  if (options.onEnd) {
    utterance.onend = options.onEnd;
    utterance.onerror = options.onEnd;
  }

  try {
    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  if (isSupported()) window.speechSynthesis.cancel();
}
