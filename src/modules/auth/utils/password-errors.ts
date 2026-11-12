import { isAxiosError } from "axios";

export function getPasswordErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return "Không thể thực hiện yêu cầu. Vui lòng thử lại.";
  if (!error.response) return "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.";

  const code = (error.response.data as { code?: string } | undefined)?.code;
  switch (code) {
    case "OTP_INVALID_OR_EXPIRED":
      return "Mã OTP không đúng, đã hết hạn hoặc đã sử dụng. Vui lòng yêu cầu mã mới nếu cần.";
    case "TOKEN_INVALID":
    case "TOKEN_EXPIRED":
    case "TOKEN_REVOKED":
      return "Phiên đặt lại mật khẩu đã hết hạn hoặc đã sử dụng. Vui lòng yêu cầu mã OTP mới.";
    case "AUTH_PASSWORD_SAME_AS_OLD":
      return "Mật khẩu mới phải khác mật khẩu hiện tại.";
    case "AUTH_INVALID_CREDENTIALS":
      return "Mật khẩu hiện tại không đúng. Vui lòng kiểm tra lại.";
    case "AUTH_PASSWORDS_DO_NOT_MATCH":
      return "Mật khẩu xác nhận không khớp.";
    case "VALIDATION_ERROR":
      return "Vui lòng kiểm tra các trường. Mật khẩu cần 8–128 ký tự, một chữ in hoa và một ký tự đặc biệt; xác nhận phải khớp.";
  }
  if (error.response.status === 429)
    return "Bạn thao tác quá nhanh. Vui lòng đợi một phút rồi thử lại.";
  if (error.response.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  return "Không thể thực hiện yêu cầu lúc này. Vui lòng thử lại.";
}
