import { z } from "zod";

import { isValidPhoneNumber } from "@/shared/utils/phone";

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập họ và tên.")
    .max(100, "Họ và tên tối đa 100 ký tự."),

  phone: z
    .string()
    .optional()
    .refine((val) => isValidPhoneNumber(val), "Số điện thoại không hợp lệ."),

  dateOfBirth: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || !val.trim()) return true;
      const date = new Date(val);
      if (Number.isNaN(date.getTime())) return false;

      // Extract date-only parts to compare correctly regardless of timezone
      const parts = val.split("-").map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const inputDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return inputDate < today;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date < today;
    }, "Ngày sinh phải trước ngày hiện tại."),

  gender: z.string().optional(),

  biography: z.string().max(300, "Tiểu sử tối đa 300 ký tự.").optional(),

  targetScore: z
    .number({ invalid_type_error: "Mục tiêu điểm TOEIC phải là số." })
    .int("Mục tiêu điểm TOEIC phải là số nguyên.")
    .min(10, "Mục tiêu điểm TOEIC phải từ 10 đến 990.")
    .max(990, "Mục tiêu điểm TOEIC phải từ 10 đến 990.")
    .optional(),

  currentLevel: z.string().optional(),

  avatarUrl: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || !val.trim()) return true;
      try {
        const url = new URL(val);
        return (url.protocol === "http:" || url.protocol === "https:") && val.length <= 500;
      } catch {
        return false;
      }
    }, "Đường dẫn ảnh đại diện không hợp lệ (tối đa 500 ký tự và bắt đầu bằng http:// hoặc https://)."),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
