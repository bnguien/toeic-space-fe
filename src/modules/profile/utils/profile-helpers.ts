import { isAxiosError } from "axios";

import { env } from "@/config/env";
import { normalizePhoneNumber } from "@/shared/utils/phone";

import type { ProfileFormValues } from "../schemas/profile.schema";
import {
  UserGender,
  type UpdateUserProfileRequest,
  type UserProfile,
} from "../types/profile.types";

/**
 * Extracts the relative avatar object key from a pathname or URL.
 * R2 presigned URLs contain the bucket name in the path (/toeic-space-media/avatars/user-xxx),
 * whereas the public R2/CDN domain serves directly from the bucket root (/avatars/user-xxx).
 */
export function extractAvatarKey(pathname: string): string {
  const cleanPath = pathname.replace(/^\/+/, "");
  const avatarIndex = cleanPath.indexOf("avatars/");
  if (avatarIndex !== -1) {
    return cleanPath.slice(avatarIndex);
  }
  return cleanPath;
}

/**
 * Normalizes an avatar URL:
 * 1. Strips redundant bucket name prefixes (e.g. /toeic-space-media/avatars/ -> /avatars/)
 * 2. Strips temporary presigned AWS S3 query params (X-Amz-...)
 * 3. Preserves cache-busting timestamp params (?v=... or ?t=...)
 * 4. Resolves relative keys (avatars/user-xxx) to full CDN URLs using VITE_AVATAR_CDN_URL
 */
export function normalizeAvatarUrl(url?: string | null): string | null {
  if (!url || !url.trim()) return null;

  let clean = url.trim().replace(/\/toeic-space-media\/avatars\//i, "/avatars/");

  // Extract cache-busting version parameter if present (?v=... or ?t=...)
  let versionParam = "";
  const vMatch = clean.match(/[?&](v|t)=(\d+)/);
  if (vMatch) {
    versionParam = `?${vMatch[1]}=${vMatch[2]}`;
  }

  // Remove AWS presigned query params (X-Amz-...) or other query strings
  if (clean.includes("?")) {
    clean = clean.split("?")[0]!;
  }

  // If clean is a relative key (e.g. avatars/user-xxx or /avatars/user-xxx), prepend CDN base URL
  if (
    !clean.startsWith("http://") &&
    !clean.startsWith("https://") &&
    !clean.startsWith("data:") &&
    !clean.startsWith("blob:")
  ) {
    const key = extractAvatarKey(clean);
    const cdnBase = env.avatarCdnUrl || "";
    clean = cdnBase ? `${cdnBase}/${key}` : `/${key}`;
  }

  return versionParam ? `${clean}${versionParam}` : clean;
}

/**
 * Resolves the public CDN/R2 URL from the presigned upload URL.
 * Reuses the configured VITE_AVATAR_CDN_URL environment variable if set.
 * Extracts the clean object key starting from `avatars/` to strip bucket path prefixes.
 * Appends a cache-busting timestamp (?v=...) so browser and CDN cache immediately refresh.
 */
export function resolvePublicAvatarUrl(uploadUrl: string): string {
  const timestamp = Date.now();
  try {
    const parsed = new URL(uploadUrl);
    const key = extractAvatarKey(parsed.pathname);

    if (env.avatarCdnUrl) {
      return `${env.avatarCdnUrl}/${key}?v=${timestamp}`;
    }

    return `${parsed.origin}/${key}?v=${timestamp}`;
  } catch {
    const withoutQuery = uploadUrl.split("?")[0] ?? uploadUrl;
    const normalized = normalizeAvatarUrl(withoutQuery) ?? withoutQuery;
    return `${normalized}?v=${timestamp}`;
  }
}

/**
 * Prepares the update payload for PUT /api/v1/users/me.
 * Adheres strictly to backend nullable field behavior:
 * - Does not send userId
 * - Does not send empty or null values that would corrupt nullable fields
 * - Preserves existing values when field is untouched
 */
export function buildUpdateProfilePayload(
  current: UserProfile,
  values: ProfileFormValues,
): UpdateUserProfileRequest {
  const payload: UpdateUserProfileRequest = {
    fullName: values.fullName.trim(),
  };

  // Phone
  if (values.phone && values.phone.trim()) {
    payload.phone = normalizePhoneNumber(values.phone) ?? values.phone.trim();
  } else if (current.phone) {
    payload.phone = current.phone;
  }

  // Avatar URL (normalized to strip unwanted bucket path prefixes)
  if (values.avatarUrl && values.avatarUrl.trim()) {
    payload.avatarUrl = normalizeAvatarUrl(values.avatarUrl) ?? values.avatarUrl.trim();
  } else if (current.avatarUrl) {
    payload.avatarUrl = normalizeAvatarUrl(current.avatarUrl) ?? current.avatarUrl;
  }

  // Date of birth
  if (values.dateOfBirth && values.dateOfBirth.trim()) {
    payload.dateOfBirth = values.dateOfBirth.trim();
  } else if (current.dateOfBirth) {
    payload.dateOfBirth = current.dateOfBirth;
  }

  // Gender (Backend expects integer enum: Male = 1, Female = 2, Other = 3)
  const normalizedGender =
    normalizeGenderToEnum(values.gender) ?? normalizeGenderToEnum(current.gender);
  if (normalizedGender !== undefined) {
    payload.gender = normalizedGender;
  }

  // Biography
  if (values.biography !== undefined && values.biography !== null && values.biography.trim()) {
    payload.biography = values.biography.trim();
  } else if (current.biography) {
    payload.biography = current.biography;
  }

  // Target score
  if (values.targetScore !== undefined && values.targetScore !== null) {
    payload.targetScore = values.targetScore;
  } else if (current.targetScore) {
    payload.targetScore = current.targetScore;
  }

  // Current level
  if (values.currentLevel && values.currentLevel.trim()) {
    payload.currentLevel = values.currentLevel.trim();
  } else if (current.currentLevel) {
    payload.currentLevel = current.currentLevel;
  }

  return payload;
}

/**
 * Extracts a readable error message from API response errors.
 */
export function getProfileErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    if (error instanceof Error) {
      return error.message;
    }
    return "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
  }

  if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    return "Yêu cầu mất quá nhiều thời gian phản hồi. Vui lòng kiểm tra lại đường truyền mạng.";
  }

  if (!error.response) {
    return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.";
  }

  const { status, data } = error.response;

  // Check structured backend validation error response:
  // e.g. { message: "...", errors: { field: ["error"] } }
  if (typeof data === "object" && data !== null) {
    const errorObj = data as {
      message?: string;
      errors?: Record<string, string[] | string>;
      title?: string;
    };

    if (errorObj.errors && typeof errorObj.errors === "object") {
      const messages = Object.entries(errorObj.errors)
        .flatMap(([, val]) => (Array.isArray(val) ? val : [val]))
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join(". ");
      }
    }

    if (typeof errorObj.message === "string" && errorObj.message.trim()) {
      return errorObj.message;
    }

    if (typeof errorObj.title === "string" && errorObj.title.trim()) {
      return errorObj.title;
    }
  }

  if (status === 400) {
    return "Dữ liệu cập nhật không hợp lệ. Vui lòng kiểm tra lại các trường thông tin.";
  }

  if (status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (status === 404) {
    return "Không tìm thấy thông tin tài khoản người dùng trong hệ thống.";
  }

  if (status >= 500) {
    return "Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút.";
  }

  return "Không thể hoàn thành thao tác lúc này. Vui lòng thử lại.";
}

/**
 * Formats ISO date string YYYY-MM-DD to DD/MM/YYYY for friendly Vietnamese display.
 */
export function formatDateOfBirth(isoDate?: string | null): string {
  if (!isoDate || !isoDate.trim()) return "Chưa cập nhật";
  const parts = isoDate.split("-");
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

/**
 * Formats file size in bytes to readable string (e.g. 142 KB).
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Normalizes any gender input (number enum, numeric string, or label string)
 * into the strict backend integer enum UserGender (Male = 1, Female = 2, Other = 3).
 */
export function normalizeGenderToEnum(
  gender?: UserGender | number | string | null,
): UserGender | undefined {
  if (gender === null || gender === undefined || gender === "") return undefined;

  // Handle number or numeric string (e.g. 1, "1")
  const num = typeof gender === "number" ? gender : Number(gender);
  if (
    !Number.isNaN(num) &&
    (num === UserGender.Male || num === UserGender.Female || num === UserGender.Other)
  ) {
    return num as UserGender;
  }

  // Handle textual representations (e.g. "Male", "Female", "Other", "Nam", "Nữ")
  const lower = String(gender).trim().toLowerCase();
  if (lower === "male" || lower === "nam") return UserGender.Male;
  if (lower === "female" || lower === "nữ" || lower === "nu") return UserGender.Female;
  if (lower === "other" || lower === "khác" || lower === "khac") return UserGender.Other;

  return undefined;
}

/**
 * Converts a gender value into the string value expected by the Select form component ("1", "2", "3" or "").
 */
export function getGenderFormValue(gender?: UserGender | number | string | null): string {
  const normalized = normalizeGenderToEnum(gender);
  return normalized !== undefined ? String(normalized) : "";
}

/**
 * Formats user gender into localized Vietnamese display text ("Nam", "Nữ", "Khác", or "Chưa cập nhật").
 */
export function formatGender(gender?: UserGender | number | string | null): string {
  const normalized = normalizeGenderToEnum(gender);
  if (normalized === undefined) return "Chưa cập nhật";

  switch (normalized) {
    case UserGender.Male:
      return "Nam";
    case UserGender.Female:
      return "Nữ";
    case UserGender.Other:
      return "Khác";
    default:
      return "Chưa cập nhật";
  }
}
