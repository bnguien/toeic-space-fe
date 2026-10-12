import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email.")
    .max(254, "Email quá dài.")
    .email("Email không hợp lệ."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu.").max(128, "Mật khẩu quá dài."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
