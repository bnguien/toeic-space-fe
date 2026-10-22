import { httpClient } from "@/services/http";
import type {
  BankOverview,
  Exam,
  PageResult,
  Passage,
  Question,
  QuestionDetail,
} from "../types/exam-bank.types";

export type BankFilters = Record<string, string | number | undefined>;
const base = "/assessment/api/v1";

export const examBankApi = {
  overview: async (signal: AbortSignal) =>
    (await httpClient.get<BankOverview>(`${base}/bank/overview`, { signal })).data,
  exams: async (params: BankFilters, signal: AbortSignal) =>
    (await httpClient.get<PageResult<Exam>>(`${base}/tests`, { params, signal })).data,
  questions: async (params: BankFilters, signal: AbortSignal) =>
    (await httpClient.get<PageResult<Question>>(`${base}/questions`, { params, signal })).data,
  question: async (id: string, signal: AbortSignal) =>
    (await httpClient.get<QuestionDetail>(`${base}/questions/${id}`, { signal })).data,
  passage: async (id: string, signal: AbortSignal) =>
    (await httpClient.get<Passage>(`${base}/passages/${id}`, { signal })).data,
  exam: async (id: string, signal: AbortSignal) =>
    (await httpClient.get<Exam>(`${base}/tests/${id}`, { signal })).data,
};
