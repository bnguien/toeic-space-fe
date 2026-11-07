import { isAxiosError } from "axios";

import type { VideoProblemDto } from "../types/video.types";
import { getVideoErrorCode, getVideoErrorStatus } from "./open-video-error";
import { SubsPollError } from "./subs-polling";

/** The subtitle request was cancelled (reader closed / video changed): not an error to show. */
export function isAbortError(error: unknown): boolean {
  if (error instanceof Error && (error.name === "AbortError" || error.name === "CanceledError")) {
    return true;
  }
  return isAxiosError(error) && error.code === "ERR_CANCELED";
}

/** Studychill's Vietnamese copy for the subtitle errors of GET {videoId}/subs. */
export function subtitleErrorMessage(error: unknown): string {
  if (error instanceof SubsPollError) return error.message;
  const code = getVideoErrorCode(error);
  if (code === "lang_unavailable") {
    const data = isAxiosError(error)
      ? (error.response?.data as VideoProblemDto | undefined)
      : undefined;
    const langs = data?.unavailable?.join(", ") ?? "";
    return `Video này không có phụ đề cho: ${langs}.`;
  }
  if (code === "upstream_unavailable") {
    return "YouTube đang tạm chặn tải phụ đề. Thử lại sau ít phút nhé.";
  }
  if (code === "video_quota_exceeded") return "Đã hết hạn mức video mới trong giờ này.";
  return "Không tải được phụ đề.";
}

/** Temporary failures (timeout, 503, 429, network) can be retried; "no subtitles" cannot. */
export function isRetryableSubtitleError(error: unknown): boolean {
  if (error instanceof SubsPollError) return error.code === "subs_timeout";
  const status = getVideoErrorStatus(error);
  return status === 503 || status === 429 || !status;
}
