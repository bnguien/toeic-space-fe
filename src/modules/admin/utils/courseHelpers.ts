import { env } from "@/config/env";
import type { SelectOption } from "@/shared/components/Select";
import type { CourseExamType, CourseLevel, CourseStatus } from "../types/course.types";

export const courseStatusLabels: Record<CourseStatus, string> = {
  Draft: "Bản nháp",
  Published: "Đã xuất bản",
  Archived: "Đã lưu trữ",
};

export const courseLevelLabels: Record<CourseLevel, string> = {
  Beginner: "Cơ bản (Beginner)",
  Intermediate: "Trung cấp (Intermediate)",
  Advanced: "Nâng cao (Advanced)",
};

export const courseExamTypeLabels: Record<CourseExamType, string> = {
  ListeningReading: "Listening & Reading (Nghe & Đọc)",
  SpeakingWriting: "Speaking & Writing (Nói & Viết)",
  FourSkills: "4 Kỹ năng (Full 4 Skills)",
};

export const courseStatusOptions: SelectOption<CourseStatus | "">[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "Draft", label: "Bản nháp" },
  { value: "Published", label: "Đã xuất bản" },
  { value: "Archived", label: "Đã lưu trữ" },
];

export const courseLevelOptions: SelectOption<CourseLevel | "">[] = [
  { value: "", label: "Tất cả trình độ" },
  { value: "Beginner", label: "Cơ bản (Beginner)" },
  { value: "Intermediate", label: "Trung cấp (Intermediate)" },
  { value: "Advanced", label: "Nâng cao (Advanced)" },
];

export const courseExamTypeOptions: SelectOption<CourseExamType | "">[] = [
  { value: "", label: "Tất cả hình thức thi" },
  { value: "ListeningReading", label: "Listening & Reading" },
  { value: "SpeakingWriting", label: "Speaking & Writing" },
  { value: "FourSkills", label: "4 Kỹ năng (Full 4 Skills)" },
];

export const courseExamTypeFormOptions: SelectOption<CourseExamType>[] = [
  { value: "ListeningReading", label: "Listening & Reading (Nghe & Đọc)" },
  { value: "SpeakingWriting", label: "Speaking & Writing (Nói & Viết)" },
  { value: "FourSkills", label: "4 Kỹ năng (Full 4 Skills)" },
];

export const courseLevelFormOptions: SelectOption<CourseLevel>[] = [
  { value: "Beginner", label: "Cơ bản (Beginner)" },
  { value: "Intermediate", label: "Trung cấp (Intermediate)" },
  { value: "Advanced", label: "Nâng cao (Advanced)" },
];

/**
 * Validates target score according to exam type rules:
 * - Must be a multiple of 10
 * - ListeningReading: 10 to 990
 * - SpeakingWriting: 0 to 400
 * - FourSkills: 10 to 1390
 */
export function validateTargetScore(
  score: number | null | undefined,
  examType: CourseExamType,
): string | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null;

  if (score % 10 !== 0) {
    return "Điểm mục tiêu phải là bội số của 10.";
  }

  switch (examType) {
    case "ListeningReading":
      if (score < 10 || score > 990) {
        return "Điểm TOEIC Listening & Reading phải từ 10 đến 990.";
      }
      break;
    case "SpeakingWriting":
      if (score < 0 || score > 400) {
        return "Điểm TOEIC Speaking & Writing phải từ 0 đến 400.";
      }
      break;
    case "FourSkills":
      if (score < 10 || score > 1390) {
        return "Điểm TOEIC 4 kỹ năng phải từ 10 đến 1390.";
      }
      break;
  }

  return null;
}

/**
 * Converts text into a clean URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolves a thumbnail key to a displayable image URL.
 */
export function resolveThumbnailUrl(thumbnailKey?: string | null): string | null {
  if (!thumbnailKey || !thumbnailKey.trim()) return null;
  const trimmed = thumbnailKey.trim();

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const cleanKey = trimmed.replace(/^\/+/, "");
  if (env.avatarCdnUrl) {
    return `${env.avatarCdnUrl}/${cleanKey}`;
  }
  return `/${cleanKey}`;
}
