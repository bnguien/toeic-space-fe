import { isAxiosError } from "axios";

import type { VideoProblemDto } from "../types/video.types";

/** Where an "open video" attempt started: the copy of the fallback message differs (Studychill). */
export type OpenVideoContext = "link" | "catalog" | "auto";

/** Studychill's Vietnamese copy for the coded errors of POST resolve. */
const CODE_MESSAGES: Record<string, string> = {
  invalid_video_url:
    "Không nhận ra link YouTube. Dán link dạng youtube.com/watch?v=... hoặc youtu.be/...",
  video_quota_exceeded:
    "Bạn đã mở 12 video mới trong 1 giờ. Nghỉ một chút rồi thử lại nhé — YouTube sẽ chặn nếu gọi quá dày.",
  no_english:
    "Video này chưa có phụ đề tiếng Anh. Mình đã ẩn nó khỏi danh mục — thử video khác nhé.",
  video_unavailable: "Video này không có phụ đề nào.",
  upstream_unavailable: "YouTube đang tạm chặn tải phụ đề. Thử lại sau ít phút nhé.",
};

const FALLBACK: Record<OpenVideoContext, string> = {
  link: "Không mở được video này. Vui lòng kiểm tra lại đường link.",
  catalog: "Chưa mở được video này. Thử lại sau ít phút nhé.",
  auto: "Không mở được video này.",
};

export const getVideoErrorStatus = (error: unknown): number | undefined =>
  isAxiosError(error) ? error.response?.status : undefined;

export function getVideoErrorCode(error: unknown): string {
  if (!isAxiosError(error)) return "";
  const data = error.response?.data as VideoProblemDto | undefined;
  return typeof data?.code === "string" ? data.code : "";
}

/** 401/403: the session is gone — not the link's fault, so no error text (the page shows the guest state). */
export const isAuthError = (error: unknown): boolean => {
  const status = getVideoErrorStatus(error);
  return status === 401 || status === 403;
};

export function openVideoErrorMessage(error: unknown, context: OpenVideoContext): string {
  return CODE_MESSAGES[getVideoErrorCode(error)] ?? FALLBACK[context];
}
