import { AxiosError } from "axios";

const messages: Record<string, string> = {
  course_not_found: "Không tìm thấy khóa học. Khóa học có thể đã bị xóa hoặc thay đổi.",
  module_not_found: "Không tìm thấy học phần này trong khóa học.",
  invalid_module_order: "Thứ tự học phần đã thay đổi. Danh sách đang được tải lại.",
  lesson_not_found: "Không tìm thấy bài học trong học phần này.",
  invalid_lesson: "Thông tin bài học chưa hợp lệ. Vui lòng kiểm tra lại.",
  invalid_lesson_order: "Thứ tự bài học đã thay đổi. Danh sách đang được tải lại.",
  invalid_sort_order: "Vị trí bài học không hợp lệ.",
  unconfirmed_media: "Tệp phương tiện chưa tải lên hoặc xác nhận hoàn tất. Vui lòng tải lại.",
  invalid_media: "Tệp không hợp lệ hoặc vượt quá dung lượng cho phép.",
  media_in_use: "Tệp đính kèm đã được sử dụng trong bài học.",
  upload_not_found: "Không tìm thấy phiên tải tệp.",
  upload_expired: "Phiên tải tệp đã hết hạn. Vui lòng tải lại.",
  upload_missing: "Không tìm thấy tệp trên kho lưu trữ.",
  upload_mismatch: "Tệp tải lên không khớp với định dạng hoặc dung lượng đã đăng ký.",
  forbidden_course: "Bạn không có quyền thao tác trên khóa học này.",
  duplicate_code: "Mã khóa học đã tồn tại. Vui lòng nhập mã khác.",
  duplicate_slug: "Đường dẫn tĩnh (slug) đã tồn tại. Vui lòng nhập slug khác.",
  invalid_course:
    "Thông tin khóa học chưa hợp lệ. Vui lòng kiểm tra mã, tên, đường dẫn slug và mô tả.",
  invalid_target_score:
    "Điểm mục tiêu không hợp lệ trong phạm vi kỳ thi hoặc không phải là bội số của 10.",
  publish_requirements:
    "Nội dung chưa đủ điều kiện để xuất bản. Vui lòng kiểm tra lại nội dung khóa học hoặc bài học.",
  invalid_state: "Không thể thực hiện thao tác ở trạng thái hiện tại của khóa học.",
  unconfirmed_thumbnail:
    "Ảnh đại diện chưa được xác nhận hoàn tất tải lên. Vui lòng thử tải ảnh lại.",
  invalid_thumbnail:
    "Ảnh đại diện chỉ hỗ trợ định dạng JPEG, PNG, WebP và dung lượng từ 1 byte đến 5MB.",
  storage_unavailable: "Dịch vụ lưu trữ ảnh đang tạm thời không khả dụng. Vui lòng thử lại sau.",
  validation_error: "Dữ liệu nhập vào chưa hợp lệ. Vui lòng kiểm tra lại.",
};

export function courseErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      { code?: string; detail?: string; title?: string } | undefined;
    const code = data?.code;
    if (code && messages[code]) return messages[code];
    if (data?.detail) return data.detail;
    if (error.response?.status === 401 || error.response?.status === 403)
      return "Bạn không có quyền thực hiện thao tác này. Vui lòng đăng nhập lại nếu cần.";
    if (error.response?.status === 404) {
      if (error.config?.url?.includes("/uploads")) {
        return "Không tìm thấy dịch vụ tải ảnh lên (404). Vui lòng kiểm tra lại gateway hoặc thử lại sau.";
      }
      return messages.course_not_found;
    }
    if (error.response?.status === 409)
      return data?.detail || "Dữ liệu xung đột với trạng thái hiện tại của hệ thống.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Không thể hoàn tất thao tác. Vui lòng thử lại hoặc liên hệ quản trị hệ thống.";
}

export const courseErrorCodeMessage = (code: string | null | undefined) =>
  (code && messages[code]) || "Không thể xử lý nội dung này. Vui lòng thử lại.";
