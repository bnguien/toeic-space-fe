/**
 * Pure logic of the bilingual news reader (no DOM): palettes, tokenizer, vocabulary matching, phrase spans,
 * karaoke timing marks, reading speed. Port of Studychill `newsReader.js` with English identifiers.
 */
import type {
  BrainHackModeKey,
  NewsParagraphDto,
  NewsVocabularyItemDto,
  TranslationMode,
} from "../types/news.types";

/**
 * Text palettes, a new random one on every open. Only text, underline and thin-line colours change; the page keeps
 * its paper. `ink` titles + emphasis, `accent` vocabulary underline + current sentence, `soft` faint lines;
 * the `*Dark` variants are for dark mode; `karaoke` is deliberately unlike `accent`.
 * "ink" is built from the TOEIC Space navy and mustard tokens.
 */
export interface ReaderPalette {
  key: string;
  name: string;
  ink: string;
  accent: string;
  soft: string;
  inkDark: string;
  accentDark: string;
  softDark: string;
  karaoke: string;
  karaokeDark: string;
}

export const READER_PALETTES: ReaderPalette[] = [
  {
    key: "moss",
    name: "Rêu",
    ink: "#1e3a2a",
    accent: "#5f8a1f",
    soft: "#d9e6c4",
    inkDark: "#a9c49a",
    accentDark: "#b5c27a",
    softDark: "#3a4236",
    karaoke: "#c2410c",
    karaokeDark: "#e0a27a",
  },
  {
    key: "ink",
    name: "Mực xanh",
    ink: "#34508f",
    accent: "#d6a329",
    soft: "#dde4f3",
    inkDark: "#b4c6f3",
    accentDark: "#dbb55a",
    softDark: "#363d4c",
    karaoke: "#c75b8a",
    karaokeDark: "#eba3c1",
  },
  {
    key: "terracotta",
    name: "Đất nung",
    ink: "#8f3b22",
    accent: "#b8741f",
    soft: "#ead8cb",
    inkDark: "#d7a690",
    accentDark: "#d6b38a",
    softDark: "#463a33",
    karaoke: "#0f766e",
    karaokeDark: "#86c4ba",
  },
  {
    key: "plum",
    name: "Mận chín",
    ink: "#5e2b5a",
    accent: "#c2457f",
    soft: "#e6d6e3",
    inkDark: "#cfa9c9",
    accentDark: "#d79ab6",
    softDark: "#433742",
    karaoke: "#15803d",
    karaokeDark: "#94c9a4",
  },
  {
    key: "ocean",
    name: "Biển sâu",
    ink: "#1c6560",
    accent: "#b8901a",
    soft: "#d2e4e0",
    inkDark: "#93c3bc",
    accentDark: "#d4bd7a",
    softDark: "#33403e",
    karaoke: "#c2410c",
    karaokeDark: "#e0a27a",
  },
  {
    key: "graphite",
    name: "Than chì",
    ink: "#2b2b2b",
    accent: "#b07d1e",
    soft: "#dedbd4",
    inkDark: "#d2ccc0",
    accentDark: "#cfae74",
    softDark: "#403d38",
    karaoke: "#1d4ed8",
    karaokeDark: "#9db3df",
  },
];

/** A random palette different from the previous one. */
export function pickPalette(
  previousKey: string | null | undefined,
  random = Math.random,
): ReaderPalette {
  const choices = READER_PALETTES.filter((x) => x.key !== previousKey);
  return choices[Math.floor(random() * choices.length) % choices.length];
}

export const TRANSLATION_MODES: Array<{ key: TranslationMode; name: string }> = [
  { key: "english", name: "Chỉ tiếng Anh" },
  { key: "bilingual", name: "Song ngữ" },
];

/** The three "Hack não" modes. Dictation is graded on the server. */
export const BRAIN_HACK_MODES: Array<{ key: BrainHackModeKey; name: string }> = [
  { key: "english", name: "Bật tiếng Anh" },
  { key: "vietnamese", name: "Chỉ đọc tiếng Việt" },
  { key: "dictation", name: "Nghe chép" },
];

export interface Token {
  text: string;
  isWord: boolean;
}

export interface MatchedToken extends Token {
  entry?: NewsVocabularyItemDto;
  inPhrase?: boolean;
}

/** Splits a sentence into tokens; a word is letters with apostrophes/hyphens, the rest is punctuation/space. */
export function splitWords(sentence: string): Token[] {
  const result: Token[] = [];
  const pattern = /[A-Za-z][A-Za-z'’-]*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sentence))) {
    if (match.index > cursor)
      result.push({ text: sentence.slice(cursor, match.index), isWord: false });
    result.push({ text: match[0], isWord: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < sentence.length) result.push({ text: sentence.slice(cursor), isWord: false });
  return result;
}

export const normalizeToken = (value: string | undefined | null): string =>
  String(value || "")
    .toLowerCase()
    .replace(/[’']s$/, "")
    .replace(/[^a-z'-]/g, "");

/** Common inflections (plural, -ed, -ing, -er) to recognise a vocabulary word in the text. */
export function wordForms(word: string): string[] {
  const w = normalizeToken(word);
  if (!w) return [];
  const stem = /e$/.test(w) ? w.slice(0, -1) : w;
  const y = /[^aeiou]y$/.test(w) ? w.slice(0, -1) : null;
  const forms = new Set([
    w,
    `${w}s`,
    `${w}es`,
    `${stem}ed`,
    `${stem}ing`,
    `${w}ed`,
    `${w}ing`,
    `${stem}er`,
    `${stem}ers`,
  ]);
  if (y) ["ies", "ied"].forEach((suffix) => forms.add(y + suffix));
  return [...forms];
}

export type VocabularyIndex = Map<string, NewsVocabularyItemDto>;

/** Word form → vocabulary item (single words only; phrases match through attachVocabulary). */
export function buildVocabularyIndex(vocabulary: NewsVocabularyItemDto[]): VocabularyIndex {
  const index: VocabularyIndex = new Map();
  vocabulary.forEach((item) => {
    if (/\s/.test(item.word.trim())) return;
    wordForms(item.word).forEach((form) => {
      if (!index.has(form)) index.set(form, item);
    });
  });
  return index;
}

/** Attaches vocabulary items to tokens; every token of a multi-word item gets it with `inPhrase`. */
export function attachVocabulary(
  tokens: Token[],
  vocabulary: NewsVocabularyItemDto[],
  index: VocabularyIndex = buildVocabularyIndex(vocabulary),
): MatchedToken[] {
  const result: MatchedToken[] = tokens.map((x) => ({
    ...x,
    entry: x.isWord ? index.get(normalizeToken(x.text)) : undefined,
  }));
  vocabulary
    .filter((item) => /\s/.test(item.word.trim()))
    .forEach((item) => {
      const parts = item.word.toLowerCase().split(/\s+/);
      const wordPositions = result.map((x, i) => (x.isWord ? i : -1)).filter((i) => i >= 0);
      for (let k = 0; k + parts.length <= wordPositions.length; k += 1) {
        const matches = parts.every((part, j) =>
          wordForms(part).includes(normalizeToken(result[wordPositions[k + j]].text)),
        );
        if (matches) {
          for (let i = wordPositions[k]; i <= wordPositions[k + parts.length - 1]; i += 1) {
            result[i] = { ...result[i], entry: item, inPhrase: true };
          }
        }
      }
    });
  return result;
}

/** Occurrences of every vocabulary item in the whole article: {word: n}. */
export function countOccurrences(
  paragraphs: NewsParagraphDto[],
  vocabulary: NewsVocabularyItemDto[],
): Record<string, number> {
  const index = buildVocabularyIndex(vocabulary);
  const counts: Record<string, number> = Object.fromEntries(
    vocabulary.map((item) => [item.word, 0]),
  );
  paragraphs.forEach((paragraph) =>
    paragraph.sentences.forEach((sentence) => {
      const seen = new Set<string>();
      attachVocabulary(splitWords(sentence.text), vocabulary, index).forEach((x, i, all) => {
        if (!x.entry) return;
        if (x.inPhrase && i > 0 && all[i - 1].entry === x.entry) return; // a phrase counts once
        const key = `${x.entry.word}@${i}`;
        if (!seen.has(key)) {
          seen.add(key);
          counts[x.entry.word] += 1;
        }
      });
    }),
  );
  return counts;
}

export const countArticleWords = (paragraphs: NewsParagraphDto[]): number =>
  paragraphs.reduce(
    (n, paragraph) =>
      n +
      paragraph.sentences.reduce(
        (m, s) => m + splitWords(s.text).filter((x) => x.isWord).length,
        0,
      ),
    0,
  );

/** 125 → "2:05"; 3725 → "1:02:05". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Words per minute over the part read; under 20 seconds is not enough to measure. */
export function readingSpeed(wordCount: number, percent: number, seconds: number): number {
  if (seconds < 20) return 0;
  return Math.round((wordCount * Math.min(1, percent / 100)) / (seconds / 60));
}

/** Speed against the TOEIC Part 7 mark (~150 words/minute is enough to finish on time). */
export function speedComment(wpm: number): string {
  if (!wpm) return "Đang đo…";
  if (wpm < 90) return "Chậm — đọc kỹ là tốt, luyện thêm để kịp giờ";
  if (wpm < 150) return "Khá — gần mốc TOEIC Part 7";
  if (wpm < 250) return "Tốt — đủ nhanh cho Part 7";
  return "Rất nhanh — kiểm tra lại mức hiểu bài";
}

/** Side panel width (px) within 260 px .. half of the frame. */
export const clampPanelWidth = (px: number, frameWidth: number): number =>
  Math.round(Math.min(Math.max(px, 260), Math.max(260, frameWidth * 0.5)));

/** Two-column layout: English column width in percent (30..70). */
export const clampSplit = (value: number): number => Math.round(Math.min(70, Math.max(30, value)));

export interface IndexedWord {
  text: string;
  at: number;
  /** Pause after the word (ms at 1×) because of the punctuation that follows. */
  pause: number;
}

export interface PhraseSpan {
  from: number;
  to: number;
  text: string;
}

/**
 * Phrase merge on lookup: the word just looked up (index `i`) touching other looked-up words of the same sentence
 * (only whitespace between) → the 2–5 word span to look up as a whole (collocation, phrasal verb, idiom); else null.
 */
export function findPhraseSpan(
  words: IndexedWord[],
  sentence: string,
  selected: Set<number>,
  i: number,
  maxWords = 5,
): PhraseSpan | null {
  const adjacent = (j: number) =>
    j >= 0 &&
    j + 1 < words.length &&
    /^\s+$/.test(sentence.slice(words[j].at + words[j].text.length, words[j + 1].at));
  let from = i;
  let to = i;
  while (from - 1 >= 0 && selected.has(from - 1) && adjacent(from - 1) && to - from + 1 < maxWords)
    from -= 1;
  while (to + 1 < words.length && selected.has(to + 1) && adjacent(to) && to - from + 1 < maxWords)
    to += 1;
  if (to === from) return null;
  return { from, to, text: sentence.slice(words[from].at, words[to].at + words[to].text.length) };
}

/** Pause (ms at 1×) after punctuation — the real voice stops there, so karaoke stops too. */
export function pauseAfter(text: string): number {
  if (/[.!?…]/.test(text)) return 420;
  if (/[;:—–]/.test(text)) return 300;
  if (/[,()"“”]/.test(text)) return 220;
  return 0;
}

/** Words of a sentence with their start offset and the pause that follows each. */
export function indexSentence(sentence: string): IndexedWord[] {
  const words: IndexedWord[] = [];
  let position = 0;
  splitWords(sentence).forEach((x) => {
    if (x.isWord) words.push({ text: x.text, at: position, pause: 0 });
    else if (words.length) {
      const last = words[words.length - 1];
      last.pause = Math.max(last.pause, pauseAfter(x.text));
    }
    position += x.text.length;
  });
  return words;
}

/** "đợt thử nghiệm, phép thử" → "đợt thử nghiệm" (≤ 22 characters) to sit above a word. */
export const shortMeaning = (meaning: string | undefined, max = 22): string => {
  const text = String(meaning || "")
    .split(/[,;(]/)[0]
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};
