/**
 * Learner progress and statistics (`api/v1/me/practice/*`, `practice-sets/{id}/my-questions`)
 * Spec section 2.3.
 */
import { z } from "zod";

import { attemptModeSchema, attemptSummarySchema, nullable, partSchema } from "./attempt.schema.ts";

export const testProgressStatusSchema = z.enum(["NotStarted", "InProgress", "Completed"]);

export const testProgressSchema = z.object({
  testId: z.string().uuid(),
  status: testProgressStatusSchema,
  activeAttemptId: nullable(z.string().uuid()),
  activeMode: nullable(attemptModeSchema),
  answeredCount: z.number().int().catch(0),
  totalQuestions: z.number().int().catch(0),
  completedCount: z.number().int().catch(0),
  bestTotalScaled: nullable(z.number().int()),
  lastCompletedAttemptId: nullable(z.string().uuid()),
});
export const testsProgressSchema = z.array(testProgressSchema);

export const setProgressSchema = z.object({
  practiceSetId: z.string().uuid(),
  totalQuestions: z.number().int().catch(0),
  answeredQuestions: z.number().int().catch(0),
  correctQuestions: z.number().int().catch(0),
  wrongQuestions: z.number().int().catch(0),
  activeAttemptId: nullable(z.string().uuid()),
});
export const setsProgressSchema = z.array(setProgressSchema);

export const setQuestionStatusSchema = z.enum(["Unanswered", "Correct", "Wrong"]);
export const setQuestionProgressSchema = z.object({
  sourceQuestionId: z.string().uuid(),
  orderIndex: z.number().int(),
  questionNumber: nullable(z.number().int()),
  part: partSchema,
  status: setQuestionStatusSchema,
  lastAnsweredAt: nullable(z.string()),
});
export const setQuestionsProgressSchema = z.array(setQuestionProgressSchema);

export const practiceStatsSchema = z.object({
  testsCompleted: z.number().int().catch(0),
  testsTotal: z.number().int().catch(0),
  questionsAnswered: z.number().int().catch(0),
  /** 0..1 */
  correctRate: z.number().catch(0),
  byPart: z
    .array(z.object({ part: partSchema, answered: z.number().int(), correct: z.number().int() }))
    .catch([]),
  scoreTrend: z
    .array(
      z.object({
        attemptId: z.string().uuid(),
        completedAt: z.string(),
        totalScaled: nullable(z.number().int()),
        listeningScaled: nullable(z.number().int()),
        readingScaled: nullable(z.number().int()),
      }),
    )
    .catch([]),
  recent: z.array(attemptSummarySchema).catch([]),
});
