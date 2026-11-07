import type { BankOverview } from "../../types/exam-bank.types";

export const PART_NAMES = [
  "Mô tả hình ảnh",
  "Hỏi - Đáp",
  "Hội thoại ngắn",
  "Bài nói ngắn",
  "Điền câu",
  "Điền đoạn văn",
  "Đọc hiểu",
];
export const STATUS_LABELS: Record<string, string> = {
  Draft: "Bản nháp",
  Active: "Đang sử dụng",
  Archived: "Đã lưu trữ",
};
export const CATEGORY_LABELS: Record<string, string> = {
  FULL_TEST: "Đề thi đầy đủ",
  PRACTICE: "Luyện tập",
};
export const DIFFICULTY_LABELS: Record<string, string> = {
  VeryEasy: "Rất dễ",
  Easy: "Cơ bản",
  Medium: "Trung cấp",
  Hard: "Nâng cao",
  VeryHard: "Rất khó",
};

export const partNumber = (part: string) => Number(part.replace("Part", "")) || 0;

export const sortedParts = (overview: BankOverview) =>
  [...overview.parts].sort((left, right) => partNumber(left.part) - partNumber(right.part));

/** Badge tones from the page theme. */
export const CONTENT_STATUS_TONES: Record<string, "theme" | "neutral" | "pearl"> = {
  Active: "theme",
  Draft: "neutral",
  Archived: "pearl",
};

export const DIFFICULTY_TONES: Record<string, "theme" | "neutral" | "pearl"> = {
  VeryEasy: "neutral",
  Easy: "neutral",
  Medium: "theme",
  Hard: "pearl",
  VeryHard: "pearl",
};

// Sources store the group heading ("Questions 131-134 refer to ...") as the first question's text.
const PASSAGE_HEADING = /^\s*Questions?\s+\d+\s*[-–]\s*\d+\s+refers?\s+to\b/i;

/** Question text worth showing, or null when it is only the passage heading. */
export const questionPrompt = (text: string | null | undefined) =>
  text && !PASSAGE_HEADING.test(text) ? text : null;
