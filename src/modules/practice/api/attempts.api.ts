import { isAxiosError } from "axios";
import { httpClient } from "@/services/http";

import {
  activeSetAttemptSchema,
  activeTestAttemptSchema,
  attemptHistoryPageSchema,
  attemptResultSchema,
  attemptSchema,
  flagResultSchema,
  revealSchema,
  savedAnswerSchema,
} from "../schemas/attempt.schema";
import type {
  Answer,
  AttemptHistoryQuery,
  RetakeScope,
  StartSetAttemptRequest,
  StartTestAttemptRequest,
} from "../types/practice-exam.types";

export { answerSchema, attemptSchema, savedAnswerSchema } from "../schemas/attempt.schema";
export type { Answer, Attempt, SavedAnswer } from "../types/practice-exam.types";

const base = "/assessment/api/v1";
/** Starting copies media into the attempt snapshot: a first full test can take a while. */
// The server may spend up to 240 s preserving media for a first full-test start.
const START_TIMEOUT_MS = 245_000;

/** Learner attempt endpoints (spec section 2). Every response is validated with zod. */
export const attemptsApi = {
  /* ---- Practice sets ---- */
  /** GET practice-sets/{id}/attempts/active → generation fence + in-progress attempt id. */
  activeForSet: async (setId: string, signal?: AbortSignal) =>
    activeSetAttemptSchema.parse(
      (await httpClient.get(`${base}/practice-sets/${setId}/attempts/active`, { signal })).data,
    ),
  /** POST practice-sets/{id}/attempts; 409 `nothing_to_practice` when the selection is empty. */
  startForSet: async (setId: string, body: StartSetAttemptRequest, signal?: AbortSignal) =>
    attemptSchema.parse(
      (
        await httpClient.post(`${base}/practice-sets/${setId}/attempts`, body, {
          signal,
          timeout: START_TIMEOUT_MS,
        })
      ).data,
    ),

  /* ---- Tests ---- */
  /** GET tests/{id}/attempts/active. */
  activeForTest: async (testId: string, signal?: AbortSignal) =>
    activeTestAttemptSchema.parse(
      (await httpClient.get(`${base}/tests/${testId}/attempts/active`, { signal })).data,
    ),
  /** POST tests/{id}/attempts: resumes the in-progress attempt unless `restart`. */
  startForTest: async (testId: string, body: StartTestAttemptRequest, signal?: AbortSignal) =>
    attemptSchema.parse(
      (
        await httpClient.post(`${base}/tests/${testId}/attempts`, body, {
          signal,
          timeout: START_TIMEOUT_MS,
        })
      ).data,
    ),

  /* ---- One attempt ---- */
  get: async (id: string, signal?: AbortSignal) =>
    attemptSchema.parse((await httpClient.get(`${base}/attempts/${id}`, { signal })).data),
  /** Refreshes LastActivityAt of an in-progress attempt and returns it. */
  resume: async (id: string, signal?: AbortSignal) =>
    attemptSchema.parse(
      (await httpClient.post(`${base}/attempts/${id}/resume`, {}, { signal })).data,
    ),
  /** Completed attempts only: every question revealed, passages with translations. */
  review: async (id: string, signal?: AbortSignal) =>
    attemptSchema.parse((await httpClient.get(`${base}/attempts/${id}/review`, { signal })).data),
  /** Completed attempts only (409 `attempt_not_completed`). */
  result: async (id: string, signal?: AbortSignal) =>
    attemptResultSchema.parse(
      (await httpClient.get(`${base}/attempts/${id}/result`, { signal })).data,
    ),
  /**
   * PUT attempts/{id}/answers/{questionId}. `timeSpentSeconds` is a delta added server side.
   * 409 `answer_locked` (checked), `attempt_time_up` (FullTest past deadline) or not in progress.
   */
  save: async (
    id: string,
    questionId: string,
    answer: Answer,
    expectedRevision: number,
    mutationId: string,
    signal?: AbortSignal,
    timeSpentSeconds?: number,
  ) =>
    savedAnswerSchema.parse(
      (
        await httpClient.put(
          `${base}/attempts/${id}/answers/${questionId}`,
          timeSpentSeconds
            ? { answer, expectedRevision, mutationId, timeSpentSeconds }
            : { answer, expectedRevision, mutationId },
          { signal },
        )
      ).data,
    ),
  flag: async (id: string, questionId: string, flagged: boolean, signal?: AbortSignal) =>
    flagResultSchema.parse(
      (await httpClient.put(`${base}/attempts/${id}/flags/${questionId}`, { flagged }, { signal }))
        .data,
    ),
  /** Practice only (FullTest → 403 `check_not_allowed`); 1..60 ids per call; idempotent. */
  check: async (id: string, questionIds: string[], signal?: AbortSignal) =>
    revealSchema.parse(
      (await httpClient.post(`${base}/attempts/${id}/check`, { questionIds }, { signal })).data,
    ),
  /** Grades and completes; idempotent (a completed attempt returns the same result). */
  submit: async (id: string, signal?: AbortSignal) =>
    attemptResultSchema.parse(
      (await httpClient.post(`${base}/attempts/${id}/submit`, {}, { signal, timeout: 60_000 }))
        .data,
    ),
  /** New Practice attempt with the same source: wrong + skipped (`Wrong`) or every question. */
  retake: async (id: string, scope: RetakeScope, signal?: AbortSignal) =>
    attemptSchema.parse(
      (
        await httpClient.post(
          `${base}/attempts/${id}/retake`,
          { scope },
          { signal, timeout: START_TIMEOUT_MS },
        )
      ).data,
    ),
  /** Abandons an in-progress attempt; a missing attempt counts as done. */
  discard: async (id: string, signal?: AbortSignal) => {
    try {
      await httpClient.delete(`${base}/attempts/${id}`, { signal });
    } catch (error) {
      if (!isAxiosError(error) || error.response?.status !== 404) throw error;
    }
  },

  /* ---- History ---- */
  /** GET attempts?mode=&kind=&sourceId=&status=&page=&pageSize= (newest first). */
  history: async (query: AttemptHistoryQuery, signal?: AbortSignal) =>
    attemptHistoryPageSchema.parse(
      (await httpClient.get(`${base}/attempts`, { params: query, signal })).data,
    ),
};
