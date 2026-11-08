/**
 * Reads a dictation sentence with the browser voice (Web Speech): the voice follows the sentence accent
 * (US/UK/AU…), the rate follows the settings, N plays with a pause in between. Used when the server audio
 * fails (or for static sentences).
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import type { AccentKey } from "../utils/dictation-settings";

export const ACCENTS: [AccentKey, string][] = [
  ["auto", "Theo bài"],
  ["en-US", "Mỹ"],
  ["en-GB", "Anh"],
  ["en-AU", "Úc"],
];

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  times?: number;
  gap?: number;
}

export interface SentenceSpeech {
  /** Resolves when every play finished (false when interrupted). */
  play: (text: string, options?: SpeakOptions) => Promise<boolean>;
  stop: () => void;
  playing: boolean;
  supported: boolean;
}

const synth = (): SpeechSynthesis | null =>
  typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** "Natural" voices (Edge/Chrome neural) sound far clearer than the default machine voices. */
const QUALITY = /natural|neural|online|google|premium|enhanced|siri/i;

function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const wanted = lang.toLowerCase();
  const same = voices.filter((v) => v.lang?.toLowerCase().replace("_", "-") === wanted);
  const family = same.length
    ? same
    : voices.filter((v) => v.lang?.toLowerCase().startsWith(wanted.slice(0, 2)));
  return (
    family.find((v) => QUALITY.test(v.name)) ||
    family.find((v) => v.localService === false) ||
    family[0] ||
    null
  );
}

// The voice list as an external store: cached by content so getSnapshot stays stable between calls.
const NO_VOICES: SpeechSynthesisVoice[] = [];
let cachedVoices = NO_VOICES;
let cachedKey = "";

function readVoices(): SpeechSynthesisVoice[] {
  const list = synth()?.getVoices() ?? NO_VOICES;
  const key = list.map((v) => v.voiceURI).join("|");
  if (key !== cachedKey) {
    cachedKey = key;
    cachedVoices = list;
  }
  return cachedVoices;
}

function subscribeVoices(onChange: () => void): () => void {
  const s = synth();
  if (!s) return () => {};
  s.addEventListener?.("voiceschanged", onChange);
  return () => s.removeEventListener?.("voiceschanged", onChange);
}

export function useSentenceSpeech(): SentenceSpeech {
  const voices = useSyncExternalStore(subscribeVoices, readVoices, () => NO_VOICES);
  const [playing, setPlaying] = useState(false);
  const token = useRef(0);
  // Keep a reference: a Chrome GC bug can drop the utterance and lose its onend.
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    token.current += 1;
    synth()?.cancel();
    current.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => stop, [stop]);

  const speakOnce = useCallback(
    (text: string, lang: string, rate: number) =>
      new Promise<boolean>((resolve) => {
        const s = synth();
        if (!s || !text) {
          resolve(false);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = Math.min(2, Math.max(0.4, rate));
        const voice = pickVoice(voices, lang);
        if (voice) utterance.voice = voice;
        // Deadline in case the browser never reports onend (background tab, voice driver bug).
        const limit = setTimeout(() => resolve(true), 2000 + (text.length * 120) / utterance.rate);
        const end = () => {
          clearTimeout(limit);
          resolve(true);
        };
        utterance.onend = end;
        utterance.onerror = end;
        current.current = utterance;
        s.speak(utterance);
      }),
    [voices],
  );

  const play = useCallback(
    async (text: string, { lang = "en-US", rate = 1, times = 1, gap = 700 }: SpeakOptions = {}) => {
      stop();
      const mine = token.current;
      setPlaying(true);
      for (let k = 0; k < Math.max(1, times); k += 1) {
        if (k > 0) await sleep(gap);
        if (mine !== token.current) return false;
        await speakOnce(text, lang, rate);
        if (mine !== token.current) return false;
      }
      setPlaying(false);
      return true;
    },
    [speakOnce, stop],
  );

  const supported = synth() !== null;
  return useMemo(() => ({ play, stop, playing, supported }), [play, stop, playing, supported]);
}
