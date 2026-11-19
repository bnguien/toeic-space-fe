/**
 * Exam room sequence (port of StudyChill `examSession.buildSteps` + ExamRoom lock rules).
 * Listening: [Directions intro] → (Directions Part N → groups of Part N)…; Reading: Directions
 * Part N → groups (Part 5 one question per screen). Pure.
 */
import type { ToeicSection } from "../types/practice-exam.types.ts";
import type { QuestionGroup } from "./attemptGroups.ts";
import { sectionLabel, sectionOf } from "./parts.ts";

export type DirectionsKey = "intro" | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ExamStep =
  | { type: "directions"; key: DirectionsKey; section: ToeicSection }
  | {
      type: "group";
      groupIndex: number;
      part: number;
      section: ToeicSection;
      /** Set when a Part 5 group is split into one screen per question. */
      questionIndex: number | null;
    };

/** Stable id of a step (stored in the "seen" list so passed directions are skipped). */
export const stepKey = (step: ExamStep) =>
  step.type === "directions"
    ? `dir:${step.key}`
    : `group:${step.groupIndex}:${step.questionIndex ?? "all"}`;

export function buildExamSteps(groups: readonly QuestionGroup[]): ExamStep[] {
  const steps: ExamStep[] = [];
  let lastPart = 0;
  groups.forEach((group, groupIndex) => {
    const section = sectionOf(group.part);
    if (group.part !== lastPart) {
      if (
        section === "listening" &&
        !steps.some((s) => s.type === "directions" && s.key === "intro")
      ) {
        steps.push({ type: "directions", key: "intro", section });
      }
      steps.push({ type: "directions", key: group.part as DirectionsKey, section });
      lastPart = group.part;
    }
    if (group.part === 5 && group.questions.length > 1) {
      group.questions.forEach((_, questionIndex) =>
        steps.push({ type: "group", groupIndex, part: group.part, section, questionIndex }),
      );
    } else {
      steps.push({ type: "group", groupIndex, part: group.part, section, questionIndex: null });
    }
  });
  return steps;
}

/** Seconds to answer after the audio ends: P1/P2 5 s; P3/P4 8 s × questions in the group. */
export const answerWindowSeconds = (group: Pick<QuestionGroup, "part" | "questions">) =>
  group.part <= 2 ? 5 : 8 * Math.max(1, group.questions.length);

/** Whether the learner is still in (or before the end of) the Listening section. */
export function inListening(steps: readonly ExamStep[], stepIndex: number) {
  const current = steps[stepIndex];
  if (!current) return false; // past the last step: everything is over
  return current.section === "listening";
}

/**
 * Grid lock rule: a Listening group is locked unless it is the group being played; Reading groups
 * are locked while the Listening section is running.
 */
export function isGroupLocked(
  groups: readonly QuestionGroup[],
  steps: readonly ExamStep[],
  stepIndex: number,
  groupIndex: number,
): boolean {
  const group = groups[groupIndex];
  if (!group) return true;
  const current = steps[stepIndex];
  if (group.section === "listening") {
    return !(current?.type === "group" && current.groupIndex === groupIndex);
  }
  return inListening(steps, stepIndex);
}

/** First step showing a group (or a question of a split Part 5 group). */
export function stepIndexOf(
  steps: readonly ExamStep[],
  groupIndex: number,
  questionIndex: number | null = null,
): number {
  return steps.findIndex(
    (s) =>
      s.type === "group" &&
      s.groupIndex === groupIndex &&
      (s.questionIndex === null || questionIndex === null || s.questionIndex === questionIndex),
  );
}

/** Next step, skipping directions already seen; -1 at the end. */
export function nextStepIndex(
  steps: readonly ExamStep[],
  stepIndex: number,
  seen: ReadonlySet<string> = new Set(),
): number {
  for (let i = stepIndex + 1; i < steps.length; i += 1) {
    const step = steps[i];
    if (step.type === "directions" && seen.has(stepKey(step))) continue;
    return i;
  }
  return -1;
}

/** Previous Reading group step (directions skipped); -1 when there is none. */
export function previousReadingStepIndex(steps: readonly ExamStep[], stepIndex: number): number {
  for (let i = stepIndex - 1; i >= 0; i -= 1) {
    const step = steps[i];
    if (step.section !== "reading") return -1;
    if (step.type === "group") return i;
  }
  return -1;
}

/** Header label: "Listening · Part 3", "Reading · Directions", or "Kết thúc" past the end. */
export function stepLabel(steps: readonly ExamStep[], stepIndex: number): string {
  const step = steps[stepIndex];
  if (!step) return "Kết thúc";
  if (step.type === "directions") return `${sectionLabel(step.section)} · Directions`;
  return `${sectionLabel(step.section)} · Part ${step.part}`;
}

/** Questions shown on a step (one for a split Part 5 step). */
export function stepQuestions(groups: readonly QuestionGroup[], step: ExamStep | undefined) {
  if (!step || step.type !== "group") return [];
  const group = groups[step.groupIndex];
  if (!group) return [];
  return step.questionIndex === null ? group.questions : [group.questions[step.questionIndex]];
}
