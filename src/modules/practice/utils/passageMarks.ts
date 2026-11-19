/**
 * Reading passage decorations after a check (port of StudyChill `ReadingPassageView`):
 * evidence sentences to highlight, Part 6 blank badges and the Part 5 sentence blank. These only
 * produce plain data; `RichText` renders it (`highlights`, `blankLabel`, `blankFill`). Pure.
 */
import type { BlankLabel, TextHighlight } from "@/shared/components/RichText";

import type { AnswerOption } from "../types/practice-exam.types.ts";
import type { GroupQuestion } from "./attemptGroups.ts";

const stripTags = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&amp;/g, "&");

const EVIDENCE_CARD = /<div class=['"]tp-eq-en['"][^>]*>\s*["“]?\s*([\s\S]*?)\s*["”]?\s*<\/div>/i;
const EVIDENCE_LINE = /(?:Script|Dẫn chứng)\s*:\s*["“]([\s\S]+?)["”]/i;

/**
 * Evidence sentence quoted by an explanation (`tp-eq-en` card, or `Script: "…"` /
 * `Dẫn chứng: "…"`). Null when missing or too short to locate reliably (< 6 chars, < 2 words).
 */
export function extractEvidence(explanation: string | null | undefined): string | null {
  const source = explanation ?? "";
  const match = EVIDENCE_CARD.exec(source) ?? EVIDENCE_LINE.exec(source);
  if (!match) return null;
  const quote = stripTags(match[1])
    .replace(/^["“\s]+|["”\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return quote.length >= 6 && quote.split(" ").length >= 2 ? quote : null;
}

/** Highlights for a passage: the evidence of every revealed question, labelled "Câu N". */
export function passageHighlights(questions: readonly GroupQuestion[]): TextHighlight[] {
  const highlights: TextHighlight[] = [];
  for (const q of questions) {
    if (!q.reveal) continue;
    const text = extractEvidence(q.reveal.explanation);
    if (text) highlights.push({ text, label: `Câu ${q.number}`, id: q.id });
  }
  return highlights;
}

const optionText = (q: GroupQuestion, key: AnswerOption | null | undefined) =>
  key ? (q.options.find((o) => o.key === key)?.text ?? "") : "";

/**
 * Part 6 blank labels: source number → display number of the matching question (unique match
 * only); once revealed the badge also carries the correct option text.
 */
export function part6BlankLabels(questions: readonly GroupQuestion[], currentId?: string) {
  return (sourceNumber: number): BlankLabel => {
    const matches = questions.filter((q) => q.sourceNumber === sourceNumber);
    const match = matches.length === 1 ? matches[0] : undefined;
    if (!match) return { label: String(sourceNumber) };
    const answer = match.reveal ? optionText(match, match.reveal.correctAnswer) : "";
    return {
      label: String(match.number),
      active: match.id === currentId,
      ...(answer ? { answer } : {}),
    };
  };
}

/**
 * Word to show in a Part 5 sentence blank: the correct option once revealed, otherwise the
 * learner's current choice (empty = plain blank).
 */
export function part5BlankFill(question: GroupQuestion, selected: AnswerOption | null): string {
  if (question.reveal) return optionText(question, question.reveal.correctAnswer);
  return optionText(question, selected);
}
