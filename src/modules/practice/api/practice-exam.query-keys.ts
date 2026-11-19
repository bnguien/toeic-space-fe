import type { AttemptHistoryQuery, TestsQuery } from "../types/practice-exam.types";

/**
 * Query keys of the practice / mock exam flow. Learner data sits under `me(userId)` so one
 * invalidation refreshes every progress view after a submit; the auth module also clears the
 * whole cache on sign-out.
 */
export const practiceExamKeys = {
  all: ["practice-exam"] as const,
  /* Public catalogue */
  tests: () => [...practiceExamKeys.all, "tests"] as const,
  testList: (query: TestsQuery) => [...practiceExamKeys.tests(), "list", query] as const,
  testCategories: () => [...practiceExamKeys.tests(), "categories"] as const,
  test: (testId: string) => [...practiceExamKeys.tests(), "detail", testId] as const,
  /* Learner data */
  me: (userId: string | undefined) => [...practiceExamKeys.all, "me", userId ?? ""] as const,
  attempt: (userId: string | undefined, attemptId: string) =>
    [...practiceExamKeys.me(userId), "attempt", attemptId] as const,
  attemptReview: (userId: string | undefined, attemptId: string) =>
    [...practiceExamKeys.me(userId), "attempt-review", attemptId] as const,
  attemptResult: (userId: string | undefined, attemptId: string) =>
    [...practiceExamKeys.me(userId), "attempt-result", attemptId] as const,
  history: (userId: string | undefined, query?: AttemptHistoryQuery) =>
    query
      ? ([...practiceExamKeys.me(userId), "history", query] as const)
      : ([...practiceExamKeys.me(userId), "history"] as const),
  activeTestAttempt: (userId: string | undefined, testId: string) =>
    [...practiceExamKeys.me(userId), "active-test", testId] as const,
  activeSetAttempt: (userId: string | undefined, setId: string) =>
    [...practiceExamKeys.me(userId), "active-set", setId] as const,
  testsProgress: (userId: string | undefined) =>
    [...practiceExamKeys.me(userId), "tests-progress"] as const,
  setsProgress: (userId: string | undefined, part?: number) =>
    [...practiceExamKeys.me(userId), "sets-progress", part ?? 0] as const,
  setQuestions: (userId: string | undefined, setId: string) =>
    [...practiceExamKeys.me(userId), "set-questions", setId] as const,
  stats: (userId: string | undefined) => [...practiceExamKeys.me(userId), "stats"] as const,
};
