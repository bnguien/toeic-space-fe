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

  // Phòng học & Cơ sở
  room_change_reason_required: "Vui lòng nhập lý do thay đổi hoặc xóa phòng học mặc định.",
  invalid_room_reason: "Lý do thay đổi phòng học không được vượt quá 500 ký tự.",
  room_not_found: "Không tìm thấy phòng học đã chọn.",
  center_not_found: "Không tìm thấy cơ sở đã chọn.",
  inactive_room: "Phòng học và cơ sở phải đang ở trạng thái hoạt động.",
  room_too_small: "Sức chứa phòng học nhỏ hơn số lượng học viên đang ghi danh.",
  room_required: "Lịch học trực tiếp (Offline) yêu cầu lớp phải có phòng học mặc định.",
  center_name_required: "Tên cơ sở đào tạo là bắt buộc.",
  room_name_required: "Tên phòng học là bắt buộc.",
  duplicate_room_name: "Tên phòng học đã tồn tại trong cơ sở này.",
  duplicate_center_name: "Tên cơ sở đã tồn tại.",

  // Lịch học & Buổi học
  schedule_conflict:
    "Xung đột lịch: Giáo viên hoặc phòng học đã có buổi học khác trong khung giờ này.",
  concurrency_conflict:
    "Dữ liệu đã bị thay đổi bởi thao tác khác. Vui lòng tải lại trang và thử lại.",
  stale_schedule_version:
    "Lịch định kỳ đã bị thay đổi bởi thao tác khác. Vui lòng tải lại và thử lại.",
  invalid_schedule:
    "Lịch học định kỳ không hợp lệ. Vui lòng kiểm tra thứ, giờ học và khoảng ngày hiệu lực.",
  invalid_session: "Thông tin buổi học không hợp lệ.",
  teacher_not_assigned: "Giáo viên phải đang hoạt động và được phân công cho lớp học này.",
  outside_class_dates:
    "Thời gian buổi học / lịch định kỳ phải nằm trong khoảng thời gian diễn ra lớp học.",
  online_room: "Buổi học trực tuyến (Online) không thể gán phòng học trực tiếp.",
  reason_required: "Vui lòng nhập lý do thực hiện thao tác (tối đa 500 ký tự).",
  session_not_finished: "Không thể đánh dấu hoàn thành buổi học trước thời gian kết thúc dự kiến.",
  teacher_change_forbidden: "Chỉ Quản trị viên mới có quyền thay đổi giáo viên của buổi học.",
  session_not_found: "Không tìm thấy buổi học.",
  schedule_not_found: "Không tìm thấy lịch học định kỳ.",
  invalid_cancel_range: "Khoảng thời gian hủy buổi học và lý do không hợp lệ.",
  invalid_time_zone: "Múi giờ không hợp lệ.",
  cancelled_session: "Buổi học đã hủy không thể thay đổi điểm danh.",
  invalid_attendance: "Điểm danh không hợp lệ. Chọn tối đa 100 học viên và kiểm tra ghi chú.",
  student_not_enrolled: "Học viên không còn ghi danh hợp lệ trong lớp.",
  invalid_filter: "Khoảng ngày hoặc bộ lọc buổi học không hợp lệ.",
  meet_retry_unavailable:
    "Chỉ có thể thử lại khi buổi học trực tuyến đang ở trạng thái tạo phòng thất bại.",
  meet_link_unavailable: "Liên kết phòng học hiện không khả dụng.",
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
