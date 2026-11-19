import { z } from "zod";
import { pageSchema, passageSchema, questionDetailSchema } from "@/modules/admin";
import { httpClient } from "@/services/http";

export const practiceKinds = ["Level", "Topic", "PartDrill"] as const;
export const practiceStatuses = ["Draft", "Active", "Archived"] as const;
const nullable = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullish().transform((value): z.output<T> | null => value ?? null);
const setSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  description: nullable(z.string()),
  kind: z.enum(practiceKinds),
  part: z.string(),
  level: nullable(z.number().int()),
  targetScore: nullable(z.number().int()),
  durationMinutes: z.number().int(),
  status: z.enum(practiceStatuses),
  orderIndex: z.number().int(),
  createdByUserId: nullable(z.string().uuid()),
});
const detailSchema = setSchema.extend({
  updatedAt: nullable(z.string()),
  createdAt: z.string(),
  items: z.array(z.object({ questionId: z.string().uuid(), orderIndex: z.number().int() })),
});
const contentQuestion = questionDetailSchema;
const contentSchema = z.object({
  id: z.string().uuid(),
  questionCount: z.number().int(),
  includesAnswers: z.boolean(),
  parts: z.array(
    z.object({
      part: z.string(),
      standaloneQuestions: z.array(contentQuestion),
      passages: z.array(
        passageSchema.extend({
          id: z.string().uuid(),
          questions: z.array(contentQuestion),
        }),
      ),
    }),
  ),
});
export type PracticeSet = z.infer<typeof setSchema>;
export type PracticeSetDetail = z.infer<typeof detailSchema>;
export type PracticeSetContent = z.infer<typeof contentSchema>;
export type PracticeKind = PracticeSet["kind"];
export type PracticeStatus = PracticeSet["status"];
export type PracticeMetadata = Pick<
  PracticeSet,
  | "code"
  | "title"
  | "description"
  | "kind"
  | "part"
  | "level"
  | "targetScore"
  | "durationMinutes"
  | "orderIndex"
>;
export type PracticeFilters = Record<string, string | number | boolean | undefined>;
export type PracticeQuestionSelection = { questionIds: string[]; expectedQuestionIds: string[] };
const base = "/assessment/api/v1/practice-sets";
export const practiceSetsApi = {
  list: async (params: PracticeFilters, signal?: AbortSignal) =>
    pageSchema(setSchema.extend({ questionCount: z.number().int() })).parse(
      (await httpClient.get(base, { params, signal })).data,
    ),
  detail: async (id: string, signal?: AbortSignal) =>
    detailSchema.parse((await httpClient.get(`${base}/${id}`, { signal })).data),
  content: async (id: string, signal?: AbortSignal) =>
    contentSchema.parse((await httpClient.get(`${base}/${id}/content`, { signal })).data),
  create: async (
    data: PracticeMetadata & { questionIds?: string[]; status?: "Draft" | "Active" },
  ) => detailSchema.parse((await httpClient.post(base, data)).data),
  update: async (id: string, data: PracticeMetadata & { expectedUpdatedAt?: string }) =>
    detailSchema.parse((await httpClient.put(`${base}/${id}`, data)).data),
  items: async (id: string, selection: PracticeQuestionSelection) =>
    detailSchema.parse((await httpClient.put(`${base}/${id}/items`, selection)).data),
  status: async (id: string, status: PracticeStatus) =>
    detailSchema.parse((await httpClient.patch(`${base}/${id}/status`, { status })).data),
  remove: async (id: string) => {
    await httpClient.delete(`${base}/${id}`);
  },
};
