/**
 * Read hooks of the practice / mock exam flow. Learner queries run only for a signed-in learner
 * (role "User"); public catalogue queries run once the session is resolved.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { useCurrentUser, useSessionStatus } from "@/modules/auth";

import { attemptsApi } from "../api/attempts.api";
import { practiceExamKeys } from "../api/practice-exam.query-keys";
import { practiceProgressApi } from "../api/practice-progress.api";
import { testsApi } from "../api/tests.api";
import type { AttemptHistoryQuery, TestsQuery } from "../types/practice-exam.types";

/** No retry on 4xx: ownership / state errors will not change by retrying. */
const retryServerErrors = (count: number, error: unknown) =>
  count < 2 && !(isAxiosError(error) && (error.response?.status ?? 500) < 500);

/** Signed-in learner (role "User") or null. */
export function useLearner() {
  const user = useCurrentUser();
  return user?.role === "User" ? user : null;
}

function useResolved() {
  const status = useSessionStatus();
  return status === "authenticated" || status === "anonymous";
}

/* ---- One attempt ---- */

/** In-progress (or any own) attempt; never cached beyond the page (answers change locally). */
export function useAttempt(attemptId: string | undefined) {
  const learner = useLearner();
  return useQuery({
    queryKey: practiceExamKeys.attempt(learner?.id, attemptId ?? ""),
    enabled: Boolean(learner && attemptId),
    queryFn: ({ signal }) => attemptsApi.get(attemptId!, signal),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: retryServerErrors,
  });
}

/** Completed attempt with the full reveal (read-only workspace). */
export function useAttemptReview(attemptId: string | undefined) {
  const learner = useLearner();
  return useQuery({
    queryKey: practiceExamKeys.attemptReview(learner?.id, attemptId ?? ""),
    enabled: Boolean(learner && attemptId),
    queryFn: ({ signal }) => attemptsApi.review(attemptId!, signal),
    staleTime: Infinity,
    retry: retryServerErrors,
  });
}

/** Score and per-question grading of a completed attempt. */
export function useAttemptResult(attemptId: string | undefined) {
  const learner = useLearner();
  return useQuery({
    queryKey: practiceExamKeys.attemptResult(learner?.id, attemptId ?? ""),
    enabled: Boolean(learner && attemptId),
    queryFn: ({ signal }) => attemptsApi.result(attemptId!, signal),
    staleTime: Infinity,
    retry: retryServerErrors,
  });
}

/** Paged attempt history, newest first (the "Lịch sử làm bài" mode and setup page lists). */
export function useAttemptHistory(query: AttemptHistoryQuery, enabled = true) {
  const learner = useLearner();
  return useQuery({
    queryKey: practiceExamKeys.history(learner?.id, query),
    enabled: Boolean(learner) && enabled,
    queryFn: ({ signal }) => attemptsApi.history(query, signal),
    placeholderData: keepPreviousData,
    retry: retryServerErrors,
  });
}

/** In-progress attempt of a test (resume / restart note of the config dialog). */
export function useActiveTestAttempt(testId: string | undefined) {
  const learner = useLearner();
  return useQuery({
    queryKey: practiceExamKeys.activeTestAttempt(learner?.id, testId ?? ""),
    enabled: Boolean(learner && testId),
    queryFn: ({ signal }) => attemptsApi.activeForTest(testId!, signal),
    staleTime: 0,
    retry: retryServerErrors,
  });
}

/** Generation fence + in-progress attempt of a practice set. */
export function useActiveSetAttempt(setId: string | undefined) {
  const learner = useLearner();
  return useQuery({
    queryKey: practiceExamKeys.activeSetAttempt(learner?.id, setId ?? ""),
    enabled: Boolean(learner && setId),
    queryFn: ({ signal }) => attemptsApi.activeForSet(setId!, signal),
    staleTime: 0,
    retry: retryServerErrors,
  });
}

/* ---- Progress & stats ---- */

export function useTestsProgress() {
  const learner = useLearner();
  return useQuery({
    queryKey: practiceExamKeys.testsProgress(learner?.id),
    enabled: Boolean(learner),
    queryFn: ({ signal }) => practiceProgressApi.testsProgress(signal),
    retry: retryServerErrors,
  });
}

/** `part` 1..7 narrows the list; omit for every set. */
export function useSetsProgress(part?: number) {
  const learner = useLearner();
  return useQuery({
    queryKey: practiceExamKeys.setsProgress(learner?.id, part),
    enabled: Boolean(learner),
    queryFn: ({ signal }) => practiceProgressApi.setsProgress(part, signal),
    retry: retryServerErrors,
  });
}

/** Per-question status of one practice set (Unanswered / Correct / Wrong). */
export function useSetQuestions(setId: string | undefined) {
  const learner = useLearner();
  return useQuery({
    queryKey: practiceExamKeys.setQuestions(learner?.id, setId ?? ""),
    enabled: Boolean(learner && setId),
    queryFn: ({ signal }) => practiceProgressApi.setQuestions(setId!, signal),
    retry: retryServerErrors,
  });
}

export function usePracticeStats() {
  const learner = useLearner();
  return useQuery({
    queryKey: practiceExamKeys.stats(learner?.id),
    enabled: Boolean(learner),
    queryFn: ({ signal }) => practiceProgressApi.stats(signal),
    retry: retryServerErrors,
  });
}

/* ---- Public test catalogue ---- */

/** Exam series (test `category`) with counts and years. */
export function useTestCategories() {
  const resolved = useResolved();
  return useQuery({
    queryKey: practiceExamKeys.testCategories(),
    enabled: resolved,
    queryFn: ({ signal }) => testsApi.categories(signal),
    staleTime: 5 * 60_000,
  });
}

/** Published tests, e.g. `{ category, pageSize: 50 }` for a series card grid. */
export function useTests(query: TestsQuery, enabled = true) {
  const resolved = useResolved();
  return useQuery({
    queryKey: practiceExamKeys.testList(query),
    enabled: resolved && enabled,
    queryFn: ({ signal }) => testsApi.list(query, signal),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useTest(testId: string | undefined) {
  const resolved = useResolved();
  return useQuery({
    queryKey: practiceExamKeys.test(testId ?? ""),
    enabled: resolved && Boolean(testId),
    queryFn: ({ signal }) => testsApi.detail(testId!, signal),
    staleTime: 60_000,
  });
}
