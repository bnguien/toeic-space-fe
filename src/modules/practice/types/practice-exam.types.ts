/** Types of the practice / mock exam flow, inferred from the response schemas. */
import type { z } from "zod";

import type {
  activeSetAttemptSchema,
  activeTestAttemptSchema,
  answerOptionSchema,
  answerSchema,
  attemptHistoryPageSchema,
  attemptModeSchema,
  attemptPassageSchema,
  attemptQuestionSchema,
  attemptResultSchema,
  attemptSchema,
  attemptScoreSchema,
  attemptSourceSchema,
  attemptStatusSchema,
  attemptSummarySchema,
  cefrSchema,
  flagResultSchema,
  partScoreSchema,
  passageRevealSchema,
  practiceSelectionSchema,
  questionHistoryEntrySchema,
  questionRevealSchema,
  resultAnswerSchema,
  retakeScopeSchema,
  revealSchema,
  savedAnswerSchema,
} from "../schemas/attempt.schema.ts";
import type {
  practiceStatsSchema,
  setProgressSchema,
  setQuestionProgressSchema,
  setQuestionStatusSchema,
  testProgressSchema,
  testProgressStatusSchema,
} from "../schemas/practice-progress.schema.ts";
import type {
  testCategorySchema,
  testDetailSchema,
  testSchema,
  testsPageSchema,
} from "../schemas/test.schema.ts";

export type AnswerOption = z.infer<typeof answerOptionSchema>;
/** Chosen option, or null when cleared / unanswered. */
export type Answer = z.infer<typeof answerSchema>;
export type AttemptMode = z.infer<typeof attemptModeSchema>;
export type AttemptStatus = z.infer<typeof attemptStatusSchema>;
export type PracticeSelection = z.infer<typeof practiceSelectionSchema>;
export type RetakeScope = z.infer<typeof retakeScopeSchema>;
export type AttemptSource = z.infer<typeof attemptSourceSchema>;
export type AttemptQuestion = z.infer<typeof attemptQuestionSchema>;
export type AttemptPassage = z.infer<typeof attemptPassageSchema>;
export type QuestionHistoryEntry = z.infer<typeof questionHistoryEntrySchema>;
export type QuestionReveal = z.infer<typeof questionRevealSchema>;
export type PassageReveal = z.infer<typeof passageRevealSchema>;
export type Reveal = z.infer<typeof revealSchema>;
export type Attempt = z.infer<typeof attemptSchema>;
export type SavedAnswer = z.infer<typeof savedAnswerSchema>;
export type FlagResult = z.infer<typeof flagResultSchema>;
export type ActiveSetAttempt = z.infer<typeof activeSetAttemptSchema>;
export type ActiveTestAttempt = z.infer<typeof activeTestAttemptSchema>;
export type Cefr = z.infer<typeof cefrSchema>;
export type AttemptScore = z.infer<typeof attemptScoreSchema>;
export type PartScore = z.infer<typeof partScoreSchema>;
export type ResultAnswer = z.infer<typeof resultAnswerSchema>;
export type AttemptResult = z.infer<typeof attemptResultSchema>;
export type AttemptSummary = z.infer<typeof attemptSummarySchema>;
export type AttemptHistoryPage = z.infer<typeof attemptHistoryPageSchema>;

export type TestProgressStatus = z.infer<typeof testProgressStatusSchema>;
export type TestProgress = z.infer<typeof testProgressSchema>;
export type SetProgress = z.infer<typeof setProgressSchema>;
export type SetQuestionStatus = z.infer<typeof setQuestionStatusSchema>;
export type SetQuestionProgress = z.infer<typeof setQuestionProgressSchema>;
export type PracticeStats = z.infer<typeof practiceStatsSchema>;

export type ToeicTest = z.infer<typeof testSchema>;
export type ToeicTestDetail = z.infer<typeof testDetailSchema>;
export type TestCategory = z.infer<typeof testCategorySchema>;
export type TestsPage = z.infer<typeof testsPageSchema>;

/* ---- Request bodies / query params ---- */

export interface StartTestAttemptRequest {
  mode: "FullTest" | "Practice";
  /** Practice only: 1..7, distinct, non-empty. Ignored for FullTest (always 1..7). */
  parts?: number[];
  /** Abandon the in-progress attempt of this test and start a new one. */
  restart?: boolean;
}

export interface StartSetAttemptRequest {
  expectedGeneration: number;
  selection?: PracticeSelection;
  /** Soft target 5..200 for Random; passage groups are kept whole. */
  count?: number;
}

export interface SaveAnswerRequest {
  answer: Answer;
  expectedRevision: number;
  mutationId: string;
  /** Seconds to add to the question's time (0..3600). */
  timeSpentSeconds?: number;
}

export interface AttemptHistoryQuery {
  mode?: AttemptMode;
  kind?: AttemptSource["kind"];
  sourceId?: string;
  status?: AttemptStatus;
  page?: number;
  pageSize?: number;
}

export interface TestsQuery {
  category?: string;
  year?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Section of a TOEIC test. */
export type ToeicSection = "listening" | "reading";

/** Modes of the practice space (`/practice/exam|listening|reading|history`). */
export type PracticeSpaceMode = "exam" | "listening" | "reading" | "history";
