/**
 * Grading core of the dictation screens: splits a sentence into letter slots, takes the typed text
 * WORD BY WORD, grades it and builds hints. Pure TypeScript (no React).
 *
 * The target sentence is split on whitespace; inside each word only letters/digits are slots to type,
 * punctuation, apostrophes and hyphens are shown ("don't" → d o n ' t, typing "dont" or "don't" both
 * work). Comparison ignores case and diacritics (café = cafe).
 *
 * Ported from Studychill `features/dictation/dictationCheck.js`; names and behaviour are unchanged.
 */

const SLOT = /[\p{L}\p{N}]/u;

export interface TargetPart {
  ch: string;
  slot: boolean;
  /** Position among the typeable slots of the word (slots only). */
  idx?: number;
}

export interface TargetWord {
  raw: string;
  parts: TargetPart[];
  /** Folded slot letters; null while the server has not revealed the answer (skeleton). */
  answer: string | null;
  size: number;
  /** Server-graded word: apostrophes and hyphens inside the word are typed too. */
  loose?: boolean;
}

export type WordStatus = "ok" | "wrong" | "missing";

export interface WordGrade {
  status: WordStatus;
  /** Per typed letter: true = the letter is in the answer in order. */
  marks: boolean[];
  /** Per answer letter: true = the learner heard it. */
  answerMarks: boolean[];
  /** Letters typed beyond the word length. */
  extra: number;
}

export interface SkeletonWord {
  before?: string;
  len: number;
  after?: string;
}

export const isSlotChar = (ch: string): boolean => SLOT.test(ch);

/** One character in comparison form: lower case, no diacritics. */
export function fold(ch: string): string {
  return String(ch).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Keeps only the letters/digits of what the learner typed (punctuation and apostrophes are shown). */
export function onlySlots(text: string | null | undefined): string {
  return [...String(text || "").normalize("NFC")].filter(isSlotChar).join("");
}

/**
 * Target sentence → [{ raw, parts: [{ ch, slot }], answer }]; answer = the folded slots of the word.
 * Words made of punctuation only (" - ", "&") have no slot and are dropped: nothing to type.
 */
export function buildTarget(text: string | null | undefined): TargetWord[] {
  return String(text || "")
    .normalize("NFC")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      let k = 0;
      // idx = order of the typeable slot inside the word, so slots can be drawn without recounting.
      const parts: TargetPart[] = [...raw].map((ch) =>
        isSlotChar(ch) ? { ch, slot: true, idx: k++ } : { ch, slot: false },
      );
      const answer = parts
        .filter((p) => p.slot)
        .map((p) => fold(p.ch))
        .join("");
      return { raw, parts, answer, size: answer.length };
    })
    .filter((w) => w.size > 0);
}

/*
 * Server-graded sentences: the server treats apostrophes and hyphens inside a word as part of it
 * ("don't" = 5 slots) and only strips leading/trailing punctuation. Before the first submission the
 * client only has the sentence SKELETON (punctuation before, slot count, punctuation after), never the
 * answer letters; after submitting, the server returns the correct sentence.
 */
const SERVER_LEAD = /^[^0-9a-zA-ZÀ-ɏ']+/;
const SERVER_TAIL = /[^0-9a-zA-ZÀ-ɏ']+$/;
const LOOSE_SLOT = /[\p{L}\p{N}'-]/u;

function serverWord(before: string, core: string[], after: string): TargetWord {
  let k = 0;
  const parts: TargetPart[] = [
    ...[...before].map((ch) => ({ ch, slot: false })),
    ...core.map((ch) => ({ ch, slot: true, idx: k++ })),
    ...[...after].map((ch) => ({ ch, slot: false })),
  ];
  const known = core.every(Boolean);
  return {
    raw: `${before}${core.join("")}${after}`,
    parts,
    answer: known ? core.map(fold).join("") : null,
    size: core.length,
    loose: true,
  };
}

/** Sentence frame from /skeleton ([{ before, len, after }]): slot counts, no letters. */
export function buildSkeletonTarget(skeleton: SkeletonWord[] | null | undefined): TargetWord[] {
  return (skeleton || [])
    .filter((w) => w.len > 0)
    .map((w) => serverWord(w.before || "", Array<string>(w.len).fill(""), w.after || ""));
}

/** Correct sentence returned after submitting → same frame as buildSkeletonTarget, with letters. */
export function buildServerTarget(text: string | null | undefined): TargetWord[] {
  return String(text || "")
    .normalize("NFC")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const before = (raw.match(SERVER_LEAD) || [""])[0];
      const rest = raw.slice(before.length);
      const after = (rest.match(SERVER_TAIL) || [""])[0];
      return serverWord(before, [...rest.slice(0, rest.length - after.length)], after);
    })
    .filter((w) => w.size > 0);
}

/** Extra slots allowed after the real word length: enough to see the overflow, never a line break. */
export const OVERFLOW = 3;

export function clampWord(word: string | null | undefined, target: TargetWord): string {
  const chars = target.loose
    ? [
        ...String(word || "")
          .normalize("NFC")
          .replace(/[‘’]/g, "'"),
      ]
        .filter((ch) => LOOSE_SLOT.test(ch))
        .join("")
    : onlySlots(word);
  return chars.slice(0, target.size + OVERFLOW);
}

export interface InputState {
  words: string[];
  cur: number;
  locked: boolean[];
  target: TargetWord[];
}

/**
 * Takes the new value of the hidden input (which only holds the current word). Whitespace means the
 * learner pressed Space or pasted a sentence: the part before belongs to the current word, the rest is
 * spread over the next words (skipping words already locked correct). Returns { words, cur }.
 */
export function receiveInput(
  { words, cur, locked, target }: InputState,
  value: string,
): { words: string[]; cur: number } {
  const next = [...words];
  // Empty current word and the input starts with whitespace: drop it, do not jump.
  const pieces = (words[cur] ? String(value) : String(value).trimStart()).split(/\s+/);
  let at = cur;
  next[at] = clampWord(pieces[0], target[at]);
  for (let k = 1; k < pieces.length; k += 1) {
    const to = nextOpen(at, locked, target.length);
    if (to === -1) break;
    // Space at the end of an empty word does not jump: a double Space never skips a word.
    if (!next[at] && !pieces[k]) break;
    at = to;
    if (pieces[k]) next[at] = clampWord(pieces[k], target[at]);
  }
  return { words: next, cur: at };
}

/** Next unlocked word after `from` (−1 when none). */
export function nextOpen(from: number, locked: boolean[], count: number): number {
  for (let i = from + 1; i < count; i += 1) if (!locked[i]) return i;
  return -1;
}

export function prevOpen(from: number, locked: boolean[]): number {
  for (let i = from - 1; i >= 0; i -= 1) if (!locked[i]) return i;
  return -1;
}

export function firstOpen(locked: boolean[], count: number): number {
  for (let i = 0; i < count; i += 1) if (!locked[i]) return i;
  return -1;
}

/**
 * Matches two letter sequences by their longest common subsequence: returns the matched positions on
 * each side. Typing "coked" for "cooked" then only misses one "o" instead of painting the tail red.
 */
function lcsMatch(a: string[], b: string[]): [Set<number>, Set<number>] {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const inA = new Set<number>();
  const inB = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      inA.add(i);
      inB.add(j);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i += 1;
    else j += 1;
  }
  return [inA, inB];
}

/**
 * Grades every word: 'ok' | 'wrong' | 'missing', with
 *  - marks: per TYPED letter (true = in the answer, in order) to paint wrong letters red;
 *  - answerMarks: per ANSWER letter (true = heard) to paint the missed letters when revealing;
 *  - extra: letters typed beyond the word length.
 */
export function gradeWords(words: string[], target: TargetWord[]): WordGrade[] {
  return target.map((t, i) => {
    const typed = [...fold(words[i] || "")];
    const answer = [...(t.answer || "")];
    if (!typed.length) {
      return {
        status: "missing",
        marks: [],
        answerMarks: Array<boolean>(t.size).fill(false),
        extra: 0,
      };
    }
    const [inTyped, inAnswer] = lcsMatch(typed, answer);
    const ok = typed.length === answer.length && inTyped.size === answer.length;
    return {
      status: ok ? "ok" : "wrong",
      marks: typed.map((_, k) => inTyped.has(k)),
      answerMarks: answer.map((_, k) => inAnswer.has(k)),
      extra: Math.max(0, typed.length - answer.length),
    };
  });
}

export const allCorrect = (grades: WordGrade[]): boolean =>
  grades.length > 0 && grades.every((g) => g.status === "ok");

/** Whether a finished word (the learner left it) is right — used by the live check. */
export const wordIsRight = (word: string | null | undefined, t: TargetWord): boolean =>
  fold(word || "") === t.answer;

/**
 * Hint: keeps the correct start of the word and reveals `letters` more (Infinity = whole word).
 * Returns { word, revealed: [revealed slot positions] } using the original casing of the sentence.
 */
export function hintWord(
  word: string | null | undefined,
  t: TargetWord,
  letters = 1,
): { word: string; revealed: number[] } {
  const typed = [...fold(word || "")];
  const answer = [...(t.answer || "")];
  let keep = 0;
  while (keep < typed.length && keep < answer.length && typed[keep] === answer[keep]) keep += 1;
  const upto = Math.min(answer.length, keep + letters);
  const original = t.parts.filter((p) => p.slot).map((p) => p.ch);
  const revealed: number[] = [];
  for (let k = keep; k < upto; k += 1) revealed.push(k);
  return { word: original.slice(0, upto).join(""), revealed };
}

/** Letters in the whole sentence — shown in the status line ("6 từ · 27 chữ cái"). */
export const letterCount = (target: TargetWord[]): number => target.reduce((n, t) => n + t.size, 0);

export interface Mistake {
  expected: string;
  typed: string;
}

/**
 * Mistake pairs to study after the sentence: [{ expected, typed }] from the FIRST submission (the most
 * natural errors, before any hint). An empty word records typed = ''.
 */
export function mistakesOf(words: string[], target: TargetWord[]): Mistake[] {
  return target
    .map((t, i) => ({
      expected: t.raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""),
      typed: words[i] || "",
      right: wordIsRight(words[i], t),
    }))
    .filter((m) => !m.right)
    .map(({ expected, typed }) => ({ expected, typed }));
}

/** Stars of a stage: share of sentences passed "clean" (first try, no hint). A finished stage has ≥ 1 star. */
export function starsFor(
  results: Record<string, { status?: string } | undefined>,
  total: number,
): number {
  if (!total) return 1;
  const clean = Object.values(results).filter((r) => r?.status === "clean").length;
  const ratio = clean / total;
  return ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
}

/** Seconds → "mm:ss" or "h:mm:ss". */
export function formatClock(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${String(m).padStart(2, "0")}:${sec}`;
}

/** Vietnamese diacritics in the input → a Vietnamese IME is most likely on. */
export const looksVietnameseIme = (text: string | null | undefined): boolean =>
  /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(String(text || ""));
