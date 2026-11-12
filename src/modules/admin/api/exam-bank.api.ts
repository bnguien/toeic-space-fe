import { httpClient } from "@/services/http";
import {
  bankOverviewSchema,
  examDetailSchema,
  examSchema,
  pageSchema,
  parseResponse,
  passageSchema,
  questionDetailSchema,
  questionSchema,
} from "./schemas";

export type BankFilters = Record<string, string | number | undefined>;
const base = "/assessment/api/v1";

const examPage = pageSchema(examSchema);
const questionPage = pageSchema(questionSchema);

/** Content endpoints require an Admin or Teacher session (ContentManager policy). */
export const examBankApi = {
  overview: async (signal?: AbortSignal) =>
    parseResponse(
      bankOverviewSchema,
      (await httpClient.get(`${base}/bank/overview`, { signal })).data,
      "bank/overview",
    ),
  exams: async (params: BankFilters, signal?: AbortSignal) =>
    parseResponse(
      examPage,
      (await httpClient.get(`${base}/tests`, { params, signal })).data,
      "tests",
    ),
  questions: async (params: BankFilters, signal?: AbortSignal) =>
    parseResponse(
      questionPage,
      (await httpClient.get(`${base}/questions`, { params, signal })).data,
      "questions",
    ),
  question: async (id: string, signal?: AbortSignal) =>
    parseResponse(
      questionDetailSchema,
      (await httpClient.get(`${base}/questions/${id}`, { signal })).data,
      "questions/{id}",
    ),
  passage: async (id: string, signal?: AbortSignal) =>
    parseResponse(
      passageSchema,
      (await httpClient.get(`${base}/passages/${id}`, { signal })).data,
      "passages/{id}",
    ),
  exam: async (id: string, signal?: AbortSignal) =>
    parseResponse(
      examDetailSchema,
      (await httpClient.get(`${base}/tests/${id}`, { signal })).data,
      "tests/{id}",
    ),
};
