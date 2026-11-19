/** Cells of the question grid drawer (exam room and workspace). Pure. */
import type { AnswerOption } from "../types/practice-exam.types.ts";
import type { QuestionGroup } from "./attemptGroups.ts";

export interface GridCell {
  questionId: string;
  number: number;
  part: number;
  groupIndex: number;
  questionIndex: number;
  answered: boolean;
  flagged: boolean;
  current: boolean;
  locked: boolean;
  /** true/false once revealed (null = revealed but skipped); undefined = not revealed. */
  correct: boolean | null | undefined;
}

export interface GridCellSources {
  answerOf: (questionId: string) => AnswerOption | null;
  isFlagged: (questionId: string) => boolean;
  currentGroupIndex: number;
  /** Exam room lock rule (see `isGroupLocked`); omit in the workspace. */
  isLocked?: (groupIndex: number) => boolean;
  /** Show correct/wrong colours of revealed questions (workspace; never in the exam room). */
  showResults?: boolean;
}

export function buildGridCells(
  groups: readonly QuestionGroup[],
  sources: GridCellSources,
): GridCell[] {
  return groups.flatMap((group, groupIndex) =>
    group.questions.map((q, questionIndex) => {
      const answer = sources.answerOf(q.id);
      const reveal = sources.showResults ? q.reveal : null;
      return {
        questionId: q.id,
        number: q.number,
        part: q.part,
        groupIndex,
        questionIndex,
        answered: answer != null,
        flagged: sources.isFlagged(q.id),
        current: groupIndex === sources.currentGroupIndex,
        locked: sources.isLocked?.(groupIndex) ?? false,
        correct: reveal ? reveal.isCorrect : undefined,
      };
    }),
  );
}

export interface GridCounts {
  total: number;
  answered: number;
  flagged: number;
  correct: number;
  wrong: number;
  locked: number;
  current: number;
}

export function gridCounts(cells: readonly GridCell[]): GridCounts {
  return {
    total: cells.length,
    answered: cells.filter((c) => c.answered).length,
    flagged: cells.filter((c) => c.flagged).length,
    correct: cells.filter((c) => c.correct === true).length,
    wrong: cells.filter((c) => c.correct === false).length,
    locked: cells.filter((c) => c.locked).length,
    current: cells.filter((c) => c.current).length,
  };
}

/** Cells grouped by part, in part order. */
export function cellsByPart(cells: readonly GridCell[]) {
  const map = new Map<number, GridCell[]>();
  for (const cell of cells) {
    const list = map.get(cell.part) ?? [];
    list.push(cell);
    map.set(cell.part, list);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([part, items]) => ({ part, items }));
}

/** Screen-reader state of a cell, e.g. "Câu 12: đã làm, đánh dấu". */
export function cellLabel(cell: GridCell): string {
  const states = [
    cell.correct === true
      ? "đúng"
      : cell.correct === false
        ? "sai"
        : cell.answered
          ? "đã làm"
          : "chưa làm",
    cell.flagged && "đánh dấu",
    cell.locked && "đã khoá",
    cell.current && "đang làm",
  ].filter(Boolean);
  return `Câu ${cell.number}: ${states.join(", ")}`;
}
