/**
 * AttemptDto → ordered question groups (port of StudyChill `examData.normalizeTest` / `applyReveal`).
 * A group is one screen of the exam room / workspace: a passage with its questions (P3/4/6/7, and
 * any question sharing a passage) or one standalone question (P1/P2/P5). Pure; no DOM.
 */
import type {
  AnswerOption,
  Attempt,
  AttemptPassage,
  AttemptQuestion,
  QuestionHistoryEntry,
  Reveal,
  ToeicSection,
} from "../types/practice-exam.types.ts";
import { optionKeysOf, sectionOf } from "./parts.ts";

export interface GroupOption {
  key: AnswerOption;
  /** Option text; for Parts 1–2 it may be empty until revealed (the audio is the content). */
  text: string;
}

/** Answer key and solution of a question; present only once checked / submitted. */
export interface QuestionRevealView {
  correctAnswer: AnswerOption;
  userAnswer: AnswerOption | null;
  /** null = skipped. */
  isCorrect: boolean | null;
  explanation: string | null;
  /** English script (Parts 1–4); the server sends "<script><hr/><translation>" and we split it here. */
  transcript: string | null;
  transcriptTranslation: string | null;
  history: QuestionHistoryEntry[];
}

export interface GroupQuestion {
  /** Snapshot question id (used by save / flag / check). */
  id: string;
  sourceQuestionId: string;
  passageId: string | null;
  part: number;
  orderIndex: number;
  /** Number shown to the learner (source number, or 1..N when the attempt has duplicates). */
  number: number;
  /** Original question number of the source test, if any. */
  sourceNumber: number | null;
  /** Question prompt without a leading "N." prefix; empty for Parts 1–2. */
  text: string;
  options: GroupOption[];
  audioUrl: string | null;
  imageUrls: string[];
  reveal: QuestionRevealView | null;
}

export interface QuestionGroup {
  /** "p_<passageId>" for passage groups, "q_<questionId>" for standalone questions. */
  id: string;
  passageId: string | null;
  isPassage: boolean;
  part: number;
  section: ToeicSection;
  /** Passage title, or a generated "Questions a-b refer to the following text." */
  title: string;
  passageType: string | null;
  /** English passage content (P6/P7; P3/P4 script only after reveal). */
  content: string | null;
  /** Vietnamese translation (only after reveal). */
  translation: string | null;
  /** Shared audio of the group (passage audio, else the first question audio). */
  audioUrl: string | null;
  /** Images of the group (passage images, else question images), `<image_split>` expanded. */
  imageUrls: string[];
  questions: GroupQuestion[];
  firstNumber: number;
  lastNumber: number;
}

const IMAGE_SPLIT = /<\s*image_split\s*\/?\s*>/i;
const TRANSLATION_SPLIT = /<\s*translation_split\s*\/?\s*>/i;

/** Media fields may join several URLs with `<image_split>`; returns the trimmed parts. */
export const splitMedia = (value: string | null | undefined): string[] =>
  (value ?? "")
    .split(IMAGE_SPLIT)
    .map((item) => item.trim())
    .filter(Boolean);

/** Splits `english<translation_split>vietnamese`. */
export function splitTranslation(value: string | null | undefined): [string, string] {
  const [english = "", ...rest] = (value ?? "").split(TRANSLATION_SPLIT);
  return [english.trim(), rest.join(" ").trim()];
}

const TRANSCRIPT_SPLIT = /<hr\s*\/?>/i;

/** Splits a raw listening transcript into its English script and the Vietnamese translation after `<hr/>`. */
export function splitTranscript(value: string | null | undefined): {
  transcript: string | null;
  transcriptTranslation: string | null;
} {
  const [english = "", ...rest] = (value ?? "").split(TRANSCRIPT_SPLIT);
  const translation = rest.join(" ").trim();
  return { transcript: english.trim() || null, transcriptTranslation: translation || null };
}

/** Drops a leading "(A)" / "A." from imported option text. */
export function cleanOption(text: string | null | undefined, key: string): string {
  const value = (text ?? "").trim();
  if (value.startsWith(`(${key})`)) return value.slice(3).trim();
  if (value.startsWith(`${key}.`)) return value.slice(2).trim();
  return value;
}

/** Drops a leading "101." from imported question text. */
export function cleanQuestionText(text: string | null | undefined, number: number | null): string {
  const value = (text ?? "").trim();
  if (number != null && value.startsWith(`${number}.`)) {
    return value.slice(String(number).length + 1).trim();
  }
  return value;
}

/**
 * Display numbers: the source numbers when every question has a unique one, otherwise 1..N in
 * attempt order (practice sets mixing several tests can repeat numbers).
 */
export function displayNumbers(questions: readonly AttemptQuestion[]): Map<string, number> {
  const ordered = [...questions].sort((a, b) => a.orderIndex - b.orderIndex);
  const numbers = ordered.map((q) => q.questionNumber);
  const unique =
    numbers.every((n): n is number => n != null) && new Set(numbers).size === numbers.length;
  return new Map(ordered.map((q, i) => [q.id, unique ? (q.questionNumber as number) : i + 1]));
}

const groupNoun = (part: number) => (part === 3 ? "conversation" : part === 4 ? "talk" : "text");

/** "Questions 32-34 refer to the following conversation." (single: "Question 32 refers to …"). */
export function generatedGroupTitle(part: number, first: number, last: number): string {
  return first === last
    ? `Question ${first} refers to the following ${groupNoun(part)}.`
    : `Questions ${first}-${last} refer to the following ${groupNoun(part)}.`;
}

function toQuestion(q: AttemptQuestion, number: number): GroupQuestion {
  const keys = optionKeysOf(q.part);
  const raw = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
  return {
    id: q.id,
    sourceQuestionId: q.sourceQuestionId,
    passageId: q.passageId,
    part: q.part,
    orderIndex: q.orderIndex,
    number,
    sourceNumber: q.questionNumber,
    text: q.part <= 2 ? "" : cleanQuestionText(q.questionText, q.questionNumber),
    options: keys.map((key) => ({ key, text: cleanOption(raw[key], key) })),
    audioUrl: q.audioUrl,
    imageUrls: splitMedia(q.imageUrl),
    reveal: null,
  };
}

function buildGroup(
  questions: GroupQuestion[],
  passage: AttemptPassage | undefined,
): QuestionGroup {
  const first = questions[0];
  const part = passage?.part ?? first.part;
  const numbers = questions.map((q) => q.number);
  const firstNumber = Math.min(...numbers);
  const lastNumber = Math.max(...numbers);
  const [content] = splitTranslation(passage?.content);
  const passageImages = splitMedia(passage?.imageUrl);
  return {
    id: passage ? `p_${passage.id}` : `q_${first.id}`,
    passageId: passage?.id ?? null,
    isPassage: Boolean(passage),
    part,
    section: sectionOf(part),
    title:
      passage?.title?.trim() || (passage ? generatedGroupTitle(part, firstNumber, lastNumber) : ""),
    passageType: passage?.passageType ?? null,
    content: content || null,
    translation: null,
    audioUrl: passage?.audioUrl || questions.find((q) => q.audioUrl)?.audioUrl || null,
    imageUrls: passageImages.length ? passageImages : passage ? [] : first.imageUrls,
    questions,
    firstNumber,
    lastNumber,
  };
}

/**
 * Ordered groups of an attempt. Questions follow `orderIndex`; consecutive questions sharing a
 * passage form one group (A–B–A keeps three groups so the order is never changed).
 * The attempt's reveal is merged in.
 */
export function buildAttemptGroups(attempt: Pick<Attempt, "questions" | "passages" | "reveal">) {
  const numbers = displayNumbers(attempt.questions);
  const passages = new Map(attempt.passages.map((p) => [p.id, p]));
  const ordered = [...attempt.questions].sort((a, b) => a.orderIndex - b.orderIndex);
  const groups: QuestionGroup[] = [];
  let pending: GroupQuestion[] = [];
  let pendingPassage: string | null = null;
  const flush = () => {
    if (!pending.length) return;
    groups.push(buildGroup(pending, pendingPassage ? passages.get(pendingPassage) : undefined));
    pending = [];
  };
  for (const q of ordered) {
    const question = toQuestion(q, numbers.get(q.id) ?? q.orderIndex + 1);
    const passageId = q.passageId && passages.has(q.passageId) ? q.passageId : null;
    if (!passageId || passageId !== pendingPassage) flush();
    pendingPassage = passageId;
    pending.push(question);
    if (!passageId) flush();
  }
  flush();
  return mergeReveal(groups, attempt.reveal);
}

/**
 * Merges reveal data (from the attempt, `check` or `review`) into groups. Returns a new array;
 * groups without changes keep their identity so memoised children do not re-render.
 */
export function mergeReveal(groups: readonly QuestionGroup[], reveal: Reveal | null | undefined) {
  if (!reveal || (!reveal.questions.length && !reveal.passages.length)) return [...groups];
  const rows = new Map(reveal.questions.map((r) => [r.questionId, r]));
  const passages = new Map(reveal.passages.map((p) => [p.id, p]));
  return groups.map((group) => {
    const passage = group.passageId ? passages.get(group.passageId) : undefined;
    let changed = false;
    const questions = group.questions.map((q) => {
      const row = rows.get(q.id);
      if (!row) return q;
      changed = true;
      return {
        ...q,
        reveal: {
          correctAnswer: row.correctAnswer,
          userAnswer: row.userAnswer,
          isCorrect: row.isCorrect,
          explanation: row.explanation,
          ...splitTranscript(row.transcript),
          history: row.history,
        },
      };
    });
    if (!changed && !passage) return group;
    if (!passage) return { ...group, questions };
    const [content, inlineTranslation] = splitTranslation(passage.content);
    return {
      ...group,
      questions,
      content: content || group.content,
      translation: passage.translation?.trim() || inlineTranslation || group.translation,
    };
  });
}

/** Where every question sits: questionId → { groupIndex, questionIndex }. */
export function indexQuestions(groups: readonly QuestionGroup[]) {
  const index = new Map<string, { groupIndex: number; questionIndex: number }>();
  groups.forEach((group, groupIndex) =>
    group.questions.forEach((q, questionIndex) => index.set(q.id, { groupIndex, questionIndex })),
  );
  return index;
}

export const allQuestions = (groups: readonly QuestionGroup[]) =>
  groups.flatMap((group) => group.questions);

/** A group counts as revealed when every one of its questions has a reveal. */
export const isGroupRevealed = (group: QuestionGroup) =>
  group.questions.every((q) => q.reveal !== null);

/** Workspace pill: "Câu 12" or "Nhóm câu 32-34 (3 câu hỏi)". */
export function groupLabel(group: QuestionGroup): string {
  return group.questions.length === 1
    ? `Câu ${group.firstNumber}`
    : `Nhóm câu ${group.firstNumber}-${group.lastNumber} (${group.questions.length} câu hỏi)`;
}

/** Short range: "12" or "32-34". */
export const groupRange = (group: QuestionGroup) =>
  group.firstNumber === group.lastNumber
    ? String(group.firstNumber)
    : `${group.firstNumber}-${group.lastNumber}`;
