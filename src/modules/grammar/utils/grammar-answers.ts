/**
 * Grammar answers in the browser (pure): converts what the UI keeps into the API `value`
 * (toeic-space-be/docs/grammar.md) and detects blanks. No grading — the answers live on the server.
 * Port of Studychill `grammarAnswers.js`.
 *
 * UI answers per kind:
 *   mcq5/pair990: 'A'…'D' · wordform/transform: string · error: { label, correction } · order: [piece index…]
 *   parse: [label…] · match: [right letter per left item] · judge: { verdict: 'correct'|'incorrect', reason }
 *   cloze6: { 1: 'A', 2: 'C', … } (by position)
 */
import type {
  ClozeAnswer,
  ErrorAnswer,
  GrammarQuestion,
  GrammarSubQuestion,
  JudgeAnswer,
  QuestionAnswer,
} from "../types/exercise.types";

/** Normalises two typings for comparison: lower case, curly → straight quotes, collapsed spaces, no final punctuation. */
export function normalizeTyped(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+([,.;:?!])/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.?!]+$/, "")
    .trim();
}

/** Sentence built from the order pieces the learner picked. */
export const orderSentence = (q: GrammarQuestion, indices: number[] = []): string =>
  indices.map((i) => (q.pieces || [])[i]).join(" ");

const isBlank = (v: unknown): boolean => v === undefined || v === null || String(v).trim() === "";

/** Scored questions of an item still blank (reminder before submitting). */
export function countUnanswered(q: GrammarQuestion, ans: QuestionAnswer): number {
  switch (q.kind) {
    case "cloze6":
      return (q.subQuestions || []).filter((s) => isBlank(((ans || {}) as ClozeAnswer)[s.position]))
        .length;
    case "error":
      return !ans || isBlank((ans as ErrorAnswer).label) ? 1 : 0;
    case "order":
      return ((ans as number[] | undefined) || []).length ? 0 : 1;
    case "parse":
    case "match":
      return Array.isArray(ans) &&
        (ans as unknown[]).filter((x) => !isBlank(x)).length === (q.segments || q.left || []).length
        ? 0
        : 1;
    case "judge":
      return !ans || isBlank((ans as JudgeAnswer).verdict) || isBlank((ans as JudgeAnswer).reason)
        ? 1
        : 0;
    default:
      return isBlank(ans) ? 1 : 0;
  }
}

/** `value` sent to the server for a single question (not cloze6); blank → null. */
export function answerValue(q: GrammarQuestion, ans: QuestionAnswer): unknown {
  if (countUnanswered(q, ans)) return null;
  switch (q.kind) {
    case "error":
      return {
        part: (ans as ErrorAnswer).label,
        correction: String((ans as ErrorAnswer).correction ?? ""),
      };
    case "judge":
      return { verdict: (ans as JudgeAnswer).verdict, reason: (ans as JudgeAnswer).reason };
    case "order":
    case "parse":
    case "match":
      return [...(ans as unknown[])];
    default:
      return typeof ans === "string" ? ans : String(ans);
  }
}

/** Blanks of a Part 6 passage in position order. */
export const subsByPosition = (q: GrammarQuestion): GrammarSubQuestion[] =>
  [...(q.subQuestions || [])].sort((a, b) => a.position - b.position);

/** Scored qids of an item (cloze6 → the id of every blank). */
export const scoredQids = (q: GrammarQuestion): string[] =>
  q.kind === "cloze6" ? subsByPosition(q).map((s) => s.id) : [q.id];

/** `answers` of a whole block: { qid: value } — answered questions only. */
export function answersApi(
  questions: GrammarQuestion[],
  answers: Record<string, QuestionAnswer>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  questions.forEach((q) => {
    const ans = answers[q.id];
    if (q.kind === "cloze6") {
      (q.subQuestions || []).forEach((s) => {
        const v = ((ans || {}) as ClozeAnswer)[s.position];
        if (!isBlank(v)) out[s.id] = v;
      });
      return;
    }
    const v = answerValue(q, ans);
    if (v !== null) out[q.id] = v;
  });
  return out;
}
