/** Learner test catalogue (`api/v1/tests`, `tests/categories`, `tests/{id}`; TestsController DTOs). */
import { z } from "zod";

import { nullable, paginatedSchema, partSchema } from "./attempt.schema.ts";

export const testSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  description: nullable(z.string()),
  category: nullable(z.string()),
  year: nullable(z.number().int()),
  totalQuestions: z.number().int(),
  durationMinutes: z.number().int(),
  totalListeningQuestions: z.number().int().catch(0),
  totalReadingQuestions: z.number().int().catch(0),
  audioUrl: nullable(z.string()),
  isActive: z.boolean().catch(true),
  status: z.string().catch("Active"),
  createdAt: z.string(),
});
export const testsPageSchema = paginatedSchema(testSchema);

export const testCategorySchema = z.object({
  category: z.string(),
  testCount: z.number().int(),
  years: z.array(z.number().int()).catch([]),
});
export const testCategoriesSchema = z.array(testCategorySchema);

export const testDetailSchema = testSchema.extend({
  passageCount: z.number().int().catch(0),
  questionCount: z.number().int().catch(0),
  listeningQuestionCount: z.number().int().catch(0),
  readingQuestionCount: z.number().int().catch(0),
  parts: z
    .array(
      z.object({
        part: partSchema,
        questionCount: z.number().int(),
        expectedQuestionCount: z.number().int(),
      }),
    )
    .catch([]),
  updatedAt: nullable(z.string()),
});
