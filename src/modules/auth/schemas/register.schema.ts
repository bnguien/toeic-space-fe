import { z } from "zod";

export const VIETNAM_PHONE_REGEX = /^0[35789]\d{8}$/;

export function normalizePhoneNumber(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) {
    return null;
  }

  let cleaned = raw.replace(/[\s().-]/g, "");

  if (cleaned.startsWith("+84")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("0084")) {
    cleaned = "0" + cleaned.slice(4);
  }

  return cleaned;
}

export function isValidPhoneNumber(raw: string | null | undefined): boolean {
  const normalized = normalizePhoneNumber(raw);
  if (normalized === null) {
    return true;
  }
  return VIETNAM_PHONE_REGEX.test(normalized);
}

export const SPECIAL_CHAR_REGEX = /[^\p{L}\p{N}\s]/u;

export const PASSWORD_RULES = [
  {
    id: "length",
    label: "Ít nhất 8 ký tự",
    test: (val: string) => val.length >= 8,
  },
  {
    id: "uppercase",
    label: "Chữ in hoa (A-Z)",
    test: (val: string) => /[A-Z]/.test(val),
  },
  {
    id: "number",
    label: "Chữ số (0-9)",
    test: (val: string) => /[0-9]/.test(val),
  },
  {
    id: "special",
    label: "Ký tự đặc biệt (!@#...)",
    test: (val: string) => SPECIAL_CHAR_REGEX.test(val),
  },
] as const;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập họ và tên.")
      .max(200, "Họ và tên tối đa 200 ký tự."),
    email: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập email.")
      .max(254, "Email tối đa 254 ký tự.")
      .email("Email không hợp lệ."),
    phone: z
      .string()
      .optional()
      .refine((val) => isValidPhoneNumber(val), "Số điện thoại không hợp lệ."),
    password: z
      .string()
      .min(8, "Mật khẩu chưa đáp ứng đủ các yêu cầu bên dưới.")
      .max(128, "Mật khẩu tối đa 128 ký tự.")
      .regex(/[A-Z]/, "Mật khẩu chưa đáp ứng đủ các yêu cầu bên dưới.")
      .regex(/[0-9]/, "Mật khẩu chưa đáp ứng đủ các yêu cầu bên dưới.")
      .regex(SPECIAL_CHAR_REGEX, "Mật khẩu chưa đáp ứng đủ các yêu cầu bên dưới."),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
