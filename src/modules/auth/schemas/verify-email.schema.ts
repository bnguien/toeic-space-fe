import { z } from "zod";

export const verifyEmailSchema = z.object({
  otp: z
    .string()
    .trim()
    .length(6, "Mã OTP phải gồm đúng 6 chữ số.")
    .regex(/^[0-9]{6}$/, "Mã OTP chỉ bao gồm chữ số."),
});

export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;
