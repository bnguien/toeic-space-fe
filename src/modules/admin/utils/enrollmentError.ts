import { isAxiosError } from "axios";
import { apiErrorMessage } from "./apiError";

const messages: Record<string, string> = {
  already_enrolled: "Học viên đã có trong lớp.",
  enrollment_not_active:
    "Học viên không còn ghi danh hoạt động trong lớp. Vui lòng tải lại danh sách.",
  enrollment_not_found: "Không tìm thấy lượt ghi danh. Vui lòng tải lại danh sách.",
  invalid_state: "Trạng thái lớp hiện tại không cho phép thêm hoặc rút học viên.",
  student_not_synchronized: "Dữ liệu học viên chưa đồng bộ. Vui lòng thử lại sau.",
  unique_constraint: "Ghi danh bị xung đột. Danh sách đang được làm mới, vui lòng kiểm tra lại.",
  concurrency_conflict: "Dữ liệu đã thay đổi. Danh sách đang được làm mới, vui lòng thử lại.",
  invalid_import_file:
    "Tệp không hợp lệ. Chọn CSV UTF-8 hoặc .xlsx, tối đa 2 MB và 1.000 dòng; dòng tiêu đề cần có đúng một trong hai cột studentId hoặc email.",
  invalid_student_id: "Mã học viên không hợp lệ.",
  invalid_email: "Email không hợp lệ.",
  missing_student: "Thiếu mã hoặc email học viên.",
  not_student: "Tài khoản không phải học viên.",
  unverified_student: "Học viên chưa xác minh email.",
  inactive_student: "Học viên không còn hoạt động.",
};

export const enrollmentErrorMessage = (error: unknown) => apiErrorMessage(error, messages);

export const enrollmentRowErrorMessage = (code: string | null) =>
  (code && messages[code]) || "Không thể ghi danh học viên ở dòng này.";

export const isEnrollmentConflict = (error: unknown) => {
  const code = isAxiosError(error)
    ? (error.response?.data as { code?: unknown } | undefined)?.code
    : undefined;
  return code === "unique_constraint" || code === "concurrency_conflict";
};
