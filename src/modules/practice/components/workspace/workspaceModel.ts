/**
 * Pure view model of the practice workspace (port of the derived values of StudyChill
 * `ToeicPracticePage`). Imports other files with `.ts` extensions and only types from outside, so
 * `tests/practice-workspace-*.test.mjs` can load it in Node.
 */
import type {
  AnswerOption,
  AttemptResult,
  AttemptSource,
} from "../../types/practice-exam.types.ts";
import type { GroupOption, GroupQuestion, QuestionGroup } from "../../utils/attemptGroups.ts";
import { splitLettered, statementsOf, translationsOf } from "../../utils/part1Games.ts";
import { partSpacePath } from "../../utils/parts.ts";

/* ---- Navigation state ---- */

export type Part1GameId = "truefalse" | "keyword";

/** `location.state` understood by the workspace (set by the space, config dialog and setup page). */
export interface WorkspaceNavState {
  /** Where "Thoát" goes back to. */
  from: string | null;
  /** Initial audio speed (exam config: 1 / 1.15 / 1.25). */
  speed: number;
  /** Part 1 game chosen on the setup page ("classic" = the normal workspace). */
  part1Game: Part1GameId | null;
}

/** Reads `location.state` defensively (history entries may hold anything). */
export function readNavState(state: unknown): WorkspaceNavState {
  const value = (state && typeof state === "object" ? state : {}) as Record<string, unknown>;
  const from =
    typeof value.from === "string" && value.from.startsWith("/") && !value.from.startsWith("//")
      ? value.from
      : null;
  const rawSpeed = Number(value.speed);
  const speed = Number.isFinite(rawSpeed) && rawSpeed >= 0.75 && rawSpeed <= 1.5 ? rawSpeed : 1;
  const part1Game =
    value.part1Game === "truefalse" || value.part1Game === "keyword" ? value.part1Game : null;
  return { from, speed, part1Game };
}

/** "Thoát" target: the page the learner came from, else the source's space. */
export function exitPath(source: Pick<AttemptSource, "kind" | "part">, from: string | null) {
  if (from) return from;
  if (source.kind === "PracticeSet" && source.part) return partSpacePath(source.part);
  return "/practice/exam";
}

/** "Tùy chọn học & tiến độ" target (practice-set attempts only). */
export const setupPath = (source: Pick<AttemptSource, "kind" | "id">) =>
  source.kind === "PracticeSet" ? `/practice/parts/${source.id}` : null;

/* ---- Numbering ---- */

/**
 * Practice sets are their own list: number their questions 1..N in attempt order (StudyChill
 * "bài tự tạo" counts by position). Tests keep their real numbers (101 is question 101).
 */
export function numberByPosition(groups: readonly QuestionGroup[]): QuestionGroup[] {
  let position = 0;
  return groups.map((group) => {
    const questions = group.questions.map((q) => ({ ...q, number: ++position }));
    const numbers = questions.map((q) => q.number);
    return {
      ...group,
      questions,
      firstNumber: Math.min(...numbers),
      lastNumber: Math.max(...numbers),
    };
  });
}

/** Questions in groups 0..index (the progress bar). */
export const questionsThrough = (groups: readonly QuestionGroup[], index: number) =>
  groups.slice(0, index + 1).reduce((sum, group) => sum + group.questions.length, 0);

export const totalQuestions = (groups: readonly QuestionGroup[]) =>
  groups.reduce((sum, group) => sum + group.questions.length, 0);

/**
 * Header label: "Câu X / N" or "Nhóm câu a-b / N". When the numbers are not one contiguous run
 * (a retake of wrong answers: 5, 17, 101…), the position in the attempt is shown instead.
 */
export function progressLabel(groups: readonly QuestionGroup[], index: number): string {
  const group = groups[index];
  const total = totalQuestions(groups);
  if (!group) return `0 / ${total}`;
  const all = groups.flatMap((g) => g.questions.map((q) => q.number));
  const lowest = Math.min(...all);
  const contiguous = Math.max(...all) - lowest + 1 === all.length;
  const multi = group.questions.length > 1;
  const start = questionsThrough(groups, index - 1) + 1;
  const end = start + group.questions.length - 1;
  const positions = multi ? `${start}-${end}` : String(start);
  if (!contiguous) {
    return multi ? `Nhóm câu ${positions} / ${total}` : `Câu ${positions} / ${total}`;
  }
  const numbers = multi ? `${group.firstNumber}-${group.lastNumber}` : String(group.firstNumber);
  const noun = multi ? "Nhóm câu" : "Câu";
  // A run that starts at 1 (a full test, a practice set) reads "Câu 12 / 200"; a part of a test
  // (101–146) keeps its real numbers and adds the position: "Câu 101 · 1/46".
  return lowest === 1
    ? `${noun} ${numbers} / ${total}`
    : `${noun} ${numbers} · ${positions}/${total}`;
}

/** "✓ Kiểm tra đáp án câu N" / "✓ Kiểm tra nhóm câu a–b". */
export const checkLabel = (group: QuestionGroup) =>
  group.questions.length > 1
    ? `Kiểm tra nhóm câu ${group.firstNumber}–${group.lastNumber}`
    : `Kiểm tra đáp án câu ${group.firstNumber}`;

/** Footer grid button: "a-b/N". */
export const gridButtonLabel = (groups: readonly QuestionGroup[], index: number) => {
  const group = groups[index];
  if (!group) return `0/${totalQuestions(groups)}`;
  const range =
    group.firstNumber === group.lastNumber
      ? String(group.firstNumber)
      : `${group.firstNumber}-${group.lastNumber}`;
  return `${range}/${totalQuestions(groups)}`;
};

/* ---- Navigation inside the attempt ---- */

/** Where to open an attempt: the first group with an unanswered, unchecked question. */
export function initialGroupIndex(
  groups: readonly QuestionGroup[],
  answerOf: (questionId: string) => AnswerOption | null,
): number {
  const index = groups.findIndex((group) =>
    group.questions.some((q) => q.reveal === null && answerOf(q.id) === null),
  );
  return index === -1 ? 0 : index;
}

/** Deep link `?q=`: a source question id or a snapshot question id. */
export function findQuestion(groups: readonly QuestionGroup[], ref: string | null | undefined) {
  if (!ref) return null;
  const key = ref.toLowerCase();
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const question = groups[groupIndex].questions.find(
      (q) => q.id.toLowerCase() === key || q.sourceQuestionId.toLowerCase() === key,
    );
    if (question) return { groupIndex, questionId: question.id };
  }
  return null;
}

export interface PartJump {
  part: number;
  groupIndex: number;
  count: number;
}

/** Parts of the attempt with the first group of each (footer part buttons). */
export function partJumps(groups: readonly QuestionGroup[]): PartJump[] {
  const jumps = new Map<number, PartJump>();
  groups.forEach((group, groupIndex) => {
    const jump = jumps.get(group.part);
    if (jump) jump.count += group.questions.length;
    else jumps.set(group.part, { part: group.part, groupIndex, count: group.questions.length });
  });
  return [...jumps.values()].sort((a, b) => a.part - b.part);
}

/** Questions without an answer, in attempt order (submit warning). */
export const unansweredQuestions = (
  groups: readonly QuestionGroup[],
  answerOf: (questionId: string) => AnswerOption | null,
) => groups.flatMap((group) => group.questions).filter((q) => answerOf(q.id) === null);

/** Contextual primary button of the phone footer. */
export function primaryAction(input: {
  canCheck: boolean;
  answeredInGroup: number;
  canSubmit: boolean;
  isLast: boolean;
}): "check" | "submit" | "next" {
  if (input.canCheck && input.answeredInGroup > 0) return "check";
  if (input.canSubmit && input.isLast) return "submit";
  return "next";
}

/* ---- Question card ---- */

/** Part 6 question rows that only point at a blank show "[Chỗ trống N]". */
export const isBlankPointer = (text: string) =>
  !text.trim() || /^Questions?\s/i.test(text.trim()) || /refer to the following/i.test(text);

export interface RevealedOption extends GroupOption {
  /** Vietnamese line under the option (Parts 1–2), if any. */
  vi: string;
}

const plainLines = (html: string | null | undefined) =>
  (html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * Options of a revealed question. Parts 1–2: the statements come from the option text or the
 * transcript "(A) …" lines, with a translation from the explanation or the transcript
 * translation. Other parts: the options as they are.
 */
export function revealedOptions(question: GroupQuestion): RevealedOption[] {
  if (question.part > 2 || !question.reveal) {
    return question.options.map((option) => ({ ...option, vi: "" }));
  }
  const statements = new Map(statementsOf(question).map((s) => [s.key, s]));
  const fromExplanation = translationsOf(question.reveal.explanation);
  const fromTranscript = splitLettered(plainLines(question.reveal.transcriptTranslation));
  return question.options.map((option) => {
    const statement = statements.get(option.key);
    return {
      key: option.key,
      text: statement?.text ?? "",
      vi: statement?.vi || fromExplanation[option.key] || fromTranscript[option.key] || "",
    };
  });
}

/** Result line under a revealed question. */
export function resultLine(question: GroupQuestion): { tone: "correct" | "wrong"; text: string } {
  const reveal = question.reveal;
  if (!reveal) return { tone: "wrong", text: "" };
  if (reveal.userAnswer && reveal.userAnswer === reveal.correctAnswer) {
    return { tone: "correct", text: `Chính xác! Đáp án đúng: (${reveal.correctAnswer})` };
  }
  return {
    tone: "wrong",
    text: `Sai rồi! Bạn chọn (${reveal.userAnswer ?? "—"}), đáp án đúng: (${reveal.correctAnswer})`,
  };
}

/** Part 1–2 transcript lines without speaker tags such as "M-Au:" / "W-Am:". */
export const stripSpeakerTags = (text: string) =>
  text.replace(/\b[MW]-(?:Am|Au|Br|Cn)\s*:?\s*/g, "").trim();

/* ---- Score overlay ---- */

export interface ResultCell {
  questionId: string;
  number: number;
  groupIndex: number;
  status: "correct" | "wrong" | "skipped";
  flagged: boolean;
  userAnswer: AnswerOption | null;
  correctAnswer: AnswerOption;
}

/** Every answer of a result as a grid cell placed on the workspace groups. */
export function resultCells(
  result: Pick<AttemptResult, "answers">,
  groups: readonly QuestionGroup[],
): ResultCell[] {
  const placed = new Map<string, { number: number; groupIndex: number }>();
  groups.forEach((group, groupIndex) =>
    group.questions.forEach((q) => placed.set(q.id, { number: q.number, groupIndex })),
  );
  return [...result.answers]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((answer) => {
      const where = placed.get(answer.questionId);
      return {
        questionId: answer.questionId,
        number: where?.number ?? answer.questionNumber ?? answer.orderIndex + 1,
        groupIndex: where?.groupIndex ?? 0,
        status:
          answer.isCorrect === true ? "correct" : answer.isCorrect === false ? "wrong" : "skipped",
        flagged: answer.flagged,
        userAnswer: answer.userAnswer,
        correctAnswer: answer.correctAnswer,
      };
    });
}

/** Title of a result cell ("Câu 12: Sai (bạn chọn B, đáp án C)"). */
export function resultCellTitle(cell: ResultCell): string {
  const state =
    cell.status === "correct"
      ? "Đúng"
      : cell.status === "wrong"
        ? `Sai (bạn chọn ${cell.userAnswer ?? "—"}, đáp án ${cell.correctAnswer})`
        : "Chưa làm";
  return `Câu ${cell.number}: ${state}${cell.flagged ? " · có đánh dấu" : ""}`;
}
