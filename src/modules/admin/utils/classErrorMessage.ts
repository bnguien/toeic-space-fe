import { AxiosError } from "axios";

const messages: Record<string, string> = {
  class_not_found: "Không tìm thấy lớp học. Lớp có thể đã bị xóa hoặc thay đổi.",
  forbidden_class: "Bạn không có quyền truy cập lớp học này.",
  invalid_state: "Không thể thực hiện thao tác ở trạng thái hiện tại của lớp.",
  invalid_transition: "Không thể chuyển lớp sang trạng thái này.",
  restore_state_unknown:
    "Không xác định được trạng thái của lớp trước khi lưu trữ. Vui lòng liên hệ quản trị hệ thống.",
  delete_blocked: "Không thể xóa vĩnh viễn lớp vì vẫn còn dữ liệu liên quan.",
  required_dates: "Lớp cần có đầy đủ ngày bắt đầu và ngày kết thúc để hoạt động.",
  teacher_required: "Vui lòng phân công giáo viên hợp lệ cho lớp trước khi tiếp tục.",
  teacher_not_synchronized: "Thông tin giáo viên chưa được đồng bộ. Vui lòng thử lại sau.",
  notteacher: "Người được chọn không phải giáo viên. Vui lòng chọn giáo viên khác.",
  inactive: "Giáo viên không còn hoạt động. Vui lòng chọn giáo viên khác.",
  already_assigned: "Giáo viên này đã được phân công cho lớp.",
  duplicate_code: "Mã lớp đã tồn tại. Vui lòng nhập mã khác.",
  immutable_code: "Không thể thay đổi mã lớp sau khi tạo.",
  immutable_start_date: "Không thể thay đổi ngày bắt đầu sau khi lớp đã hoạt động.",
  invalid_class: "Thông tin lớp không hợp lệ. Vui lòng kiểm tra mã và tên lớp.",
  invalid_description: "Mô tả lớp không được vượt quá 2.000 ký tự.",
  invalid_date_range: "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.",
  validation_error: "Thông tin chưa hợp lệ. Vui lòng kiểm tra và thử lại.",
};

export function classErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    if (code && messages[code]) return messages[code];
    if (error.response?.status === 401 || error.response?.status === 403)
      return "Bạn không có quyền thực hiện thao tác này. Vui lòng đăng nhập lại nếu cần.";
    if (error.response?.status === 404) return messages.class_not_found;
  }
  return "Không thể hoàn tất thao tác. Vui lòng thử lại hoặc liên hệ quản trị hệ thống.";
}
