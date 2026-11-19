import { z } from "zod";
import { practiceKinds } from "../api/practice-sets.api";

export const practiceSetSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Nhập mã bộ luyện tập.")
      .max(100)
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
        "Mã bắt đầu bằng chữ hoặc số, chỉ gồm chữ, số và dấu . _ -.",
      ),
    title: z.string().trim().min(1, "Nhập tên bộ luyện tập.").max(255),
    description: z.string().max(2000).nullable(),
    kind: z.enum(practiceKinds),
    part: z.enum(["Part1", "Part2", "Part3", "Part4", "Part5", "Part6", "Part7"]),
    level: z.number().int().min(1).max(5).nullable(),
    targetScore: z.number().int().min(10).max(990).nullable(),
    durationMinutes: z.number().int().min(1).max(1000),
    orderIndex: z.number().int().min(0),
  })
  .superRefine((data, context) => {
    if (data.kind === "Level" && data.level === null)
      context.addIssue({ code: "custom", path: ["level"], message: "Chọn cấp độ 1–5." });
    if (data.kind !== "Level" && data.level !== null)
      context.addIssue({
        code: "custom",
        path: ["level"],
        message: "Chỉ bộ theo cấp độ mới có Level.",
      });
  });
export type PracticeSetFormValues = z.infer<typeof practiceSetSchema>;
