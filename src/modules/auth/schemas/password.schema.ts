import { z } from "zod";

import { SPECIAL_CHAR_REGEX } from "./register.schema";

export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email.")
    .max(254, "Email tối đa 254 ký tự.")
    .email("Email không hợp lệ."),
});

const passwordFields = {
  newPassword: z
    .string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
    .max(128, "Mật khẩu tối đa 128 ký tự.")
    .regex(/[A-Z]/, "Mật khẩu phải có ít nhất một chữ in hoa (A-Z).")
    .regex(SPECIAL_CHAR_REGEX, "Mật khẩu phải có ít nhất một ký tự đặc biệt."),
  confirmPassword: z
    .string()
    .min(1, "Vui lòng xác nhận mật khẩu.")
    .max(128, "Mật khẩu tối đa 128 ký tự."),
};

export const newPasswordSchema = z
  .object(passwordFields)
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    ...passwordFields,
    currentPassword: z
      .string()
      .min(1, "Vui lòng nhập mật khẩu hiện tại.")
      .max(128, "Mật khẩu tối đa 128 ký tự."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
    path: ["newPassword"],
  });

export type PasswordResetRequestValues = z.infer<typeof passwordResetRequestSchema>;
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
