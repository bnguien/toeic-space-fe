/**
 * Result page data (port of StudyChill ExamResultPage `buildRows` / `buildSummary`). Pure: Node
 * tests load this file directly (only `.ts` relative imports, `import type` from elsewhere).
 */
import type {
  AnswerOption,
  PartScore,
  ResultAnswer,
  ToeicSection,
} from "../../types/practice-exam.types.ts";
import { indexQuestions, type QuestionGroup } from "../../utils/attemptGroups.ts";
import { sectionOf } from "../../utils/parts.ts";

export type RowStatus = "correct" | "wrong" | "skip";
export type RowFilter = "all" | "wrong" | "skip";

export interface ResultRow {
  questionId: string;
  /** Number shown to the learner (same numbering as the review workspace). */
  number: number;
  part: number;
  section: ToeicSection;
  correct: AnswerOption;
  user: AnswerOption | null;
  status: RowStatus;
  flagged: boolean;
  /** Position in the review groups; -1 when the review content is not available. */
  groupIndex: number;
  questionIndex: number;
}

/** Skipped when nothing was chosen; otherwise the server verdict. */
export const statusOf = (user: AnswerOption | null, isCorrect: boolean | null): RowStatus =>
  !user ? "skip" : isCorrect === true ? "correct" : "wrong";

/** Source numbers when unique, else 1..N in attempt order (same rule as `displayNumbers`). */
function fallbackNumbers(answers: readonly ResultAnswer[]): Map<string, number> {
  const ordered = [...answers].sort((a, b) => a.orderIndex - b.orderIndex);
  const numbers = ordered.map((a) => a.questionNumber);
  const unique =
    numbers.every((n): n is number => n != null) && new Set(numbers).size === numbers.length;
  return new Map(
    ordered.map((a, i) => [a.questionId, unique ? (a.questionNumber as number) : i + 1]),
  );
}

/** One row per graded question, in attempt order, joined with the review groups when loaded. */
export function buildResultRows(
  answers: readonly ResultAnswer[],
  groups: readonly QuestionGroup[] | null | undefined,
): ResultRow[] {
  const index = groups ? indexQuestions(groups) : null;
  const numbers = fallbackNumbers(answers);
  return [...answers]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((answer) => {
      const at = index?.get(answer.questionId);
      const question = at && groups ? groups[at.groupIndex].questions[at.questionIndex] : null;
      return {
        questionId: answer.questionId,
        number: question?.number ?? numbers.get(answer.questionId) ?? answer.orderIndex + 1,
        part: answer.part,
        section: sectionOf(answer.part),
        correct: answer.correctAnswer,
        user: answer.userAnswer,
        status: statusOf(answer.userAnswer, answer.isCorrect),
        flagged: answer.flagged,
        groupIndex: at?.groupIndex ?? -1,
        questionIndex: at?.questionIndex ?? -1,
      };
    });
}

/** Rows of a part tab (0 = every part) and a status filter. */
export function filterRows(rows: readonly ResultRow[], part: number, filter: RowFilter) {
  return rows.filter(
    (row) => (!part || row.part === part) && (filter === "all" || row.status === filter),
  );
}

/** Counts of the filter buttons inside a part tab. */
export function filterCounts(rows: readonly ResultRow[], part: number): Record<RowFilter, number> {
  const scope = part ? rows.filter((row) => row.part === part) : rows;
  return {
    all: scope.length,
    wrong: scope.filter((row) => row.status === "wrong").length,
    skip: scope.filter((row) => row.status === "skip").length,
  };
}

/** Parts present in the rows, ascending. */
export const partsOf = (rows: readonly ResultRow[]) =>
  [...new Set(rows.map((row) => row.part))].sort((a, b) => a - b);

/** Server per-part score, or one computed from the rows when it is missing. */
export function partScores(byPart: readonly PartScore[], rows: readonly ResultRow[]): PartScore[] {
  if (byPart.length) return [...byPart].sort((a, b) => a.part - b.part);
  return partsOf(rows).map((part) => {
    const list = rows.filter((row) => row.part === part);
    return {
      part,
      total: list.length,
      answered: list.filter((row) => row.status !== "skip").length,
      correct: list.filter((row) => row.status === "correct").length,
    };
  });
}

/** Sum of a list of part scores (section rows of the part table). */
export const sumParts = (parts: readonly PartScore[]) =>
  parts.reduce((sum, p) => ({ correct: sum.correct + p.correct, total: sum.total + p.total }), {
    correct: 0,
    total: 0,
  });

/** Empty message of the answer list for a filter. */
export function emptyMessage(filter: RowFilter): string {
  if (filter === "wrong") return "Không có câu sai nào ở đây — tuyệt vời!";
  if (filter === "skip") return "Bạn không bỏ câu nào ở đây.";
  return "Chưa có câu nào.";
}

/** Where "Về …" leads from a result: the space the attempt came from. */
export function resultBackLink(source: { kind: "Test" | "PracticeSet"; part: number | null }): {
  to: string;
  label: string;
} {
  if (source.kind === "Test") return { to: "/practice/exam", label: "Về Luyện đề" };
  const part = source.part ?? 5;
  return part <= 4
    ? { to: `/practice/listening?part=${part}`, label: "Về Luyện nghe" }
    : { to: `/practice/reading?part=${part}`, label: "Về Luyện đọc" };
}
