/**
 * Exam room helpers (pure; Node tests load this file directly, so only `.ts` relative imports and
 * `import type` from elsewhere).
 *
 * Answers, flags and the clock live on the server. The only thing kept in this browser is WHERE
 * the learner is (step + directions already heard), so F5 lands on the same screen; when it is
 * missing (other device, cleared storage) the position is derived from the saved answers.
 */
import type { AnswerOption, ToeicSection } from "../../types/practice-exam.types.ts";
import type { QuestionGroup } from "../../utils/attemptGroups.ts";
import { stepKey, type ExamStep } from "../../utils/examSteps.ts";

export interface ExamPosition {
  /** Index in `buildExamSteps(groups)`; `steps.length` = past the last step (end card). */
  step: number;
  /** `stepKey` of the directions already heard / passed. */
  seen: string[];
  /** Section of `step` when saved (used by the resume dialog before the attempt is loaded). */
  section?: ToeicSection | null;
}

const POSITION_PREFIX = "toeicspace.exam.position.";

export const positionKey = (attemptId: string) => `${POSITION_PREFIX}${attemptId}`;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const browserStorage = (): StorageLike | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

/** Saved position of an attempt, or null when missing / malformed. */
export function readPosition(
  attemptId: string | null | undefined,
  storage: StorageLike | null = browserStorage(),
): ExamPosition | null {
  if (!attemptId || !storage) return null;
  try {
    const raw = storage.getItem(positionKey(attemptId));
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<ExamPosition>;
    if (typeof data.step !== "number" || !Number.isInteger(data.step) || data.step < 0) return null;
    return {
      step: data.step,
      seen: Array.isArray(data.seen) ? data.seen.filter((k) => typeof k === "string") : [],
      section: data.section === "listening" || data.section === "reading" ? data.section : null,
    };
  } catch {
    return null;
  }
}

export function writePosition(
  attemptId: string,
  position: ExamPosition,
  storage: StorageLike | null = browserStorage(),
) {
  try {
    storage?.setItem(positionKey(attemptId), JSON.stringify(position));
  } catch {
    /* private mode / quota: the derived position is used next time */
  }
}

export function clearPosition(attemptId: string, storage: StorageLike | null = browserStorage()) {
  try {
    storage?.removeItem(positionKey(attemptId));
  } catch {
    /* ignore */
  }
}

/**
 * Position derived from the saved answers: after the last Listening group with an answer (that
 * audio was already played), or on the last answered Reading question. Start of the test when
 * nothing is answered.
 */
export function derivedStep(
  steps: readonly ExamStep[],
  groups: readonly QuestionGroup[],
  isAnswered: (questionId: string) => boolean,
): number {
  let lastGroup = -1;
  let lastQuestion = -1;
  groups.forEach((group, groupIndex) =>
    group.questions.forEach((q, questionIndex) => {
      if (isAnswered(q.id)) {
        lastGroup = groupIndex;
        lastQuestion = questionIndex;
      }
    }),
  );
  if (lastGroup < 0) return 0;
  const group = groups[lastGroup];
  if (group.section === "listening") {
    let last = -1;
    steps.forEach((s, i) => {
      if (s.type === "group" && s.groupIndex === lastGroup) last = i;
    });
    return last < 0 ? 0 : last + 1;
  }
  const index = steps.findIndex(
    (s) =>
      s.type === "group" &&
      s.groupIndex === lastGroup &&
      (s.questionIndex === null || s.questionIndex === lastQuestion),
  );
  return index < 0 ? 0 : index;
}

/**
 * Where to resume: the later of the saved and the derived position (never behind the evidence of
 * the saved answers, so Listening audio already answered is not replayed). Every directions screen
 * before that step counts as heard.
 */
export function resumePosition(
  steps: readonly ExamStep[],
  groups: readonly QuestionGroup[],
  isAnswered: (questionId: string) => boolean,
  stored: ExamPosition | null,
): ExamPosition {
  const storedStep = stored && stored.step <= steps.length ? stored.step : 0;
  const step = Math.min(steps.length, Math.max(storedStep, derivedStep(steps, groups, isAnswered)));
  const seen = new Set(stored?.seen ?? []);
  steps.slice(0, step).forEach((s) => {
    if (s.type === "directions") seen.add(stepKey(s));
  });
  return { step, seen: [...seen], section: steps[step]?.section ?? null };
}

/** Keyboard → option: "1".."4" and "a".."d" (case-insensitive). */
export function optionFromKey(key: string): AnswerOption | null {
  const map: Record<string, AnswerOption> = {
    "1": "A",
    "2": "B",
    "3": "C",
    "4": "D",
    a: "A",
    b: "B",
    c: "C",
    d: "D",
  };
  return map[key.toLowerCase()] ?? null;
}

/** Whether a key event comes from a field that owns its keys (text input, range, select…). */
export function ownsKeys(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  const element = target as Element;
  if (element.closest("textarea, select, [contenteditable='true']")) return true;
  const input = element.closest("input");
  return Boolean(input && (input as HTMLInputElement).type !== "radio");
}

/** Whether Enter / Space would activate a focused control (leave those to the control). */
export function activatesOnEnter(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  return Boolean((target as Element).closest("button, a[href], summary"));
}

/** Remaining whole seconds of an active attempt at response time (null without a deadline). */
export function remainingAtResponse(
  deadline: string | null | undefined,
  serverNow: string | null | undefined,
): number | null {
  if (!deadline) return null;
  const end = Date.parse(deadline);
  const now = serverNow ? Date.parse(serverNow) : NaN;
  if (Number.isNaN(end) || Number.isNaN(now)) return null;
  return Math.max(0, Math.round((end - now) / 1000));
}

/** Where "Về Luyện đề" / exit goes: the page that opened the room, else the exam space. */
export function backTarget(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === "string" &&
    from.startsWith("/practice") &&
    !from.startsWith("/practice/tests/") &&
    !from.startsWith("/practice/attempts/")
    ? from
    : "/practice/exam";
}
