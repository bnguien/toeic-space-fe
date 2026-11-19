import type { BreakdownRow } from "../ui";
import type { BankOverview } from "../../types/exam-bank.types";
import { DIFFICULTY_LABELS, STATUS_LABELS } from "./bank.constants";

const DIFFICULTY_ORDER = ["VeryEasy", "Easy", "Medium", "Hard", "VeryHard"];

/** Easy to hard as light to strong shades of the page theme. */
const DIFFICULTY_COLORS: Record<string, string> = {
  VeryEasy: "var(--theme-light)",
  Easy: "var(--theme-line)",
  Medium: "var(--theme-mid)",
  Hard: "var(--theme)",
  VeryHard: "var(--theme-strong)",
};

const STATUS_COLORS: Record<string, string> = {
  Active: "var(--theme)",
  Draft: "var(--theme-light)",
  Archived: "var(--ui-divider)",
};

const rank = (level: string) => {
  const index = DIFFICULTY_ORDER.indexOf(level);
  return index === -1 ? DIFFICULTY_ORDER.length : index;
};

export const difficultyRow = (overview: BankOverview): BreakdownRow => ({
  key: "difficulty",
  title: "Độ khó",
  segments: [...overview.difficulties]
    .sort((left, right) => rank(left.difficultyLevel) - rank(right.difficultyLevel))
    .map((item) => ({
      key: item.difficultyLevel,
      label: DIFFICULTY_LABELS[item.difficultyLevel] ?? item.difficultyLevel,
      value: item.questions,
      color: DIFFICULTY_COLORS[item.difficultyLevel] ?? "var(--theme-mid)",
    })),
});

export const questionStatusRow = (overview: BankOverview): BreakdownRow => ({
  key: "status",
  title: "Trạng thái câu hỏi",
  segments: overview.statuses.map((item) => ({
    key: item.status,
    label: STATUS_LABELS[item.status] ?? item.status,
    value: item.questions,
    color: STATUS_COLORS[item.status] ?? "var(--ui-divider)",
  })),
});

export const questionSourceRow = (overview: BankOverview): BreakdownRow => ({
  key: "source",
  title: "Nguồn câu hỏi",
  segments: [
    { key: "test", label: "Thuộc đề thi", value: overview.testQuestions, color: "var(--theme)" },
    {
      key: "bank",
      label: "Chỉ ở ngân hàng",
      value: overview.bankQuestions,
      color: "var(--theme-light)",
    },
  ],
});
