/** Score display helpers for the result page and the score overlay. Pure. */
import type { AttemptScore, Cefr } from "../types/practice-exam.types.ts";

/** CEFR band of a total score, with the same thresholds and titles as the server. */
export function cefrFallback(totalScaled: number): Cefr {
  if (totalScaled >= 905) return { level: "C2", title: "Thành thạo cao cấp" };
  if (totalScaled >= 785) return { level: "C1", title: "Vững vàng cao cấp" };
  if (totalScaled >= 605) return { level: "B2", title: "Trung cấp trên" };
  if (totalScaled >= 405) return { level: "B1", title: "Trung cấp cơ bản" };
  if (totalScaled >= 255) return { level: "A2", title: "Sơ cấp" };
  return { level: "A1", title: "Cơ bản" };
}

/** Server CEFR when present, else the fallback; null when the total is not scaled. */
export function cefrOf(score: Pick<AttemptScore, "totalScaled" | "cefr">): Cefr | null {
  if (score.cefr?.level) return score.cefr;
  return score.totalScaled == null ? null : cefrFallback(score.totalScaled);
}

/** Comment under the predicted score (bands ≥785 / ≥605 / ≥405 / else). */
export function scoreComment(totalScaled: number): string {
  if (totalScaled >= 785)
    return "Xuất sắc! Bạn đủ sức giao tiếp và làm việc chuyên nghiệp bằng tiếng Anh.";
  if (totalScaled >= 605)
    return "Rất tốt! Khả năng nghe – đọc đáp ứng tốt môi trường doanh nghiệp quốc tế.";
  if (totalScaled >= 405) return "Khá tốt! Nền tảng đã chắc, xem lại câu sai để bứt phá nhé.";
  return "Cố lên! Mở “Chi tiết” từng câu sai bên dưới để hiểu vì sao — lần sau sẽ khác.";
}

export type BarLevel = "good" | "mid" | "low";

/** Mini bar colour band of a percentage: ≥70 good, ≥45 mid, else low. */
export const barLevel = (percent: number): BarLevel =>
  percent >= 70 ? "good" : percent >= 45 ? "mid" : "low";

/** Rounded percentage 0..100 (0 when the total is 0). */
export const percentOf = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

/** "mm:ss", or "h:mm:ss" from one hour. Negative input counts as 0. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Counts of a result for the KPI row. */
export function scoreCounts(score: Pick<AttemptScore, "questionCount" | "answered" | "correct">) {
  const wrong = Math.max(0, score.answered - score.correct);
  const skipped = Math.max(0, score.questionCount - score.answered);
  return {
    correct: score.correct,
    wrong,
    skipped,
    correctPercent: percentOf(score.correct, score.questionCount),
  };
}

/**
 * Headline of a score: the scaled total out of 990 when the attempt covers whole sections,
 * otherwise the percentage of correct answers.
 */
export function scoreHeadline(score: AttemptScore): {
  kind: "scaled" | "percent";
  value: number;
  max: number;
  label: string;
} {
  if (score.totalScaled != null) {
    return {
      kind: "scaled",
      value: score.totalScaled,
      max: 990,
      label: `${score.totalScaled}/990`,
    };
  }
  const value = percentOf(score.correct, score.questionCount);
  return { kind: "percent", value, max: 100, label: `${value}%` };
}

/** Date + time in Vietnamese format, e.g. "18/11/2026 21:05". */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
