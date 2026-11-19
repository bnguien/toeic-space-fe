/**
 * "Góc luyện tập" decisions (port of StudyChill ToeicPracticeSetup): what a choice starts, how many
 * questions it plans, the start button label. Pure: Node tests load it directly.
 */
import type { AttemptSummary, PracticeSelection } from "../../types/practice-exam.types.ts";
import type { SetQuestionCounts, SetupChoice } from "../../utils/practiceSelection.ts";

/** "Tiếp tục học" with an attempt in progress: resume it, or start the next questions fresh. */
export type ContinueMode = "resume" | "fresh";

export interface SetupContext {
  counts: SetQuestionCounts;
  /** In-progress attempt of this set (from history), if any. */
  active: Pick<AttemptSummary, "id" | "title" | "answered" | "questionCount"> | null;
  /** Completed attempts of this set, newest first. */
  completed: readonly Pick<AttemptSummary, "id" | "questionCount">[];
  /** Part 3, 4, 6, 7: passage groups stay whole, so counts are approximate. */
  grouped: boolean;
}

export type SetupPlan =
  | { kind: "resume"; attemptId: string }
  | { kind: "review"; attemptId: string }
  | { kind: "start"; selection: PracticeSelection; count?: number; restart: boolean };

/** What pressing the start button does for a choice. Null when the choice is not possible. */
export function planOf(
  choice: SetupChoice,
  ctx: SetupContext,
  options: { continueMode?: ContinueMode; count?: number; reviewId?: string | null } = {},
): SetupPlan | null {
  const { counts, active } = ctx;
  if (choice === "review") {
    const id = options.reviewId ?? ctx.completed[0]?.id;
    return id ? { kind: "review", attemptId: id } : null;
  }
  if (choice === "mistakes")
    return counts.wrong > 0 ? { kind: "start", selection: "Mistakes", restart: true } : null;
  if (choice === "random") {
    if (counts.total === 0 || !options.count) return null;
    return { kind: "start", selection: "Random", count: options.count, restart: true };
  }
  if (active && (options.continueMode ?? "resume") === "resume")
    return { kind: "resume", attemptId: active.id };
  if (counts.total === 0) return null;
  // Everything answered: "Continue" would be empty, so the whole set starts again.
  return {
    kind: "start",
    selection: counts.unanswered > 0 ? "Continue" : "All",
    restart: Boolean(active),
  };
}

/** Questions the plan covers (a soft target for Random on passage parts). */
export function plannedCount(
  choice: SetupChoice,
  ctx: SetupContext,
  options: { continueMode?: ContinueMode; count?: number; reviewId?: string | null } = {},
): number {
  const plan = planOf(choice, ctx, options);
  if (!plan) return 0;
  if (plan.kind === "resume") return ctx.active?.questionCount ?? 0;
  if (plan.kind === "review")
    return ctx.completed.find((a) => a.id === plan.attemptId)?.questionCount ?? 0;
  if (plan.selection === "Mistakes") return ctx.counts.wrong;
  if (plan.selection === "Random") return Math.min(plan.count ?? 0, ctx.counts.total);
  if (plan.selection === "Continue") return ctx.counts.unanswered;
  return ctx.counts.total;
}

/** Start button label for the current choice. */
export function startButtonLabel(
  plan: SetupPlan | null,
  ctx: SetupContext,
  count?: number,
): string {
  if (!plan) return "Bắt đầu học";
  if (plan.kind === "resume") return "Làm tiếp bài đang dở";
  if (plan.kind === "review") return "Xem bài chữa";
  if (plan.selection === "Mistakes") return "Ôn câu sai";
  if (plan.selection === "Random") return `Tạo bài ${count ?? plan.count ?? ""} câu và bắt đầu`;
  if (plan.selection === "All") return "Làm lại cả bộ";
  return ctx.counts.answered > 0 ? "Học tiếp" : "Bắt đầu học";
}

/** "20 câu", or "khoảng 20 câu" when passage groups make the count approximate. */
export function plannedLabel(count: number, approximate: boolean): string {
  if (count <= 0) return "Chưa có câu phù hợp";
  return `${approximate ? "khoảng " : ""}${count} câu`;
}

/** Whether starting the plan abandons the attempt in progress (shown as a warning). */
export const abandonsActive = (plan: SetupPlan | null, ctx: SetupContext) =>
  Boolean(ctx.active && plan?.kind === "start" && plan.restart);
