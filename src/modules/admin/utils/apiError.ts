import { isAxiosError } from "axios";

import { InvalidResponseError } from "../api/schemas";

/** HTTP status of a failed request, if any. */
export const errorStatus = (error: unknown) =>
  isAxiosError(error) ? error.response?.status : undefined;

/** Short Vietnamese message for a failed admin request. */
export function apiErrorMessage(error: unknown, messages: Record<string, string> = {}): string {
  if (error instanceof InvalidResponseError) {
    return "Dữ liệu máy chủ trả về không đúng định dạng. Vui lòng báo cho nhóm phát triển.";
  }
  if (!isAxiosError(error)) {
    return "Đã có lỗi xảy ra. Vui lòng thử lại.";
  }
  if (!error.response) {
    return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
  }

  const code = (error.response.data as { code?: unknown } | undefined)?.code;
  if (typeof code === "string" && messages[code]) {
    return messages[code];
  }

  switch (error.response.status) {
    case 400:
      return "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.";
    case 401:
      return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
    case 403:
      return "Tài khoản của bạn không có quyền xem nội dung này.";
    case 404:
      return "Không tìm thấy dữ liệu.";
    case 409:
      return "Dữ liệu vừa được thay đổi. Tải lại và thử lại.";
    default:
      return "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";
  }
}
