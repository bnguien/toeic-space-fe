import { httpClient } from "@/services/http";

import {
  practiceStatsSchema,
  setQuestionsProgressSchema,
  setsProgressSchema,
  testsProgressSchema,
} from "../schemas/practice-progress.schema";

const base = "/assessment/api/v1";

/** Learner progress and statistics (signed-in learners only). */
export const practiceProgressApi = {
  /** Only tests the learner has touched. */
  testsProgress: async (signal?: AbortSignal) =>
    testsProgressSchema.parse(
      (await httpClient.get(`${base}/me/practice/tests-progress`, { signal })).data,
    ),
  /** Distinct source questions per set; `part` narrows to one part (1..7). */
  setsProgress: async (part?: number, signal?: AbortSignal) =>
    setsProgressSchema.parse(
      (
        await httpClient.get(`${base}/me/practice/sets-progress`, {
          params: part ? { part } : undefined,
          signal,
        })
      ).data,
    ),
  /** Per-question status of one practice set for the "Góc luyện tập" grid. */
  setQuestions: async (setId: string, signal?: AbortSignal) =>
    setQuestionsProgressSchema.parse(
      (await httpClient.get(`${base}/practice-sets/${setId}/my-questions`, { signal })).data,
    ),
  stats: async (signal?: AbortSignal) =>
    practiceStatsSchema.parse((await httpClient.get(`${base}/me/practice/stats`, { signal })).data),
};
