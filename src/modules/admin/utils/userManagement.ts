import type { UserRole } from "@/modules/auth";
import type { Tone } from "../components/ui";
import type { ManagedUserDetail, ManagedUserStatus } from "../types/user-management.types";
import { apiErrorMessage, errorStatus } from "./apiError";

export const ROLE_LABELS: Record<UserRole, string> = {
  User: "Học viên",
  Teacher: "Giáo viên",
  Admin: "Quản trị viên",
};

export const STATUS_LABELS: Record<ManagedUserStatus, string> = {
  Active: "Đang hoạt động",
  Suspended: "Đã khoá",
  Inactive: "Chưa xác thực",
};

export const GENDER_LABELS: Record<NonNullable<ManagedUserDetail["gender"]>, string> = {
  Male: "Nam",
  Female: "Nữ",
  Other: "Khác",
};

export const LEVEL_LABELS: Record<NonNullable<ManagedUserDetail["currentLevel"]>, string> = {
  Beginner: "Mới bắt đầu",
  Intermediate: "Trung cấp",
  Advanced: "Nâng cao",
};

/** Messages for the `code` extension of the Identity ProblemDetails responses. */
const ERROR_MESSAGES: Record<string, string> = {
  USER_CANNOT_MODIFY_SELF: "Bạn không thể thực hiện thao tác này trên chính tài khoản của mình.",
  USER_LAST_ADMINISTRATOR: "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động.",
  USER_DELETED: "Tài khoản đã bị xoá. Hãy khôi phục trước khi thay đổi.",
  USER_NOT_DELETED: "Tài khoản này chưa bị xoá.",
  USER_NOT_VERIFIED: "Tài khoản chưa xác thực email nên không thể khoá hoặc kích hoạt.",
  USER_CONCURRENT_UPDATE: "Một quản trị viên khác vừa thay đổi tài khoản này. Vui lòng thử lại.",
  USER_EMAIL_ALREADY_EXISTS: "Email đã được dùng cho một tài khoản khác (kể cả tài khoản đã xoá).",
  USER_PHONE_ALREADY_EXISTS: "Số điện thoại đã được dùng cho một tài khoản khác.",
  USER_NOT_FOUND: "Không tìm thấy tài khoản.",
};

export function userErrorMessage(error: unknown): string {
  if (errorStatus(error) === 403) {
    return "Chỉ quản trị viên mới có quyền quản lý tài khoản.";
  }
  return apiErrorMessage(error, ERROR_MESSAGES);
}

/** Tones shared by the badges, charts and statistics of accounts. */
export const STATUS_TONES: Record<ManagedUserStatus, Tone> = {
  Active: "theme",
  Suspended: "rose",
  Inactive: "neutral",
};

export const ROLE_TONES: Record<UserRole, Tone> = {
  User: "neutral",
  Teacher: "theme",
  Admin: "pearl",
};

/** Share-bar colours from the page theme, strongest for the healthy state. */
export const STATUS_COLORS: Record<ManagedUserStatus | "Deleted", string> = {
  Active: "var(--theme)",
  Suspended: "var(--ui-rose-mid)",
  Inactive: "var(--theme-light)",
  Deleted: "var(--ui-divider)",
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** The API returns UTC timestamps without an offset. */
const parseUtc = (value: string) =>
  new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);

export const formatDate = (value: string | null) =>
  value ? dateFormatter.format(parseUtc(value)) : "—";

export const formatDateTime = (value: string | null) =>
  value ? dateTimeFormatter.format(parseUtc(value)) : "—";

/** "5 phút trước", "3 ngày trước"; older than a month falls back to the date. */
export function formatRelative(value: string | null, now = Date.now()): string {
  if (!value) {
    return "Chưa đăng nhập";
  }

  const minutes = Math.max(0, Math.round((now - parseUtc(value).getTime()) / 60000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ngày trước`;

  return formatDate(value);
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
