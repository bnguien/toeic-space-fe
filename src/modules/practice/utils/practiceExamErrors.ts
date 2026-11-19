/** Vietnamese messages for errors of the attempt flow (snake_case codes of ErrorCodes.cs). */

interface ErrorLike {
  response?: { status?: number; data?: { code?: string; errorCode?: string; reason?: string } };
  code?: string;
}

/** Error code of an Axios error (`code` or `errorCode` of the body), lower-cased; "" otherwise. */
export function errorCodeOf(error: unknown): string {
  const data = (error as ErrorLike)?.response?.data;
  return String(data?.code ?? data?.errorCode ?? "").toLowerCase();
}

export const errorStatusOf = (error: unknown) => (error as ErrorLike)?.response?.status;

const MESSAGES: Record<string, string> = {
  answer_locked: "Câu này đã được chấm nên không đổi đáp án được nữa.",
  attempt_time_up: "Đã hết giờ làm bài. Bài sẽ được nộp với các đáp án đã lưu.",
  attempt_not_active: "Bài làm này đã kết thúc hoặc đã bị bỏ.",
  attempt_not_completed: "Bài làm chưa được nộp nên chưa có kết quả.",
  check_not_allowed: "Thi thử không cho kiểm tra đáp án trước khi nộp bài.",
  nothing_to_practice: "Không còn câu nào phù hợp với lựa chọn này.",
  stale_start_generation: "Bộ luyện tập vừa thay đổi. Tải lại rồi thử lại nhé.",
  concurrency_conflict: "Dữ liệu vừa thay đổi ở nơi khác. Tải lại rồi thử lại nhé.",
  answer_revision_conflict: "Đáp án đã thay đổi ở phiên khác. Tải lại để chọn bản muốn giữ.",
  media_preservation_failed:
    "Chưa chuẩn bị được hình ảnh hoặc âm thanh của đề. Thử lại sau ít phút.",
};

/** Learner-facing message of an attempt-flow error. */
export function practiceExamError(error: unknown, fallback?: string): string {
  const code = errorCodeOf(error);
  if (code && MESSAGES[code]) return MESSAGES[code];
  const status = errorStatusOf(error);
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.";
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (status === 404) return "Không tìm thấy bài làm hoặc đề này.";
  if (status === 409) return "Bài làm vừa thay đổi ở phiên khác. Tải lại rồi thử lại nhé.";
  if ((error as ErrorLike)?.code === "ECONNABORTED")
    return "Máy chủ phản hồi quá lâu. Kiểm tra kết nối rồi thử lại.";
  return fallback ?? "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
}
