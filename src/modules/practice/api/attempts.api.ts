import { z } from "zod";
import { isAxiosError } from "axios";
import { httpClient } from "@/services/http";

const optionalText = z.string().nullish();
export const answerSchema = z.enum(["A", "B", "C", "D"]).nullable();
const questionSchema = z.object({
  id: z.string().uuid(),
  sourceQuestionId: z.string().uuid(),
  passageId: z.string().uuid().nullish(),
  part: z.string(),
  version: z.number().int(),
  orderIndex: z.number().int(),
  questionNumber: z.number().int().nullish(),
  questionText: optionalText,
  optionA: z.string(),
  optionB: z.string(),
  optionC: z.string(),
  optionD: optionalText,
  audioUrl: optionalText,
  imageUrl: optionalText,
  transcript: optionalText,
  userAnswer: answerSchema.nullish().transform((v) => v ?? null),
  revision: z.number().int(),
});
export const attemptSchema = z.object({
  id: z.string().uuid(),
  practiceSetId: z.string().uuid(),
  status: z.literal("InProgress"),
  startTime: z.string(),
  lastActivityAt: z.string(),
  expiresAt: z.string(),
  set: z.object({
    id: z.string().uuid(),
    title: z.string(),
    part: z.string(),
    durationMinutes: z.number(),
  }),
  questions: z.array(questionSchema).min(1),
  passages: z.array(
    z.object({
      id: z.string().uuid(),
      part: z.string(),
      title: optionalText,
      content: optionalText,
      transcript: optionalText,
      audioUrl: optionalText,
      imageUrl: optionalText,
    }),
  ),
});
export const savedAnswerSchema = z.object({
  questionId: z.string().uuid(),
  userAnswer: answerSchema.nullish().transform((v) => v ?? null),
  revision: z.number().int(),
  lastActivityAt: z.string(),
});
export type Answer = z.infer<typeof answerSchema>;
export type PracticeAttempt = z.infer<typeof attemptSchema>;
export type SavedAnswer = z.infer<typeof savedAnswerSchema>;
const base = "/assessment/api/v1";
export const attemptsApi = {
  active: async (id: string, signal?: AbortSignal) =>
    z
      .object({ generation: z.number().int(), attemptId: z.string().uuid().nullish() })
      .parse(
        (await httpClient.get(`${base}/practice-sets/${id}/attempts/active`, { signal })).data,
      ),
  start: async (id: string, expectedGeneration: number, signal?: AbortSignal) =>
    attemptSchema.parse(
      (
        await httpClient.post(
          `${base}/practice-sets/${id}/attempts`,
          { expectedGeneration },
          { signal, timeout: 85_000 },
        )
      ).data,
    ),
  get: async (id: string, signal?: AbortSignal) =>
    attemptSchema.parse((await httpClient.get(`${base}/attempts/${id}`, { signal })).data),
  resume: async (id: string, signal?: AbortSignal) =>
    attemptSchema.parse(
      (await httpClient.post(`${base}/attempts/${id}/resume`, {}, { signal })).data,
    ),
  save: async (
    id: string,
    questionId: string,
    answer: Answer,
    expectedRevision: number,
    mutationId: string,
    signal?: AbortSignal,
  ) =>
    savedAnswerSchema.parse(
      (
        await httpClient.put(
          `${base}/attempts/${id}/answers/${questionId}`,
          { answer, expectedRevision, mutationId },
          { signal },
        )
      ).data,
    ),
  discard: async (id: string, signal?: AbortSignal) => {
    try {
      await httpClient.delete(`${base}/attempts/${id}`, { signal });
    } catch (error) {
      if (!isAxiosError(error) || error.response?.status !== 404) throw error;
    }
  },
};
