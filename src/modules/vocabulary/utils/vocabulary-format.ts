import type { Tone } from "@/shared/components/ui";

import type {
  PartOfSpeech,
  ProgressCounts,
  ProgressDto,
  SetProgressDto,
} from "../types/vocabulary.types";

/** Schedule preview label: 0 keeps today's schedule. */
export function formatInterval(days: number): string {
  if (days <= 0) return "giữ";
  if (days < 30) return `${days} ngày`;
  if (days < 365) return `${Math.round(days / 30)} tháng`;
  return `${Math.round(days / 365)} năm`;
}

/** "01" */
export const padOrder = (order: number): string => String(order).padStart(2, "0");

/** "Bài 01" */
export const formatLessonOrder = (order: number): string => `Bài ${padOrder(order)}`;

export const formatCount = (value: number): string => value.toLocaleString("vi-VN");

export const formatPercent = (ratio: number): string =>
  `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;

const POS_LABELS: Record<PartOfSpeech, string> = {
  noun: "n",
  verb: "v",
  adjective: "adj",
  adverb: "adv",
  preposition: "prep",
  conjunction: "conj",
  pronoun: "pron",
  determiner: "det",
  interjection: "interj",
  phrase: "phrase",
  other: "other",
};

export const formatPartOfSpeech = (pos: PartOfSpeech | string): string =>
  POS_LABELS[pos as PartOfSpeech] ?? pos;

const POS_NAMES: Record<PartOfSpeech, string> = {
  noun: "Danh từ",
  verb: "Động từ",
  adjective: "Tính từ",
  adverb: "Trạng từ",
  preposition: "Giới từ",
  conjunction: "Liên từ",
  pronoun: "Đại từ",
  determiner: "Hạn định từ",
  interjection: "Thán từ",
  phrase: "Cụm từ",
  other: "Khác",
};

/** Options of the part-of-speech select. */
export const POS_OPTIONS = (Object.keys(POS_NAMES) as PartOfSpeech[]).map((value) => ({
  value,
  label: `${POS_NAMES[value]} (${POS_LABELS[value]})`,
}));

/** "250+", or "990" for the top band. */
export const formatToeicTarget = (target: number | null): string => {
  if (target === null) return "TOEIC";
  return target >= 990 ? "990" : `${target}+`;
};

interface StatusView {
  label: string;
  tone: Tone;
}

export function describeProgress(progress: ProgressDto): StatusView {
  if (progress.isDue && progress.status !== "New") return { label: "Đến hạn", tone: "rose" };
  if (progress.status === "Mastered") return { label: "Đã thuộc", tone: "green" };
  if (progress.status === "Learning") return { label: "Đang học", tone: "blue" };
  return { label: "Mới", tone: "neutral" };
}

/** Words studied at least once. */
export const startedCount = ({ learning, mastered }: ProgressCounts): number => learning + mastered;

/** Share of studied words, 0..1. */
export const progressRatio = (counts: ProgressCounts): number =>
  counts.wordCount > 0 ? Math.min(1, startedCount(counts) / counts.wordCount) : 0;

export const progressLabel = (counts: ProgressCounts): string =>
  `${counts.mastered} đã thuộc, ${counts.learning} đang học, ${Math.max(
    0,
    counts.wordCount - startedCount(counts),
  )} chưa học`;

export const progressSegments = ({ learning, mastered }: ProgressCounts) => [
  { value: mastered, tone: "green" as const },
  { value: learning, tone: "blue" as const },
];

export type LessonStatus = "new" | "learning" | "done";

export const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  new: "Chưa học",
  learning: "Đang học",
  done: "Đã xong",
};

/** done: every word studied; learning: some; new: none. */
export function lessonStatus(counts: ProgressCounts): LessonStatus {
  const started = startedCount(counts);
  if (counts.wordCount > 0 && started >= counts.wordCount) return "done";
  if (started > 0) return "learning";
  return "new";
}

export const toCounts = (
  wordCount: number,
  progress: Pick<SetProgressDto, "learning" | "mastered"> | undefined,
): ProgressCounts => ({
  wordCount,
  learning: progress?.learning ?? 0,
  mastered: progress?.mastered ?? 0,
});
