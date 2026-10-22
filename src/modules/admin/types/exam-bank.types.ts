import type { z } from "zod";

import type {
  bankOverviewSchema,
  examDetailSchema,
  examSchema,
  passageSchema,
  questionDetailSchema,
  questionSchema,
} from "../api/schemas";

/** Types follow the runtime schemas in ../api/schemas.ts, so both stay in step with the API. */
export interface PageResult<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  pageIndex: number;
  pageSize: number;
}

export type Exam = z.infer<typeof examSchema>;

/** `GET /assessment/api/v1/tests/{id}`: an exam with its question count per Part. */
export type ExamDetail = z.infer<typeof examDetailSchema>;

/** Counts behind the bank overview page: `GET /assessment/api/v1/bank/overview`. */
export type BankOverview = z.infer<typeof bankOverviewSchema>;

export type BankPartStats = BankOverview["parts"][number];

export type Question = z.infer<typeof questionSchema>;

/**
 * Text fields may contain simple HTML from the imported sources; render them with RichText.
 * Translations come separately and are only returned to content managers.
 */
export type QuestionDetail = z.infer<typeof questionDetailSchema>;

export type Passage = z.infer<typeof passageSchema>;
