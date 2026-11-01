import { isAxiosError } from "axios";

/** ProblemDetails `code` values the Content service is expected to send (snake_case). */
const CODE_MESSAGES: Record<string, string> = {
  vocabulary_stage_not_found: "Không tìm thấy chặng từ vựng.",
  vocabulary_set_not_found: "Không tìm thấy bài học.",
  vocabulary_word_not_found: "Không tìm thấy từ vựng.",
  stage_not_found: "Không tìm thấy chặng từ vựng.",
  set_not_found: "Không tìm thấy bài học.",
  word_not_found: "Không tìm thấy từ vựng.",
  invalid_study_queue: "Yêu cầu ôn tập không hợp lệ.",
  invalid_grade: "Kết quả ôn tập không hợp lệ.",
  vocabulary_folder_not_found: "Không tìm thấy thư mục.",
  folder_name_taken: "Tên thư mục đã tồn tại.",
  saved_word_not_found: "Không tìm thấy từ đã lưu.",
  word_not_custom: "Chỉ sửa được từ tự thêm.",
};

export const getErrorStatus = (error: unknown): number | undefined =>
  isAxiosError(error) ? error.response?.status : undefined;

export function getVocabularyErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return "Đã có lỗi xảy ra.";
  if (!error.response) return "Không thể kết nối máy chủ.";

  const data = error.response.data as { code?: unknown } | undefined;
  const code = typeof data?.code === "string" ? data.code : undefined;
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  const { status } = error.response;
  if (status === 401) return "Phiên đăng nhập đã hết hạn.";
  if (status === 403) return "Bạn không có quyền truy cập.";
  if (status === 404) return "Không tìm thấy nội dung.";
  if (status === 409) return "Dữ liệu đã tồn tại.";
  if (status === 400 || status === 422) return "Yêu cầu không hợp lệ.";
  if (status === 429) return "Thao tác quá nhanh, hãy thử lại sau.";
  if (status >= 500) return "Máy chủ đang gặp sự cố.";
  return "Không tải được dữ liệu.";
}

/** Retry transient failures only. */
export const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  const status = getErrorStatus(error);
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < 2;
};
