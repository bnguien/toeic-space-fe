import { isAxiosError } from "axios";

import type { UserRole } from "../types/auth.types";

export const CONTENT_MANAGER_ROLES: readonly UserRole[] = ["Admin", "Teacher"];

export const DEFAULT_AFTER_LOGIN = "/admin";

const LOGIN_ERRORS: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  AUTH_LOGIN_TEMPORARILY_LOCKED: "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.",
  AUTH_EMAIL_NOT_VERIFIED: "Tài khoản chưa xác thực email.",
  AUTH_ACCOUNT_LOCKED: "Tài khoản đã bị khóa hoặc tạm ngưng.",
};

export function getLoginErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return "Không thể đăng nhập lúc này. Vui lòng thử lại.";
  }

  const code = (error.response?.data as { code?: unknown } | undefined)?.code;
  if (typeof code === "string" && LOGIN_ERRORS[code]) {
    return LOGIN_ERRORS[code];
  }

  if (error.response?.status === 429) {
    return "Bạn thao tác quá nhanh. Vui lòng đợi một phút rồi thử lại.";
  }

  if (!error.response) {
    return "Không kết nối được máy chủ. Vui lòng kiểm tra mạng.";
  }

  return "Không thể đăng nhập lúc này. Vui lòng thử lại.";
}

/**
 * Only same-origin paths are accepted, so a crafted ?next= link cannot send users to another site.
 */
export function getSafeRedirect(value: string | null, fallback = DEFAULT_AFTER_LOGIN): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname.startsWith("/login")) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
