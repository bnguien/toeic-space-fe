// Constants and pure helpers of the bilingual subtitle reader (port of Studychill `subtitleReading.js`).
// Kept out of component files so React fast refresh keeps working.

import type { Cue } from "../types/video.types";

export const FONT_SIZES = [
  { key: "xs", label: "XS", scale: 0.8 },
  { key: "s", label: "S", scale: 0.95 },
  { key: "m", label: "M", scale: 1.15 },
  { key: "l", label: "L", scale: 1.35 },
  { key: "xl", label: "XL", scale: 1.6 },
] as const;

export type FontSizeKey = (typeof FONT_SIZES)[number]["key"];

export interface ReaderTheme {
  key: ReaderThemeKey;
  label: string;
  /** Swatch colours of the picker (match the `--vr-*` tokens of the reader root). */
  bg: string;
  ink: string;
  accent: string;
  dark?: boolean;
}

export type ReaderThemeKey = "paper" | "moss" | "ink" | "clay" | "night" | "night-sea";

/** Reading backgrounds: 4 light + 2 dark. `paper` is built from the TOEIC Space palette. */
export const READER_THEMES: readonly ReaderTheme[] = [
  { key: "paper", label: "Giấy", bg: "#fdf8f0", ink: "#252c3f", accent: "#4867a8" },
  { key: "moss", label: "Rêu", bg: "#eef2e8", ink: "#1f2b1d", accent: "#3a6f1d" },
  { key: "ink", label: "Mực xanh", bg: "#f1f4f8", ink: "#1b2638", accent: "#2453a0" },
  { key: "clay", label: "Đất nung", bg: "#f5eee2", ink: "#2e2118", accent: "#9a3f1c" },
  { key: "night", label: "Đêm", bg: "#1c1f1d", ink: "#ece7da", accent: "#8fdcab", dark: true },
  {
    key: "night-sea",
    label: "Biển đêm",
    bg: "#161d24",
    ink: "#e1e6ea",
    accent: "#7fd3dd",
    dark: true,
  },
];

export const isDarkTheme = (key: string): boolean =>
  !!READER_THEMES.find((theme) => theme.key === key)?.dark;

/** Defaults: size S, Paper background, phonetics off, Sentence mode plays continuously. */
export const DEFAULT_SETTINGS = {
  fontSize: "s" as FontSizeKey,
  theme: "paper" as ReaderThemeKey,
  /** Sentence mode: pause at the end of each sentence (Cloze always pauses). */
  pauseEachSentence: false,
  showPhonetic: false,
  showGloss: true,
  showTranslation: true,
  markSavedWords: true,
  zoomVideo: false,
  glossLanguage: "vi",
  /** Hovering a word shows its meaning in place. */
  hoverGloss: true,
  /** Off by default: the transcript is the main reading place; text over the video duplicates burned-in subs. */
  showVideoOverlay: false,
  /** Highlighted word tiers ("" = off); a string so memoised rows compare cheaply. */
  highlightTiers: "toeic,b2,c1",
};

export type ReaderSettings = typeof DEFAULT_SETTINGS;
export type ReaderSettingKey = keyof ReaderSettings;

const PUNCTUATION = '.,!?;:"()[]{}<>…—–*_/|~`@#$%^&+=';

/** Strips punctuation at both ends for dictionary lookups; the reader still shows the raw token. */
export function cleanToken(tok: string): string {
  let a = 0;
  let b = tok.length;
  while (a < b && PUNCTUATION.indexOf(tok[a]) >= 0) a += 1;
  while (b > a && PUNCTUATION.indexOf(tok[b - 1]) >= 0) b -= 1;
  let s = tok.slice(a, b);
  // Apostrophes inside a word stay (don't, it's); at the edges they go.
  while (s.length && (s[0] === "'" || s[0] === "’")) s = s.slice(1);
  while (s.length && (s[s.length - 1] === "'" || s[s.length - 1] === "’")) s = s.slice(0, -1);
  return s;
}

/** Index of the cue playing at `t` (binary search), -1 in a gap between two cues. */
export function findCueIndex(
  cues: readonly Cue[] | null | undefined,
  t: number,
  grace = 0.3,
): number {
  if (!cues || !cues.length) return -1;
  let lo = 0;
  let hi = cues.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid][0] <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (ans < 0) return -1;
  const c = cues[ans];
  if (t > c[0] + (c[1] || 0) + grace) return -1;
  return ans;
}

/** Index of the last cue that has started (finished or not) — karaoke and scrolling keep it during silences. */
export function findLastStartedCue(cues: readonly Cue[] | null | undefined, t: number): number {
  if (!cues || !cues.length) return -1;
  let lo = 0;
  let hi = cues.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid][0] <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/**
 * Pairs every primary cue with the secondary cue that overlaps it most in time. The two YouTube tracks share one
 * time axis but not the same number of cues, so index matching is wrong.
 */
export function alignTranslation(
  primary: readonly Cue[] | null | undefined,
  secondary: readonly Cue[] | null | undefined,
): string[] {
  const result = new Array<string>((primary || []).length).fill("");
  if (!primary || !primary.length || !secondary || !secondary.length) return result;
  let j = 0;
  for (let i = 0; i < primary.length; i += 1) {
    const a0 = primary[i][0];
    const a1 = a0 + (primary[i][1] || 0);
    while (j + 1 < secondary.length && secondary[j][0] + (secondary[j][1] || 0) < a0) j += 1;
    let bestOverlap = -1;
    let best = "";
    for (let k = j; k < secondary.length; k += 1) {
      const b0 = secondary[k][0];
      if (b0 > a1) break;
      const b1 = b0 + (secondary[k][1] || 0);
      const overlap = Math.min(a1, b1) - Math.max(a0, b0);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = secondary[k][2];
      }
    }
    result[i] = bestOverlap > 0 ? best : "";
  }
  return result;
}

/** Number of words already spoken in a cue (real per-word offsets when present, else even split). */
export function spokenWordCount(cue: Cue | null | undefined, t: number): number {
  if (!cue) return 0;
  const elapsed = t - cue[0];
  if (elapsed <= 0) return 0;
  const wordCount = cue[2] ? cue[2].split(" ").length : 0;
  if (!wordCount) return 0;

  const wordTimes = cue[3];
  if (wordTimes && wordTimes.length) {
    let n = 0;
    while (n < wordTimes.length && wordTimes[n] <= elapsed) n += 1;
    return Math.min(n, wordCount);
  }
  const duration = cue[1] || 0;
  if (duration <= 0) return wordCount;
  return Math.min(wordCount, Math.floor((elapsed / duration) * wordCount) + 1);
}

/** Seconds → m:ss (h:mm:ss for long videos). */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return h ? `${h}:${pad2(m)}:${pad2(rest)}` : `${m}:${pad2(rest)}`;
}

/** Karaoke progress of a cue as a percentage of its character length (0..100). */
export function karaokeCharProgress(cue: Cue | null | undefined, t: number): number {
  if (!cue || !cue[2]) return 0;
  const elapsed = t - cue[0];
  if (elapsed <= 0) return 0;
  const duration = cue[1] || 0;
  const totalChars = cue[2].length;
  if (!totalChars) return 0;

  const wordTimes = cue[3];
  if (!wordTimes || !wordTimes.length) {
    return duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 100;
  }

  const words = cue[2].split(" ");
  let i = 0;
  while (i < wordTimes.length && wordTimes[i] <= elapsed) i += 1;
  i -= 1; // word being spoken
  if (i < 0) return 0;

  const wordEnd = i + 1 < wordTimes.length ? wordTimes[i + 1] : Math.max(duration, wordTimes[i]);
  const wordSpan = wordEnd - wordTimes[i];
  const withinWord = wordSpan > 0 ? Math.min(1, (elapsed - wordTimes[i]) / wordSpan) : 1;

  let charsBefore = 0;
  for (let k = 0; k < i && k < words.length; k += 1) charsBefore += words[k].length + 1;
  const charsDone = charsBefore + withinWord * (words[i] || "").length;
  return Math.max(0, Math.min(100, (charsDone / totalChars) * 100));
}

// Time weight of a token when the cue has no per-word offsets: letters + a fixed part (onset/coda), plus the pause
// after punctuation — real speech stops there.
const KARAOKE_BASE_WEIGHT = 1.5;
const KARAOKE_SENTENCE_PAUSE = 5;
const KARAOKE_COMMA_PAUSE = 2.5;

function tokenWeight(tok: string): { speak: number; pause: number } {
  const letterCount = String(tok).replace(/[^\p{L}\p{N}']/gu, "").length;
  const pause = /[.!?…]["”’')\]]*$/.test(tok)
    ? KARAOKE_SENTENCE_PAUSE
    : /[,;:—–]["”’')\]]*$/.test(tok)
      ? KARAOKE_COMMA_PAUSE
      : 0;
  return { speak: Math.max(1, letterCount) + KARAOKE_BASE_WEIGHT, pause };
}

export interface TokenPhrase {
  from: number;
  to: number;
  text: string;
}

/**
 * Phrase merge on lookup: token `i` just clicked joins the already-clicked tokens next to it in the sentence (no
 * punctuation in between) → `{from, to, text}` (2..maxTokens tokens), else null.
 */
export function findTokenPhrase(
  toks: readonly string[],
  selected: ReadonlySet<number>,
  i: number,
  maxTokens = 5,
): TokenPhrase | null {
  const BREAK_AFTER = /[.!?…,;:—–"”’)\]]$/; // a token ending with punctuation stops the phrase
  const BREAK_BEFORE = /^["“‘([]/; // an opening quote/bracket does not join the previous token
  const isJoined = (j: number) =>
    j >= 0 && j + 1 < toks.length && !BREAK_AFTER.test(toks[j]) && !BREAK_BEFORE.test(toks[j + 1]);
  let from = i;
  let to = i;
  while (from - 1 >= 0 && selected.has(from - 1) && isJoined(from - 1) && to - from + 1 < maxTokens)
    from -= 1;
  while (to + 1 < toks.length && selected.has(to + 1) && isJoined(to) && to - from + 1 < maxTokens)
    to += 1;
  if (to === from) return null;
  const text = toks
    .slice(from, to + 1)
    .join(" ")
    .replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, "");
  return text ? { from, to, text } : null;
}

/** Spoken duration (s, without the pause after punctuation) of token `i` — CSS sweeps the word over it. */
export function tokenDuration(cue: Cue | null | undefined, i: number): number {
  if (!cue || !cue[2] || i < 0) return 0;
  const words = cue[2].split(" ");
  const duration = cue[1] || 0;
  const wordTimes = cue[3];
  if (wordTimes && wordTimes.length) {
    const wordEnd =
      i + 1 < wordTimes.length ? wordTimes[i + 1] : Math.max(duration, (wordTimes[i] || 0) + 0.3);
    return Math.max(0.08, wordEnd - (wordTimes[i] || 0));
  }
  const weights = words.map(tokenWeight);
  const totalWeight = weights.reduce((n, w) => n + w.speak + w.pause, 0) || 1;
  return Math.max(0.08, ((weights[i]?.speak || 1) / totalWeight) * duration);
}

export interface KaraokePosition {
  /** Index of the word being spoken (-1 before the first word). */
  i: number;
  /** Spoken part of that word (0..1). */
  part: number;
}

/** Detailed karaoke position: the word being spoken and how much of it is said. */
export function karaokeWordProgress(cue: Cue | null | undefined, t: number): KaraokePosition {
  if (!cue || !cue[2]) return { i: -1, part: 0 };
  const elapsed = t - cue[0];
  if (elapsed <= 0) return { i: -1, part: 0 };
  const words = cue[2].split(" ");
  const duration = cue[1] || 0;
  const wordTimes = cue[3];

  if (!wordTimes || !wordTimes.length) {
    // No per-word offsets: interpolate by word length + pause after punctuation (tokenWeight).
    if (duration <= 0) return { i: words.length - 1, part: 1 };
    const weights = words.map(tokenWeight);
    const totalWeight = weights.reduce((n, w) => n + w.speak + w.pause, 0) || 1;
    const x = Math.min(1, elapsed / duration) * totalWeight;
    let segStart = 0;
    for (let i = 0; i < weights.length; i += 1) {
      const segEnd = segStart + weights[i].speak + weights[i].pause;
      if (x < segEnd || i === weights.length - 1)
        return { i, part: Math.min(1, (x - segStart) / weights[i].speak) };
      segStart = segEnd;
    }
    return { i: words.length - 1, part: 1 };
  }

  let i = 0;
  while (i < wordTimes.length && wordTimes[i] <= elapsed) i += 1;
  i -= 1;
  if (i < 0) return { i: -1, part: 0 };

  const wordEnd =
    i + 1 < wordTimes.length ? wordTimes[i + 1] : Math.max(duration, wordTimes[i] + 0.3);
  const wordSpan = wordEnd - wordTimes[i];
  const fraction = wordSpan > 0 ? Math.min(1, (elapsed - wordTimes[i]) / wordSpan) : 1;
  return { i: Math.min(i, words.length - 1), part: fraction };
}

// ── Cue cleaning ─────────────────────────────────────────────────────────────
// YouTube auto captions insert '>>' for a speaker change and auto-translations often start with stray punctuation.
// Cleaned ONCE when subtitles arrive, cutting the per-word offsets accordingly so karaoke stays aligned.

const LEADING_PUNCTUATION = ".,;:!?-–—…>»·•";

/** Token that only marks a speaker change ('>>', '>', '&gt;&gt;'). */
function isSpeakerChangeMark(tok: string): boolean {
  return /^(?:>+|(?:&gt;)+)$/.test(tok);
}

function hasAlphanumeric(s: string): boolean {
  return /[\p{L}\p{N}]/u.test(s);
}

/** One cue → cleaned cue, or null when nothing readable is left. */
export function cleanCue(cue: Cue | null | undefined): Cue | null {
  if (!cue || typeof cue[2] !== "string") return null;
  const rawTokens = cue[2].split(" ").filter((t) => t !== "");
  const rawTimes = Array.isArray(cue[3]) && cue[3].length === rawTokens.length ? cue[3] : null;
  const words: string[] = [];
  const wordTimes: number[] = [];
  rawTokens.forEach((t, i) => {
    if (isSpeakerChangeMark(t)) return;
    words.push(t);
    if (rawTimes) wordTimes.push(rawTimes[i]);
  });
  // Drop stray punctuation at the START; a token made only of punctuation goes with its offset.
  while (words.length) {
    let a = 0;
    while (a < words[0].length && LEADING_PUNCTUATION.indexOf(words[0][a]) >= 0) a += 1;
    if (a === 0) break;
    if (a < words[0].length) {
      words[0] = words[0].slice(a);
      break;
    }
    words.shift();
    if (rawTimes) wordTimes.shift();
  }
  const text = words.join(" ");
  if (!text || !hasAlphanumeric(text)) return null;
  if (text === cue[2] && cue.length <= 4) return cue;
  return rawTimes && wordTimes.length ? [cue[0], cue[1], text, wordTimes] : [cue[0], cue[1], text];
}

/** Cleans a whole track and drops empty cues (only '.' or '♪'). */
export function cleanCues(cues: unknown): Cue[] {
  if (!Array.isArray(cues)) return [];
  const result: Cue[] = [];
  cues.forEach((c) => {
    const s = cleanCue(c as Cue);
    if (s) result.push(s);
  });
  return result;
}

/** Marks sound/music tokens ('[Music]', '(Tiếng cười)', '♪ … ♪'): not words to learn, shown dimmed. */
export function markSoundTokens(tokens: readonly string[]): boolean[] {
  const result = new Array<boolean>(tokens.length).fill(false);
  let pendingClose: string | null = null; // closing char awaited: ']' or ')'
  tokens.forEach((t, i) => {
    if (!pendingClose && (t[0] === "[" || t[0] === "(")) pendingClose = t[0] === "[" ? "]" : ")";
    if (pendingClose) {
      result[i] = true;
      if (t.indexOf(pendingClose) >= 0) pendingClose = null;
      return;
    }
    if (/^[♪♫🎵]+$/u.test(t)) result[i] = true;
  });
  return result;
}

export type ListenMode = "sentence" | "flow" | "cloze" | "rewrite";

/** Listening modes: sentence list (continuous, optional pause per sentence), paragraphs, cloze, rewrite. */
export const LISTEN_MODES: readonly { key: ListenMode; label: string; description: string }[] = [
  { key: "sentence", label: "Từng câu", description: "Hiện từng câu kèm bản dịch, phát liên tục" },
  {
    key: "flow",
    label: "Liền mạch",
    description: "Đọc thành đoạn văn, bản dịch ngay dưới mỗi đoạn",
  },
  { key: "cloze", label: "Điền từ", description: "Nghe từng câu rồi gõ từ còn thiếu" },
  {
    key: "rewrite",
    label: "Viết lại",
    description: "Nghe từng câu rồi viết lại cả câu (như Dictation)",
  },
];

export type WordTierKey = "toeic" | "b2" | "c1";

/** Highlight tiers (server `levels` = {word: CEFR | 'TOEIC'}). */
export const WORD_TIERS: readonly { key: WordTierKey; label: string; description: string }[] = [
  { key: "toeic", label: "TOEIC", description: "Từ TOEIC trọng tâm (B1)" },
  { key: "b2", label: "B2", description: "Từ trung cao cấp" },
  { key: "c1", label: "C1+", description: "Từ nâng cao" },
];

export function wordTier(cefr: string | null | undefined): WordTierKey | "" {
  if (!cefr) return "";
  if (cefr === "C1" || cefr === "C2") return "c1";
  if (cefr === "B2") return "b2";
  return "toeic";
}

const SENTENCE_END = /[.?!…]["')\]]*$/;

/**
 * Groups cues into paragraphs for the flow mode (arrays of cue indices). A paragraph breaks on a long pause, or once
 * it is long enough and the previous cue ends a sentence; auto captions without punctuation break hard at twice the
 * length.
 */
export function splitParagraphs(
  cues: readonly Cue[] | null | undefined,
  { maxPause = 2.2, maxChars = 360 }: { maxPause?: number; maxChars?: number } = {},
): number[][] {
  const paragraphs: number[][] = [];
  let current: number[] = [];
  let charCount = 0;
  (cues || []).forEach((cue, i) => {
    if (current.length && cues) {
      const prevCue = cues[i - 1];
      const gap = cue[0] - (prevCue[0] + (prevCue[1] || 0));
      const endsSentence = SENTENCE_END.test(prevCue[2] || "");
      if (gap > maxPause || (charCount >= maxChars && endsSentence) || charCount >= maxChars * 2) {
        paragraphs.push(current);
        current = [];
        charCount = 0;
      }
    }
    current.push(i);
    charCount += (cue[2] || "").length + 1;
  });
  if (current.length) paragraphs.push(current);
  return paragraphs;
}
