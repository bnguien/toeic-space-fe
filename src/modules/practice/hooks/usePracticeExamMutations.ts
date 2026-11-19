/**
 * Write hooks of the practice / mock exam flow. Every success refreshes the learner's progress
 * views (`practiceExamKeys.me`) so cards, stats and history follow without a reload.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { attemptsApi } from "../api/attempts.api";
import { practiceExamKeys } from "../api/practice-exam.query-keys";
import type {
  Attempt,
  AttemptResult,
  PracticeSelection,
  RetakeScope,
  StartTestAttemptRequest,
} from "../types/practice-exam.types";
import { useLearner } from "./usePracticeExamQueries";

function useInvalidateLearner() {
  const client = useQueryClient();
  const learner = useLearner();
  return () =>
    client.invalidateQueries({
      queryKey: practiceExamKeys.me(learner?.id),
      // The open attempt keeps its own local state and completed results never change.
      predicate: (query) => !String(query.queryKey[3]).startsWith("attempt"),
    });
}

export interface StartTestAttemptInput extends StartTestAttemptRequest {
  testId: string;
}

/** POST tests/{id}/attempts → Attempt (resumes unless `restart`). Navigate in `onSuccess`. */
export function useStartTestAttempt() {
  const invalidate = useInvalidateLearner();
  return useMutation({
    networkMode: "always",
    retry: 0,
    mutationFn: ({ testId, ...body }: StartTestAttemptInput): Promise<Attempt> =>
      attemptsApi.startForTest(testId, body),
    onSuccess: () => void invalidate(),
  });
}

export interface StartSetAttemptInput {
  setId: string;
  selection?: PracticeSelection;
  /** Random: soft target 5..200. */
  count?: number;
  /** Abandon the set's in-progress attempt first (a new selection always starts clean). */
  restart?: boolean;
}

/**
 * Practice-set session: reads the generation fence, optionally abandons the in-progress attempt,
 * then starts. Without `restart` an in-progress attempt is returned as is (server semantics).
 */
export function useStartSetAttempt() {
  const invalidate = useInvalidateLearner();
  return useMutation({
    networkMode: "always",
    retry: 0,
    mutationFn: async ({ setId, selection, count, restart }: StartSetAttemptInput) => {
      let active = await attemptsApi.activeForSet(setId);
      if (restart && active.attemptId) {
        await attemptsApi.discard(active.attemptId);
        active = await attemptsApi.activeForSet(setId);
      }
      return attemptsApi.startForSet(setId, {
        expectedGeneration: active.generation,
        ...(selection ? { selection } : {}),
        ...(count ? { count } : {}),
      });
    },
    onSuccess: () => void invalidate(),
  });
}

/** "Luyện lại câu sai" (`Wrong`) / "Làm lại" (`All`) from a completed attempt. */
export function useRetakeAttempt() {
  const invalidate = useInvalidateLearner();
  return useMutation({
    networkMode: "always",
    retry: 0,
    mutationFn: ({ attemptId, scope }: { attemptId: string; scope: RetakeScope }) =>
      attemptsApi.retake(attemptId, scope),
    onSuccess: () => void invalidate(),
  });
}

/** Grades the attempt; the result is also seeded into the result query cache. */
export function useSubmitAttempt() {
  const client = useQueryClient();
  const learner = useLearner();
  const invalidate = useInvalidateLearner();
  return useMutation({
    networkMode: "always",
    retry: 1,
    mutationFn: (attemptId: string): Promise<AttemptResult> => attemptsApi.submit(attemptId),
    onSuccess: (result) => {
      client.setQueryData(practiceExamKeys.attemptResult(learner?.id, result.attemptId), result);
      void invalidate();
    },
  });
}

/** Abandons an in-progress attempt ("Làm lại đề" before restarting, "Bỏ bài"). */
export function useDiscardAttempt() {
  const invalidate = useInvalidateLearner();
  return useMutation({
    networkMode: "always",
    mutationFn: (attemptId: string) => attemptsApi.discard(attemptId),
    onSuccess: () => void invalidate(),
  });
}

/** Practice only: reveal for the given questions (1..60). Prefer `useAttemptSession().check`. */
export function useCheckAnswers() {
  return useMutation({
    networkMode: "always",
    mutationFn: ({ attemptId, questionIds }: { attemptId: string; questionIds: string[] }) =>
      attemptsApi.check(attemptId, questionIds),
  });
}

/** Flag toggle. Prefer `useAttemptSession().toggleFlag`, which is optimistic and queued. */
export function useFlagQuestion() {
  return useMutation({
    networkMode: "always",
    mutationFn: ({
      attemptId,
      questionId,
      flagged,
    }: {
      attemptId: string;
      questionId: string;
      flagged: boolean;
    }) => attemptsApi.flag(attemptId, questionId, flagged),
  });
}
