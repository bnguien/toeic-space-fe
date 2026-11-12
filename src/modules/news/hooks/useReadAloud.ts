/**
 * Reads the whole article aloud with the browser voice (Web Speech) + word-by-word karaoke (port of Studychill
 * `useReadAloud`).
 *
 * - One utterance per sentence: stop, seek and replay are "cancel, then speak from word N" — no flaky pause().
 * - Word timing is estimated from word length and the learned characters/second of the voice, with pauses after
 *   punctuation; `boundary` events (Edge / Microsoft voices) only correct the clock.
 * - Seek ±3 s = ±(3 × words/second) words, crossing sentence boundaries.
 * - Karaoke is painted straight on the DOM every frame: `[data-sentence] [data-word]` get `data-karaoke`
 *   "passed" / "current" and `--p` (percent of the current word read).
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type { NewsSentenceDto } from "../types/news.types";
import { indexSentence, type IndexedWord } from "../utils/news-reader";
import { readStored, STORAGE_KEYS } from "../utils/news-storage";

const WORDS_PER_SECOND = 2.6; // news reading pace ~155 words/minute at rate 1
const LEAD_MS = 140; // the word lights up slightly before the voice reaches it (eyes ahead of ears)

/** The four TOEIC accents: US, GB, AU, CA. */
export const TOEIC_ACCENTS: Array<[string, string]> = [
  ["US", "Mỹ"],
  ["GB", "Anh"],
  ["AU", "Úc"],
  ["CA", "Canada"],
];

export const voiceRegion = (voice: SpeechSynthesisVoice): string =>
  (voice.lang.split(/[-_]/)[1] || "").toUpperCase();

const hasSpeech = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** English voices of the four TOEIC regions, natural/online voices first. */
export function englishVoices(): SpeechSynthesisVoice[] {
  const voices = (hasSpeech() && window.speechSynthesis.getVoices?.()) || [];
  const english = voices.filter(
    (x) => /^en[-_]/i.test(x.lang) && TOEIC_ACCENTS.some(([code]) => code === voiceRegion(x)),
  );
  const rank = (x: SpeechSynthesisVoice) =>
    /natural|online/i.test(x.name) ? 0 : /google/i.test(x.name) ? 1 : 2;
  return english.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** "Microsoft Aria Online (Natural) - English (United States)" → "Aria · Mỹ · tự nhiên". */
export function voiceLabel(voice: SpeechSynthesisVoice): string {
  const regions: Record<string, string> = {
    US: "Mỹ",
    GB: "Anh",
    AU: "Úc",
    CA: "Canada",
    IN: "Ấn Độ",
    IE: "Ireland",
    NZ: "New Zealand",
    ZA: "Nam Phi",
    SG: "Singapore",
  };
  const region = voiceRegion(voice);
  const name = voice.name
    .replace(/^(Microsoft|Google)\s+/i, "")
    .replace(/\s*\(.*$/, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s+Online$/i, "");
  return `${name} · ${regions[region] || region}${/natural|online/i.test(voice.name) ? " · tự nhiên" : ""}`;
}

const pickVoice = (name: string): SpeechSynthesisVoice | null => {
  const voices = englishVoices();
  return voices.find((x) => x.name === name) || voices[0] || null;
};

function clearHighlight(root: Element | null, sentenceId: string | undefined) {
  if (!root || !sentenceId) return;
  root
    .querySelectorAll(`[data-sentence="${sentenceId}"] [data-word][data-karaoke]`)
    .forEach((el) => el.removeAttribute("data-karaoke"));
}

export interface ReadAloudPosition {
  sentence: number;
  word: number;
}

export interface ReadAloud {
  isSupported: boolean;
  isReading: boolean;
  position: ReadAloudPosition;
  rate: number;
  atEnd: boolean;
  voices: SpeechSynthesisVoice[];
  voice: string;
  togglePlay: () => void;
  stop: () => void;
  seek: (seconds: number) => void;
  replaySentence: () => void;
  playFromSentence: (index: number) => void;
  changeRate: (rate: number) => void;
  speakWord: (text: string) => boolean;
  resume: () => void;
  setSingleSentence: (value: boolean) => void;
  changeVoice: (name: string) => void;
}

interface EngineState {
  session: number;
  sentence: number;
  word: number;
  reading: boolean;
  rate: number;
  frame: number;
  charsPerSecond: number;
  painted: number | null;
  singleSentence: boolean;
}

/**
 * @param sentences every sentence of the article in order
 * @param getContainer element holding the article (karaoke is painted inside it)
 * @param onVoiceChange called with the chosen voice name (persisted by the caller)
 */
export function useReadAloud(
  sentences: NewsSentenceDto[],
  getContainer: () => Element | null,
  onVoiceChange?: (name: string) => void,
): ReadAloud {
  const isSupported = hasSpeech();
  const [isReading, setIsReading] = useState(false);
  const [position, setPosition] = useState<ReadAloudPosition>({ sentence: 0, word: -1 });
  const [rate, setRate] = useState(1);
  const [atEnd, setAtEnd] = useState(false);
  const [voiceName, setVoiceName] = useState(() => readStored<string>(STORAGE_KEYS.voice, ""));
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => englishVoices());
  const voiceRef = useRef(voiceName);
  const engine = useRef<EngineState>({
    session: 0,
    sentence: 0,
    word: 0,
    reading: false,
    rate: 1,
    frame: 0,
    charsPerSecond: 15,
    painted: null,
    singleSentence: false,
  });
  const wordIndex = useRef<IndexedWord[][]>([]);
  const speakFromRef = useRef<(sentenceIdx: number, wordIdx: number) => void>(() => {});
  const onVoiceChangeRef = useRef(onVoiceChange);

  useEffect(() => {
    voiceRef.current = voiceName;
  }, [voiceName]);
  useEffect(() => {
    onVoiceChangeRef.current = onVoiceChange;
  }, [onVoiceChange]);

  // The voice list loads asynchronously (voiceschanged).
  useEffect(() => {
    if (!isSupported) return undefined;
    const load = () => setVoices(englishVoices());
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    const timer = window.setTimeout(load, 300);
    return () => {
      window.clearTimeout(timer);
      window.speechSynthesis.removeEventListener?.("voiceschanged", load);
    };
  }, [isSupported]);

  useEffect(() => {
    wordIndex.current = sentences.map((x) => indexSentence(x.text));
  }, [sentences]);

  useEffect(() => {
    const state = engine.current;
    return () => {
      state.session += 1;
      cancelAnimationFrame(state.frame);
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  const stop = useCallback(() => {
    const state = engine.current;
    state.session += 1;
    state.reading = false;
    cancelAnimationFrame(state.frame);
    if (isSupported) window.speechSynthesis.cancel();
    setIsReading(false);
  }, [isSupported]);

  const paint = useCallback(
    (sentenceIdx: number, current: number, fraction: number) => {
      const root = getContainer();
      const id = sentences[sentenceIdx]?.id;
      if (!root || !id) return;
      const state = engine.current;
      if (state.painted != null && state.painted !== sentenceIdx)
        clearHighlight(root, sentences[state.painted]?.id);
      state.painted = sentenceIdx;
      root.querySelectorAll<HTMLElement>(`[data-sentence="${id}"] [data-word]`).forEach((el) => {
        const j = Number(el.dataset.word);
        const value = j < current ? "passed" : j === current ? "current" : null;
        if ((el.dataset.karaoke ?? null) !== value) {
          if (value) el.dataset.karaoke = value;
          else el.removeAttribute("data-karaoke");
        }
        if (value === "current")
          el.style.setProperty("--p", `${Math.round(fraction * 1000) / 10}%`);
      });
    },
    [sentences, getContainer],
  );

  const speakFrom = useCallback(
    (sentenceIdx: number, wordIdx: number) => {
      const state = engine.current;
      if (!isSupported || sentenceIdx >= sentences.length) {
        stop();
        setPosition({ sentence: Math.max(0, sentences.length - 1), word: -1 });
        if (sentenceIdx >= sentences.length) setAtEnd(true);
        return;
      }
      const words = wordIndex.current[sentenceIdx] || indexSentence(sentences[sentenceIdx].text);
      const startIdx = Math.max(0, Math.min(wordIdx, words.length - 1));
      const offset = words[startIdx]?.at || 0;
      const session = ++state.session;
      cancelAnimationFrame(state.frame);
      window.speechSynthesis.cancel();
      state.sentence = sentenceIdx;
      state.word = startIdx;
      state.reading = true;
      setIsReading(true);
      setAtEnd(false);
      setPosition({ sentence: sentenceIdx, word: startIdx });

      // Timeline of the sentence: each word lasts in proportion to its characters (learned chars/second of this
      // voice) plus the pause after punctuation; boundary events only realign the clock.
      const duration = (j: number) =>
        (((words[j].text.length + 1) / state.charsPerSecond) * 1000) / state.rate;
      const starts: number[] = [];
      let total = 0;
      for (let j = startIdx; j < words.length; j += 1) {
        starts[j] = total;
        total += duration(j) + (words[j].pause || 0) / state.rate;
      }
      let t0: number | null = null;

      const tick = () => {
        if (session !== state.session) return;
        if (t0 != null) {
          const t = performance.now() - t0 + LEAD_MS;
          let i = startIdx;
          while (i + 1 < words.length && starts[i + 1] <= t) i += 1;
          const fraction = Math.max(0, Math.min(1, (t - starts[i]) / duration(i)));
          state.word = i;
          paint(sentenceIdx, i, fraction);
        }
        state.frame = requestAnimationFrame(tick);
      };

      const utterance = new SpeechSynthesisUtterance(sentences[sentenceIdx].text.slice(offset));
      utterance.lang = "en-US";
      utterance.rate = state.rate;
      const voice = pickVoice(voiceRef.current);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      let speechStart = 0;
      utterance.onstart = () => {
        if (session !== state.session) return;
        speechStart = performance.now();
        t0 = speechStart;
        state.frame = requestAnimationFrame(tick);
      };
      utterance.onboundary = (event) => {
        if (session !== state.session || t0 == null || (event.name && event.name !== "word"))
          return;
        const at = offset + event.charIndex;
        let idx = startIdx;
        for (let j = startIdx; j < words.length && words[j].at <= at; j += 1) idx = j;
        const drift = performance.now() - t0 - starts[idx];
        if (Math.abs(drift) > 60) t0 += drift * 0.7;
      };
      utterance.onend = () => {
        if (session !== state.session) return;
        cancelAnimationFrame(state.frame);
        // Learn the voice's real speed (chars/second at 1×) so the next sentence matches better.
        const actualMs = performance.now() - speechStart;
        const pauseMs = words.slice(startIdx).reduce((n, w) => n + (w.pause || 0), 0) / state.rate;
        const characters = words.slice(startIdx).reduce((n, w) => n + w.text.length + 1, 0);
        if (speechStart && actualMs - pauseMs > 400 && characters > 12) {
          const measured = characters / ((actualMs - pauseMs) / 1000) / state.rate;
          state.charsPerSecond = Math.min(
            26,
            Math.max(9, state.charsPerSecond * 0.5 + measured * 0.5),
          );
        }
        paint(sentenceIdx, words.length, 0);
        if (!state.reading) return;
        if (state.singleSentence) {
          state.reading = false;
          setIsReading(false);
          return;
        }
        speakFromRef.current(sentenceIdx + 1, 0);
      };
      utterance.onerror = (event) => {
        if (
          session === state.session &&
          event.error !== "interrupted" &&
          event.error !== "canceled"
        )
          stop();
      };
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, sentences, stop, paint],
  );

  useEffect(() => {
    speakFromRef.current = speakFrom;
  }, [speakFrom]);

  const togglePlay = useCallback(() => {
    const state = engine.current;
    if (state.reading) {
      stop();
      return;
    }
    const finished =
      state.sentence >= sentences.length - 1 &&
      state.word >= (wordIndex.current[state.sentence]?.length || 1) - 1;
    speakFrom(finished ? 0 : state.sentence, finished ? 0 : state.word);
  }, [sentences.length, speakFrom, stop]);

  const seek = useCallback(
    (seconds: number) => {
      const state = engine.current;
      const step = Math.round(seconds * WORDS_PER_SECOND * state.rate);
      let sentenceIdx = state.sentence;
      let wordIdx = state.word + step;
      while (wordIdx < 0 && sentenceIdx > 0) {
        sentenceIdx -= 1;
        wordIdx += wordIndex.current[sentenceIdx].length;
      }
      while (
        sentenceIdx < sentences.length - 1 &&
        wordIdx >= wordIndex.current[sentenceIdx].length
      ) {
        wordIdx -= wordIndex.current[sentenceIdx].length;
        sentenceIdx += 1;
      }
      wordIdx = Math.max(0, Math.min(wordIdx, (wordIndex.current[sentenceIdx]?.length || 1) - 1));
      if (state.reading) speakFrom(sentenceIdx, wordIdx);
      else {
        state.sentence = sentenceIdx;
        state.word = wordIdx;
        setPosition({ sentence: sentenceIdx, word: wordIdx });
      }
    },
    [sentences.length, speakFrom],
  );

  const setSingleSentence = useCallback((value: boolean) => {
    engine.current.singleSentence = value;
  }, []);
  const replaySentence = useCallback(() => speakFrom(engine.current.sentence, 0), [speakFrom]);
  const playFromSentence = useCallback((index: number) => speakFrom(index, 0), [speakFrom]);
  const changeRate = useCallback(
    (value: number) => {
      engine.current.rate = value;
      setRate(value);
      if (engine.current.reading) speakFrom(engine.current.sentence, engine.current.word);
    },
    [speakFrom],
  );

  /** Speaks one word (on click): pauses the article; returns whether the article was being read. */
  const speakWord = useCallback(
    (text: string) => {
      const wasReading = engine.current.reading;
      if (wasReading) stop();
      if (isSupported && text) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 0.85;
        const voice = pickVoice(voiceRef.current);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        }
        window.speechSynthesis.speak(utterance);
      }
      return wasReading;
    },
    [isSupported, stop],
  );

  const resume = useCallback(
    () => speakFrom(engine.current.sentence, engine.current.word),
    [speakFrom],
  );

  const changeVoice = useCallback(
    (name: string) => {
      voiceRef.current = name;
      setVoiceName(name);
      onVoiceChangeRef.current?.(name);
      if (engine.current.reading) speakFrom(engine.current.sentence, engine.current.word);
      else if (isSupported) {
        const utterance = new SpeechSynthesisUtterance("Hello! This is how I sound.");
        const voice = pickVoice(name);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        }
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    },
    [isSupported, speakFrom],
  );

  return {
    isSupported,
    isReading,
    position,
    rate,
    atEnd,
    voices,
    voice: pickVoice(voiceName)?.name || "",
    togglePlay,
    stop,
    seek,
    replaySentence,
    playFromSentence,
    changeRate,
    speakWord,
    resume,
    setSingleSentence,
    changeVoice,
  };
}
