/** "Góc luyện tập" helpers: progress counts from `my-questions` and the start options. Pure. */
import type {
  PracticeSelection,
  SetQuestionProgress,
  SetQuestionStatus,
} from "../types/practice-exam.types.ts";

/** Quick picks of the Random option. */
export const RANDOM_COUNT_PICKS = [10, 20, 40] as const;
export const RANDOM_COUNT_MIN = 5;
export const RANDOM_COUNT_MAX = 200;

/** Server bounds 5..200, never more than the set size (when the set is at least 5). */
export function clampRandomCount(value: number, total: number): number {
  const upper = Math.max(RANDOM_COUNT_MIN, Math.min(RANDOM_COUNT_MAX, total || RANDOM_COUNT_MAX));
  const n = Number.isFinite(value) ? Math.round(value) : RANDOM_COUNT_MIN;
  return Math.min(upper, Math.max(RANDOM_COUNT_MIN, n));
}

/** Default Random size: min(20, total), within the server bounds. */
export const defaultRandomCount = (total: number) => clampRandomCount(Math.min(20, total), total);

export interface SetQuestionCounts {
  total: number;
  answered: number;
  unanswered: number;
  correct: number;
  wrong: number;
  /** 0..100 */
  percent: number;
}

export function countSetQuestions(rows: readonly SetQuestionProgress[]): SetQuestionCounts {
  const correct = rows.filter((r) => r.status === "Correct").length;
  const wrong = rows.filter((r) => r.status === "Wrong").length;
  const answered = correct + wrong;
  return {
    total: rows.length,
    answered,
    unanswered: rows.length - answered,
    correct,
    wrong,
    percent: rows.length ? Math.round((answered / rows.length) * 100) : 0,
  };
}

export type QuestionFilter = "all" | "answered" | "unanswered";

/** Rows of the per-question grid for a filter, in set order. */
export function filterSetQuestions(rows: readonly SetQuestionProgress[], filter: QuestionFilter) {
  const sorted = [...rows].sort((a, b) => a.orderIndex - b.orderIndex);
  if (filter === "answered") return sorted.filter((r) => r.status !== "Unanswered");
  if (filter === "unanswered") return sorted.filter((r) => r.status === "Unanswered");
  return sorted;
}

/** Grid symbol of a question status: ✓ correct, × wrong, – not yet. */
export const statusSymbol = (status: SetQuestionStatus) =>
  status === "Correct" ? "✓" : status === "Wrong" ? "×" : "–";

export type SetupChoice = "continue" | "mistakes" | "random" | "review";

/** Start request of a setup choice (`review` opens a completed attempt instead). */
export function selectionOf(choice: SetupChoice): PracticeSelection | null {
  if (choice === "continue") return "Continue";
  if (choice === "mistakes") return "Mistakes";
  if (choice === "random") return "Random";
  return null;
}

/** Label of the start button for a setup choice. */
export function startLabel(
  choice: SetupChoice,
  options: { count?: number; hasActive?: boolean; answered?: number } = {},
): string {
  if (choice === "review") return "Xem bài chữa";
  if (choice === "mistakes") return "Ôn câu sai";
  if (choice === "random") return `Tạo bài ${options.count ?? 20} câu và bắt đầu`;
  if (options.hasActive) return "Làm tiếp bài đang dở";
  return options.answered ? "Học tiếp" : "Bắt đầu học";
}

/** Description line of the "Tiếp tục học" option. */
export function continueDescription(counts: SetQuestionCounts): string {
  if (counts.answered === 0) return `Làm lần lượt ${counts.total} câu theo đúng format đề TOEIC.`;
  return `Đi tiếp từ chỗ bạn dừng. Đã làm ${counts.answered}/${counts.total} câu.`;
}
