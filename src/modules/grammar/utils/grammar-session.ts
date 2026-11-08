/** In-memory grammar exercise sessions (shared by Bài tập and Sổ lỗi) + friendly API error messages. */
import { isAxiosError } from "axios";

export const quickCheckBlock = (code: string): string => `qc-${code.split(".").pop()}`;

/**
 * Unfinished work per block ("04:mt", "04:qc-1", "stage-01") — lives until the page reloads. The value is the
 * attempt view state (typed by the exercise view).
 */
export const attemptDrafts = new Map<string, unknown>();

/** ProblemDetails `code` of a failed request ('' when none). */
export function errorCode(err: unknown): string {
  if (!isAxiosError(err)) return "";
  const data = err.response?.data as { code?: unknown } | undefined;
  return typeof data?.code === "string" ? data.code : "";
}

export function errorMessage(err: unknown): string {
  const code = errorCode(err);
  if (code === "rate_limited") {
    const header = isAxiosError(err) ? err.response?.headers?.["retry-after"] : undefined;
    const s = Number(header) || 0;
    return `Bạn thao tác hơi nhanh, chờ ${s ? `${s} giây` : "một chút"} rồi thử lại nhé.`;
  }
  if (code === "stage_locked")
    return "Test chặng chưa mở — hoàn thành thêm chuyên đề của chặng nhé.";
  if (code === "grammar_attempt_not_found") {
    return "Lượt làm này đã hết hạn. Bấm “Làm lại” để làm lượt mới.";
  }
  if (code === "grammar_content_unavailable")
    return "Máy chủ đang cập nhật bài, thử lại sau ít phút.";
  if (isAxiosError(err) && err.response) {
    const data = err.response.data as { detail?: unknown } | undefined;
    return typeof data?.detail === "string" && data.detail
      ? data.detail
      : "Chưa gửi được, thử lại nhé.";
  }
  return "Chưa gửi được — kiểm tra mạng rồi thử lại.";
}
