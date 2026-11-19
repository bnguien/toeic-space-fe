// Data core of the "Viết lại" mode (VideoRewrite): the letter-slot frame of one subtitle sentence and a typing turn.
import { buildTarget, type TargetWord, type WordGrade } from "@/shared/utils/dictation-check";

import { markSoundTokens } from "./subtitle-reading";

export const MISSES_TO_SHOW_MEANING = 2;
export const MISSES_TO_SHOW_ANSWER = 4;

export type RewriteTarget = TargetWord[];

/** Grade of a word left by Space/submit: `{ status: "ok" }` when right, else the full grade. */
export type RewriteMark = WordGrade | { status: "ok"; marks?: undefined; answerMarks?: undefined };

export type RewritePhase = "typing" | "correct" | "revealed";
export type RewriteStatus = "" | "clean" | "passed" | "revealed";

/** Typing state of one sentence; the reader keeps it per sentence index so scrolling never loses letters. */
export interface RewriteTurn {
  words: string[];
  cur: number;
  locked: boolean[];
  marks: (RewriteMark | null)[];
  attempts: number;
  hints: number;
  /** `"<word>:<slot>"` of hinted letters. */
  hinted: string[];
  liveFixes: number;
  phase: RewritePhase;
  status: RewriteStatus;
  reveal: WordGrade[] | null;
  peek: boolean;
}

/** Subtitle sentence → letter-slot frame (sound tokens like [Music], ♪ are not lyrics to write). */
export function buildRewriteSentence(text: string | null | undefined): RewriteTarget {
  const toks = String(text || "").split(" ");
  const sfx = markSoundTokens(toks);
  return buildTarget(toks.filter((_, i) => !sfx[i]).join(" "));
}

export function newTurn(n: number): RewriteTurn {
  return {
    words: Array<string>(n).fill(""),
    cur: 0,
    locked: Array<boolean>(n).fill(false),
    marks: Array<RewriteMark | null>(n).fill(null),
    attempts: 0,
    hints: 0,
    hinted: [],
    liveFixes: 0,
    phase: "typing",
    status: "",
    reveal: null,
    peek: false,
  };
}

export const isTurnDone = (t: RewriteTurn | null | undefined): boolean =>
  !!t && t.phase !== "typing";
