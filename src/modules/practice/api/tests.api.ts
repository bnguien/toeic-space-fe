import { httpClient } from "@/services/http";

import { testCategoriesSchema, testDetailSchema, testsPageSchema } from "../schemas/test.schema";
import type { TestsQuery } from "../types/practice-exam.types";

const base = "/assessment/api/v1";

/** Published tests (anonymous allowed; learners only ever get Active tests). */
export const testsApi = {
  list: async (query: TestsQuery, signal?: AbortSignal) =>
    testsPageSchema.parse((await httpClient.get(`${base}/tests`, { params: query, signal })).data),
  categories: async (signal?: AbortSignal) =>
    testCategoriesSchema.parse((await httpClient.get(`${base}/tests/categories`, { signal })).data),
  detail: async (id: string, signal?: AbortSignal) =>
    testDetailSchema.parse((await httpClient.get(`${base}/tests/${id}`, { signal })).data),
};
