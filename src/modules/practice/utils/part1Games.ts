/**
 * Part 1 practice games (port of StudyChill `part1-games/part1Games.js`): "Đúng hay Sai" and
 * "Điền từ khoá". The four Part 1 statements ARE the audio script, so every helper only reads text
 * of a question that has been revealed (checked). Pure.
 */
import type { AnswerOption } from "../types/practice-exam.types.ts";
import type { GroupQuestion } from "./attemptGroups.ts";

export type Part1GameMode = "classic" | "truefalse" | "keyword";

export interface Part1GameModeMeta {
  id: Part1GameMode;
  title: string;
  description: string;
  level: string;
}

/** "Luyện theo kiểu nào?" choices of the Part 1 setup step. */
export const PART1_GAME_MODES: readonly Part1GameModeMeta[] = [
  {
    id: "classic",
    title: "Thi thật A–D",
    description: "Nhìn tranh, nghe 4 câu rồi chọn A, B, C hoặc D như phòng thi.",
    level: "Quen đề",
  },
  {
    id: "truefalse",
    title: "Đúng hay Sai",
    description: "Nghe từng câu A–D, bấm Đúng hoặc Sai so với tranh. Chỉ một câu Đúng.",
    level: "Người mới",
  },
  {
    id: "keyword",
    title: "Điền từ khoá",
    description: "Chọn đáp án xong, nghe lại và chọn từ khoá còn thiếu cho cả 4 câu.",
    level: "Người mới",
  },
];

export const part1GameMode = (id: string | null | undefined) =>
  PART1_GAME_MODES.find((mode) => mode.id === id) ?? PART1_GAME_MODES[0];

const KEYS: readonly AnswerOption[] = ["A", "B", "C", "D"];

export interface Part1Statement {
  key: AnswerOption;
  text: string;
  /** Vietnamese translation from the explanation's "Dịch nghĩa" block, if any. */
  vi: string;
}

function htmlToLines(html: string): string[] {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** "(A) … (B) …" → { A: "…", B: "…" }. */
export function splitLettered(lines: readonly string[]): Partial<Record<AnswerOption, string>> {
  const out: Partial<Record<AnswerOption, string>> = {};
  const joined = lines.join("\n");
  const pattern = /\(([A-D])\)\s*([\s\S]*?)(?=\n?\([A-D]\)|$)/g;
  for (const match of joined.matchAll(pattern)) {
    const text = match[2].replace(/\s+/g, " ").trim();
    if (text) out[match[1] as AnswerOption] = text;
  }
  return out;
}

/** Option translations found in the explanation's `tp-exp-trans-body` block. */
export function translationsOf(explanation: string | null | undefined) {
  const html = explanation ?? "";
  const at = html.indexOf("tp-exp-trans-body");
  if (at === -1) return {};
  const start = html.indexOf(">", at) + 1;
  const end = html.indexOf("</div>", start);
  return splitLettered(htmlToLines(html.slice(start, end === -1 ? undefined : end)));
}

/**
 * The four statements of a revealed Part 1 question (option text first, then the transcript).
 * Returns [] before the reveal so nothing of the audio leaks.
 */
export function statementsOf(question: GroupQuestion): Part1Statement[] {
  if (!question.reveal) return [];
  const fromTranscript = splitLettered(htmlToLines(question.reveal.transcript ?? ""));
  const vi = translationsOf(question.reveal.explanation);
  return KEYS.flatMap((key) => {
    const option = question.options.find((o) => o.key === key)?.text ?? "";
    const text = (option || fromTranscript[key] || "").trim();
    return text && !/^(Option )?[A-D]$/.test(text) ? [{ key, text, vi: vi[key] ?? "" }] : [];
  });
}

/* ---- Đúng hay Sai ---- */

export type TrueFalseMarks = Partial<Record<AnswerOption, boolean>>;

/** Validation message of the true/false marks (exactly one "Đúng"), or null when valid. */
export function trueFalseError(marks: TrueFalseMarks): string | null {
  const trues = Object.values(marks).filter(Boolean).length;
  if (trues > 1) return "Part 1 chỉ có một câu đúng. Bỏ bớt một câu Đúng nhé.";
  if (trues === 0) return "Chưa có câu nào Đúng. Chọn một câu mô tả đúng bức tranh.";
  return null;
}

/** Answer implied by the marks (the single "Đúng"), or null. */
export const trueFalseAnswer = (marks: TrueFalseMarks): AnswerOption | null =>
  trueFalseError(marks) ? null : (KEYS.find((key) => marks[key]) ?? null);

/** How many of the statements were judged right (unmarked counts as "Sai"). */
export function trueFalseScore(
  statements: readonly Part1Statement[],
  marks: TrueFalseMarks,
  correct: AnswerOption,
) {
  return statements.filter((s) => Boolean(marks[s.key]) === (s.key === correct)).length;
}

/* ---- Điền từ khoá ---- */

const FUNCTION_WORDS = new Set([
  "the",
  "a",
  "an",
  "are",
  "is",
  "was",
  "were",
  "been",
  "being",
  "have",
  "has",
  "had",
  "of",
  "on",
  "in",
  "at",
  "to",
  "by",
  "for",
  "with",
  "from",
  "into",
  "onto",
  "over",
  "under",
  "near",
  "next",
  "their",
  "there",
  "they",
  "them",
  "this",
  "that",
  "these",
  "those",
  "one",
  "other",
  "each",
  "both",
  "his",
  "her",
  "its",
  "and",
  "man",
  "woman",
  "men",
  "women",
  "people",
  "person",
  "while",
  "some",
  "several",
  "around",
  "across",
  "beside",
  "between",
  "behind",
  "along",
  "toward",
  "towards",
  "through",
  "against",
  "outside",
  "inside",
  "up",
  "down",
]);

export const foldWord = (word: string) => word.toLowerCase().replace(/[^a-z0-9'-]/g, "");

export interface WordToken {
  lead: string;
  word: string;
  trail: string;
}

/** Splits a sentence into tokens that keep their punctuation, so it can be rebuilt. */
export function tokenize(text: string): WordToken[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const match = /^([^A-Za-z0-9]*)([\s\S]*?)([^A-Za-z0-9]*)$/.exec(raw);
      return { lead: match?.[1] ?? "", word: match?.[2] || raw, trail: match?.[3] ?? "" };
    });
}

/**
 * One keyword per statement: the longest content word (no function words, no apostrophes),
 * not already used by another statement. Returns statement key → token index.
 */
export function pickKeywords(statements: readonly Pick<Part1Statement, "key" | "text">[]) {
  const used = new Set<string>();
  const out: Partial<Record<AnswerOption, number>> = {};
  for (const statement of statements) {
    const tokens = tokenize(statement.text).map((t, i) => ({ i, w: foldWord(t.word) }));
    const ranked = tokens
      .filter((t) => t.w.length >= 4 && !FUNCTION_WORDS.has(t.w) && !t.w.includes("'"))
      .sort((a, b) => b.w.length - a.w.length || b.i - a.i);
    const pick =
      ranked.find((t) => !used.has(t.w)) ??
      ranked[0] ??
      [...tokens].sort((a, b) => b.w.length - a.w.length)[0];
    if (pick) {
      used.add(pick.w);
      out[statement.key] = pick.i;
    }
  }
  return out;
}

/** Keyword (as written) of each statement. */
export function keywordsOf(statements: readonly Pick<Part1Statement, "key" | "text">[]) {
  const slots = pickKeywords(statements);
  const out: Partial<Record<AnswerOption, string>> = {};
  for (const s of statements) {
    const index = slots[s.key];
    if (index !== undefined) out[s.key] = tokenize(s.text)[index]?.word ?? "";
  }
  return out;
}

/** Deterministic shuffle seeded by a string (question id): the order never changes per render. */
export function seededShuffle<T>(list: readonly T[], seed: string): T[] {
  let hash = 2166136261;
  for (const ch of seed) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507) >>> 0;
    const j = hash % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface WordChip {
  id: string;
  word: string;
}

/**
 * Word bank of a question: its own keywords plus up to 2 distractors (keywords of other revealed
 * questions, never equal to an own keyword), shuffled stably by the question id.
 */
export function buildWordBank(
  questionId: string,
  statements: readonly Pick<Part1Statement, "key" | "text">[],
  distractorPool: readonly string[],
): WordChip[] {
  const own = Object.values(keywordsOf(statements)).filter((w): w is string => Boolean(w));
  const ownFolded = new Set(own.map(foldWord));
  const extra: string[] = [];
  for (const word of distractorPool) {
    const folded = foldWord(word);
    if (!folded || ownFolded.has(folded) || extra.some((w) => foldWord(w) === folded)) continue;
    extra.push(word);
    if (extra.length === 2) break;
  }
  return seededShuffle(
    [...own, ...extra].map((word, i) => ({ id: `${i}:${word}`, word })),
    questionId,
  );
}

/** Distractor pool for a question: keywords of the other revealed Part 1 questions. */
export function distractorPool(questionId: string, questions: readonly GroupQuestion[]) {
  const pool: string[] = [];
  for (const other of questions) {
    if (other.id === questionId || !other.reveal) continue;
    pool.push(...Object.values(keywordsOf(statementsOf(other))).filter((w): w is string => !!w));
    if (pool.length > 24) break;
  }
  return seededShuffle(pool, `${questionId}:d`);
}

/** Whether a filled word matches the keyword (case and punctuation ignored). */
export const keywordMatches = (filled: string, keyword: string) =>
  foldWord(filled) === foldWord(keyword) && foldWord(keyword) !== "";
