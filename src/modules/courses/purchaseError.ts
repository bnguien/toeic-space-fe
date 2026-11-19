import { isAxiosError } from "axios";

const messages: Record<string, string> = {
  already_enrolled: "Bạn đã sở hữu khóa học này.",
  already_purchased: "Bạn đã mua khóa học này. Vui lòng kiểm tra Khóa học của tôi.",
  course_full: "Khóa học đã hết chỗ. Chỗ trống có thể đã được người khác đặt trước.",
  not_purchasable: "Khóa học không còn mở bán hoặc đã thuộc về bạn.",
  pending_checkout:
    "Bạn đang có đơn chờ thanh toán cho khóa học này. Hãy hoàn tất hoặc chờ đơn hết hạn.",
  checkout_reference_conflict: "Phiên thanh toán không còn hợp lệ. Vui lòng tải lại trang.",
  payment_not_configured: "Thanh toán chuyển khoản hiện chưa khả dụng. Vui lòng thử lại sau.",
  invalid_coupon: "Mã giảm giá không hợp lệ.",
  coupon_limit: "Mã giảm giá đã hết lượt sử dụng hoặc vượt giới hạn của bạn.",
  duplicate_code: "Mã giảm giá đã tồn tại.",
  invalid_request: "Thông tin mã giảm giá chưa hợp lệ. Vui lòng kiểm tra lại.",
  checkout_expired: "Phiên giữ chỗ đã hết hạn. Vui lòng tạo đơn mới.",
  course_unavailable:
    "Khóa học không còn chỗ trống hoặc trạng thái đã thay đổi. Vui lòng kiểm tra lại.",
  content_unavailable: "Dịch vụ khóa học đang tạm thời không khả dụng. Vui lòng thử lại.",
  invalid_course_pricing: "Giá phải là số nguyên VND không âm; sức chứa phải lớn hơn 0.",
  capacity_below_occupied: "Sức chứa không thể nhỏ hơn số chỗ đã đăng ký hoặc đang đặt trước.",
  promotion_overlap: "Khuyến mãi đang trùng thời gian với khuyến mãi khác của khóa học đã chọn.",
  invalid_promotion:
    "Thông tin khuyến mãi chưa hợp lệ. Vui lòng kiểm tra lại thời gian, số tiền và khóa học.",
  promotion_limit: "Giới hạn mới nhỏ hơn số lượt đã dùng hoặc đang giữ.",
  promotion_unavailable: "Khuyến mãi vừa kết thúc hoặc đã hết lượt. Vui lòng kiểm tra lại giá.",
  coupon_in_use: "Mã giảm giá đã có lượt sử dụng nên không thể xóa. Hãy dùng Tắt mã thay thế.",
  promotion_in_use:
    "Khuyến mãi đã có lượt sử dụng nên không thể xóa. Hãy dùng Tắt khuyến mãi thay thế.",
  promotion_not_found: "Không tìm thấy khuyến mãi.",
};

export function purchaseError(error: unknown): string {
  if (isAxiosError(error)) {
    const response = error.response?.data as
      { code?: string; detail?: string; message?: string } | undefined;
    if (response?.code && messages[response.code]) return messages[response.code];
    const detail = (response?.detail ?? response?.message ?? "").toLowerCase();
    if (detail.includes("coupon")) {
      if (detail.includes("limit"))
        return "Mã giảm giá đã hết lượt sử dụng hoặc vượt giới hạn của bạn.";
      if (detail.includes("not found")) return "Không tìm thấy mã giảm giá.";
      return "Mã giảm giá đã hết hạn, chưa hiệu lực hoặc không áp dụng cho khóa học này.";
    }
    if (detail.includes("existing usage")) return "Giới hạn mới nhỏ hơn số lượt đã sử dụng.";
    if (error.response?.status === 401)
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.response?.status === 403) return "Bạn không có quyền truy cập nội dung này.";
    if (error.response?.status === 404) return "Không tìm thấy nội dung hoặc đơn hàng này.";
    if (error.response?.status === 409)
      return "Dữ liệu đã thay đổi. Vui lòng kiểm tra lại và thử lại.";
  }
  return "Không thể kết nối dịch vụ. Vui lòng thử lại.";
}
