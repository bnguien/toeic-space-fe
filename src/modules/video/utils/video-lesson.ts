// Data of the word card and the end-of-video summary (pure).
import type { Cue, GlossEntryDto } from "../types/video.types";
import { cleanToken, markSoundTokens, wordTier, type WordTierKey } from "./subtitle-reading";

const TIER_SCORES: Record<WordTierKey, number> = { c1: 3, b2: 2, toeic: 1 };
export const PRESELECTED_HARD_WORDS = 6;
const MAX_ENCOUNTERED_WORDS = 14;

const POS_LABELS: Record<string, string> = {
  noun: "danh từ",
  n: "danh từ",
  verb: "động từ",
  v: "động từ",
  adjective: "tính từ",
  adj: "tính từ",
  adverb: "trạng từ",
  adv: "trạng từ",
  preposition: "giới từ",
  prep: "giới từ",
  pronoun: "đại từ",
  conjunction: "liên từ",
  interjection: "thán từ",
  determiner: "từ hạn định",
  phrase: "cụm từ",
  other: "",
};
const POS_SHORT: Record<string, string> = {
  noun: "n",
  n: "n",
  verb: "v",
  v: "v",
  adjective: "adj",
  adj: "adj",
  adverb: "adv",
  adv: "adv",
  preposition: "prep",
  prep: "prep",
  phrase: "phr",
};

const posKey = (pos: string | null | undefined): string =>
  String(pos || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "");

/** "adjective" → "adj", "phrasal verb" → "phr v" — short label next to the phonetic on the subtitle (narrow). */
export function shortPos(pos: string | null | undefined): string {
  const k = posKey(pos);
  if (k in POS_SHORT) return POS_SHORT[k];
  if (k.startsWith("phrasal")) return "phr v";
  return k.length > 6 ? k.slice(0, 5) : k;
}

export function posLabel(pos: string | null | undefined): string {
  const k = posKey(pos);
  return k in POS_LABELS ? POS_LABELS[k] : k;
}

/** "ngăn cản, ngăn chặn, ngăn ngừa; phòng" → { primary: "ngăn cản, ngăn chặn", others: "ngăn ngừa, phòng" }.
 *  Drops "meanings" that are just the English word (machine translation echo: draws → "Draws"). */
export function splitMeanings(
  vi: string | null | undefined,
  primaryCount = 2,
  word = "",
): { primary: string; others: string } {
  const excludedWord = String(word || "")
    .trim()
    .toLowerCase();
  const parts = String(vi || "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s && s.toLowerCase() !== excludedWord);
  return {
    primary: parts.slice(0, primaryCount).join(", "),
    others: parts.slice(primaryCount).join(", "),
  };
}

/** First English definition, without the "(verb) " label the gloss puts in front. */
export function firstDefinition(en: string | null | undefined): string {
  const firstPart = String(en || "")
    .split(" · ")[0]
    .trim();
  return firstPart.replace(/^\([a-z ]+\)\s*/i, "");
}

export interface SentencePart {
  text: string;
  on: boolean;
}

/** Splits a sentence into pieces to highlight the studied word (case-insensitive, whole word). */
export function highlightWordInSentence(
  sentence: string | null | undefined,
  word: string | null | undefined,
): SentencePart[] {
  const s = String(sentence || "");
  const w = String(word || "").trim();
  if (!s || !w) return [{ text: s, on: false }];
  const re = new RegExp(
    `(^|[^A-Za-z'])(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?=[^A-Za-z']|$)`,
    "gi",
  );
  const parts: SentencePart[] = [];
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const matchStart = m.index + m[1].length;
    if (matchStart > lastEnd) parts.push({ text: s.slice(lastEnd, matchStart), on: false });
    parts.push({ text: m[2], on: true });
    lastEnd = matchStart + m[2].length;
  }
  if (lastEnd < s.length) parts.push({ text: s.slice(lastEnd), on: false });
  return parts.length ? parts : [{ text: s, on: false }];
}

/** A word saved in this video or opened on the card ("pinned" in the summary). */
export interface PinnedWord {
  word?: string;
  cue?: Cue | null;
  saved?: boolean;
}

export interface LessonWordItem {
  /** Lowercase key. */
  k: string;
  /** Display form. */
  word: string;
  cefr: string;
  tier: WordTierKey | "";
  cue: Cue | null;
  /** Cue index of the first occurrence (−1 = not in the watched part). */
  i: number;
  saved: boolean;
  pinned: boolean;
  preselected: boolean;
  /** Known meaning (e.g. from the library) used when the gloss has none. */
  meaning?: string;
}

interface Encounter {
  k: string;
  word: string;
  cue: Cue;
  i: number;
  count: number;
}

export interface LessonWordsInput {
  /** Subtitle cues [[start, dur, text], …]. */
  cues?: Cue[];
  /** Furthest watched cue index (−1 = not watched: take the whole lesson). */
  lastCueIndex?: number;
  /** {word: CEFR} returned with the subtitles. */
  levels?: Record<string, string>;
  /** key → { word, cue, saved } of words saved in this video or opened on the card. */
  pinned?: Map<string, PinnedWord>;
}

/**
 * Lesson vocabulary: words saved/opened in this lesson first, then tiered words (C1+ > B2 > TOEIC) that appeared in
 * the watched part.
 */
export function lessonWords({
  cues = [],
  lastCueIndex = -1,
  levels = {},
  pinned = new Map(),
}: LessonWordsInput = {}): LessonWordItem[] {
  const endIndex = lastCueIndex >= 0 ? Math.min(cues.length - 1, lastCueIndex) : cues.length - 1;
  const seen = new Map<string, Encounter>();
  for (let i = 0; i <= endIndex; i += 1) {
    const toks = String(cues[i][2] || "").split(" ");
    const sfx = markSoundTokens(toks);
    toks.forEach((tok, j) => {
      if (sfx[j]) return;
      const cleanWord = cleanToken(tok);
      const k = cleanWord.toLowerCase();
      if (!k) return;
      const g = seen.get(k);
      if (g) {
        g.count += 1;
        return;
      }
      seen.set(k, { k, word: k, cue: cues[i], i, count: 1 });
    });
  }
  const result: LessonWordItem[] = [];
  pinned.forEach((v, k) => {
    const g = seen.get(k);
    const cefr = levels[k] || "";
    result.push({
      k,
      word: v.word || (g && g.word) || k,
      cefr,
      tier: wordTier(cefr),
      cue: v.cue || (g && g.cue) || null,
      i: g ? g.i : -1,
      saved: !!v.saved,
      pinned: true,
      preselected: true,
    });
  });
  const hardWords = [...seen.values()]
    .filter((g) => !pinned.has(g.k) && wordTier(levels[g.k]))
    .map((g) => ({ ...g, cefr: levels[g.k], tier: wordTier(levels[g.k]) as WordTierKey }))
    .sort((a, b) => TIER_SCORES[b.tier] - TIER_SCORES[a.tier] || b.count - a.count || a.i - b.i)
    .slice(0, MAX_ENCOUNTERED_WORDS);
  hardWords.forEach((g, n) => {
    result.push({
      k: g.k,
      word: g.word,
      cefr: g.cefr,
      tier: g.tier,
      cue: g.cue,
      i: g.i,
      saved: false,
      pinned: false,
      preselected: n < PRESELECTED_HARD_WORDS,
    });
  });
  return result;
}

export interface ReelCard {
  word: string;
  meaning: string;
  phonetic: string;
  partOfSpeech: string;
  example: string;
  exampleVi: string;
}

/** Summary items → study cards ({word, meaning, phonetic, pos, example, exampleVi}); example = the video sentence. */
export function toReelCards(
  items: readonly LessonWordItem[] | null | undefined,
  gloss: Record<string, Partial<GlossEntryDto>> = {},
  translationOf: (item: LessonWordItem) => string = () => "",
): ReelCard[] {
  return (items || [])
    .map((it): ReelCard | null => {
      const g = gloss[it.k] || {};
      const meaning = splitMeanings(g.meaning || it.meaning || "", 3, it.k).primary;
      if (!meaning) return null;
      const example = it.cue ? it.cue[2] : "";
      const exampleTranslation = it.cue ? translationOf(it) || "" : "";
      return {
        word: it.word || it.k,
        meaning,
        phonetic: g.ipa || "",
        partOfSpeech: POS_SHORT[String(g.partOfSpeech || "").toLowerCase()] || "",
        example,
        // YouTube's auto-translated track sometimes keeps the English line: treat it as no translation.
        exampleVi:
          exampleTranslation.trim().toLowerCase() === example.trim().toLowerCase()
            ? ""
            : exampleTranslation,
      };
    })
    .filter((card): card is ReelCard => card !== null);
}

/** 754 seconds → "13 phút"; under a minute → "dưới 1 phút". */
export function formatLessonDuration(seconds: number | null | undefined): string {
  const p = Math.round((seconds || 0) / 60);
  if (p < 1) return "dưới 1 phút";
  if (p < 60) return `${p} phút`;
  return `${Math.floor(p / 60)} giờ ${p % 60 ? `${p % 60} phút` : ""}`.trim();
}
