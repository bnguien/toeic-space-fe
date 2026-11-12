import { isAxiosError } from "axios";

import type { UserRole, VerificationFlowState } from "../types/auth.types";

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

export function getLoginErrorCode(error: unknown): string | null {
  if (!isAxiosError(error)) {
    return null;
  }
  const code = (error.response?.data as { code?: unknown } | undefined)?.code;
  return typeof code === "string" ? code : null;
}

export function getRegisterErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return "Không thể đăng ký tài khoản lúc này. Vui lòng thử lại.";
  }

  if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    return "Yêu cầu mất quá nhiều thời gian phản hồi. Vui lòng thử lại.";
  }

  if (!error.response) {
    return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.";
  }

  const status = error.response.status;
  if (status === 409) {
    return "Không thể đăng ký tài khoản với thông tin đã cung cấp. Vui lòng kiểm tra lại hoặc sử dụng thông tin khác.";
  }

  if (status === 429) {
    return "Bạn thao tác quá nhanh. Vui lòng thử lại sau.";
  }

  if (status === 400) {
    return "Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.";
  }

  if (status >= 500) {
    return "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.";
  }

  return "Không thể đăng ký tài khoản lúc này. Vui lòng thử lại.";
}

export function getVerifyErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return "Không thể xác thực mã OTP lúc này. Vui lòng thử lại.";
  }

  if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    return "Yêu cầu mất quá nhiều thời gian phản hồi. Vui lòng thử lại.";
  }

  if (!error.response) {
    return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.";
  }

  const code = (error.response.data as { code?: unknown } | undefined)?.code;
  if (code === "OTP_INVALID_OR_EXPIRED") {
    return "Mã OTP không đúng hoặc đã hết hạn. Vui lòng kiểm tra lại hoặc yêu cầu mã mới.";
  }

  const status = error.response.status;
  if (status === 400) {
    return "Mã OTP không đúng hoặc đã hết hạn. Vui lòng kiểm tra lại hoặc yêu cầu mã mới.";
  }

  if (status === 429) {
    return "Bạn đã nhập sai quá số lần cho phép hoặc thao tác quá nhanh. Vui lòng thử lại sau.";
  }

  if (status >= 500) {
    return "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.";
  }

  return "Không thể xác thực mã OTP lúc này. Vui lòng thử lại.";
}

export function getResendErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return "Không thể gửi lại mã OTP lúc này. Vui lòng thử lại.";
  }

  if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    return "Yêu cầu mất quá nhiều thời gian phản hồi. Vui lòng thử lại.";
  }

  if (!error.response) {
    return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.";
  }

  const code = (error.response.data as { code?: unknown } | undefined)?.code;
  if (code === "OTP_RATE_LIMIT_EXCEEDED" || error.response.status === 429) {
    return "Bạn vừa yêu cầu mã xác thực. Vui lòng thử lại sau.";
  }

  if (error.response.status >= 500) {
    return "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.";
  }

  return "Không thể gửi lại mã OTP lúc này. Vui lòng thử lại.";
}

export function getRetryAfterSeconds(error: unknown): number | null {
  if (!isAxiosError(error)) {
    return null;
  }

  const headerVal = error.response?.headers?.["retry-after"];
  if (typeof headerVal === "string" || typeof headerVal === "number") {
    const parsed = Number(headerVal);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const data = error.response?.data as Record<string, unknown> | undefined;
  if (data) {
    const bodyVal = data.retryAfter ?? data.retryDuration ?? data.cooldownSeconds;
    if (typeof bodyVal === "number" && bodyVal > 0) {
      return bodyVal;
    }
    if (typeof bodyVal === "string") {
      const parsed = Number(bodyVal);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
}

export function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) {
    return email;
  }

  const username = email.slice(0, atIndex);
  const domain = email.slice(atIndex);

  if (username.length <= 2) {
    return `${username[0] ?? ""}***${domain}`;
  }

  return `${username.slice(0, 2)}***${domain}`;
}

const VERIFICATION_STORAGE_KEY = "toeic_verify_flow";

export function getVerificationSession(): VerificationFlowState | null {
  try {
    const raw = sessionStorage.getItem(VERIFICATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<VerificationFlowState>;
    if (
      typeof parsed.email === "string" &&
      parsed.email.trim() &&
      typeof parsed.challengeId === "string" &&
      parsed.challengeId.trim()
    ) {
      return {
        email: parsed.email.trim(),
        challengeId: parsed.challengeId.trim(),
        userId: typeof parsed.userId === "string" ? parsed.userId : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function setVerificationSession(data: VerificationFlowState): void {
  try {
    sessionStorage.setItem(
      VERIFICATION_STORAGE_KEY,
      JSON.stringify({
        email: data.email,
        challengeId: data.challengeId,
        userId: data.userId,
      }),
    );
  } catch {
    // Ignore storage quota or environment restrictions
  }
}

export function updateVerificationChallenge(newChallengeId: string): void {
  const current = getVerificationSession();
  if (current) {
    setVerificationSession({
      ...current,
      challengeId: newChallengeId,
    });
  }
}

export function clearVerificationSession(): void {
  try {
    sessionStorage.removeItem(VERIFICATION_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export const AUTH_ROUTE_PATHS = ["/login", "/admin/login", "/register", "/verify-email"] as const;

export function isAuthPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  const normalized = lower.length > 1 && lower.endsWith("/") ? lower.slice(0, -1) : lower;
  return AUTH_ROUTE_PATHS.some(
    (route) => normalized === route || normalized.startsWith(`${route}/`),
  );
}

/**
 * Only same-origin paths are accepted, so a crafted ?next= link cannot send users to another site.
 * All auth page routes (such as /login, /admin/login, /register, /verify-email) are rejected
 * before using next to avoid redirect loops after successful authentication.
 */
export function getSafeRedirect(value: string | null, fallback = DEFAULT_AFTER_LOGIN): string {
  const safeFallback = isAuthPath(fallback) ? DEFAULT_AFTER_LOGIN : fallback;

  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return safeFallback;
  }

  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(value, origin);
    if (url.origin !== origin || isAuthPath(url.pathname)) {
      return safeFallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return safeFallback;
  }
}
