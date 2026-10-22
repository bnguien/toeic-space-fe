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

// Sources store the group heading ("Questions 131-134 refer to ...") as the first question's text.
const PASSAGE_HEADING = /^\s*Questions?\s+\d+\s*[-–]\s*\d+\s+refers?\s+to\b/i;

/** Question text worth showing, or null when it is only the passage heading. */
export const questionPrompt = (text: string | null | undefined) =>
  text && !PASSAGE_HEADING.test(text) ? text : null;
