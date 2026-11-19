import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import { attemptsApi } from "../api/attempts.api";
import { practiceExamKeys } from "../api/practice-exam.query-keys";
import type {
  Answer,
  AnswerOption,
  Attempt,
  AttemptResult,
  Reveal,
} from "../types/practice-exam.types";
import { buildAttemptGroups, type QuestionGroup } from "../utils/attemptGroups";
import { AttemptAutosave, type AnswerState } from "../utils/attemptAutosave";
import { useLearner } from "./usePracticeExamQueries";

/** Thrown by `submit()` when some answers could not be saved (pass `{ force: true }` to submit anyway). */
export class UnsavedAnswersError extends Error {
  readonly unsaved: number;
  constructor(unsaved: number) {
    super("unsaved_answers");
    this.unsaved = unsaved;
  }
}

export interface AttemptSessionOptions {
  /** Read-only review: nothing is saved, every question counts as revealed. */
  reviewOnly?: boolean;
  /** The server refused an answer because time is up / the attempt ended (auto-submit, reload). */
  onFatal?: (code: "attempt_time_up" | "attempt_not_active") => void;
}

export interface AttemptSession {
  attempt: Attempt;
  /** Ordered groups with every reveal received so far. */
  groups: QuestionGroup[];
  /** Per-question save state (selected / saved / status / flagged), attempt order. */
  states: readonly AnswerState[];
  stateOf: (questionId: string) => AnswerState | undefined;
  /** The learner's current choice (optimistic). */
  answerOf: (questionId: string) => AnswerOption | null;
  isFlagged: (questionId: string) => boolean;
  /** Checked (practice) or completed: the answer key is known. */
  isRevealed: (questionId: string) => boolean;
  /** Choose / clear an answer (ignored once revealed or completed). */
  select: (questionId: string, answer: Answer) => void;
  toggleFlag: (questionId: string, flagged?: boolean) => void;
  /** Seconds spent on questions, sent with their next save (practice time tracking). */
  addTime: (questionIds: readonly string[], seconds: number) => void;
  /** Practice: grade these questions now (1..60). Resolves with the merged reveal. */
  check: (questionIds: readonly string[]) => Promise<Reveal>;
  checking: boolean;
  checkError: unknown;
  /** Saves everything then grades the attempt. */
  submit: (options?: { force?: boolean }) => Promise<AttemptResult>;
  submitting: boolean;
  submitError: unknown;
  result: AttemptResult | null;
  /** Saves every pending answer / time / flag; true when all confirmed. */
  flush: () => Promise<boolean>;
  /** Some answer is not confirmed by the server yet. */
  dirty: boolean;
  answeredCount: number;
  flaggedCount: number;
  total: number;
  readOnly: boolean;
  /** Retry a failed save / choose a side of a conflict (see AttemptAutosave). */
  queue: AttemptAutosave | null;
}

const noopSubscribe = () => () => {};

function mergeRevealInto(current: Reveal, next: Reveal): Reveal {
  const questions = new Map(current.questions.map((q) => [q.questionId, q]));
  next.questions.forEach((q) => questions.set(q.questionId, q));
  const passages = new Map(current.passages.map((p) => [p.id, p]));
  next.passages.forEach((p) => passages.set(p.id, p));
  return { questions: [...questions.values()], passages: [...passages.values()] };
}

const initialStates = (attempt: Attempt, locked: boolean): AnswerState[] => {
  const revealed = new Set(attempt.reveal.questions.map((r) => r.questionId));
  return attempt.questions.map((q) => ({
    id: q.id,
    selected: q.userAnswer,
    saved: q.userAnswer,
    revision: q.revision,
    status: locked || q.checked || revealed.has(q.id) ? "locked" : "saved",
    flagged: q.flagged,
    flagStatus: "saved",
  }));
};

/** Autosave queue of an in-progress attempt (answers + time + flags). */
function createQueue(attempt: Attempt) {
  const revealed = new Set(attempt.reveal.questions.map((r) => r.questionId));
  return new AttemptAutosave(
    attempt.questions.map((q) => ({
      id: q.id,
      userAnswer: q.userAnswer,
      revision: q.revision,
      flagged: q.flagged,
      checked: q.checked || revealed.has(q.id),
    })),
    (questionId, answer, revision, mutationId, timeSpentSeconds) =>
      attemptsApi.save(
        attempt.id,
        questionId,
        answer,
        revision,
        mutationId,
        undefined,
        timeSpentSeconds,
      ),
    { saveFlag: (questionId, flagged) => attemptsApi.flag(attempt.id, questionId, flagged) },
  );
}

/**
 * One loaded attempt: autosave (answers + time + flags), per-group check, submit and the merged
 * reveal. Remount (key = attempt id) for another attempt.
 */
export function useAttemptSession(
  attempt: Attempt,
  { reviewOnly = false, onFatal }: AttemptSessionOptions = {},
): AttemptSession {
  const client = useQueryClient();
  const learner = useLearner();
  const readOnly = reviewOnly || attempt.status !== "InProgress";
  const fatal = useEffectEvent((code: "attempt_time_up" | "attempt_not_active") => onFatal?.(code));
  // One queue per mounted session (remount with key = attempt id for another attempt).
  const [queue] = useState(() => (readOnly ? null : createQueue(attempt)));
  const [reveal, setReveal] = useState<Reveal>(attempt.reveal);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const fallbackStates = useMemo(() => initialStates(attempt, readOnly), [attempt, readOnly]);
  const learnerId = learner?.id;

  useEffect(() => {
    if (!queue) return;
    queue.activate((code) => fatal(code));
    return () => queue.dispose();
  }, [queue]);

  const states = useSyncExternalStore(
    queue?.subscribe ?? noopSubscribe,
    queue?.snapshot ?? (() => fallbackStates),
    () => fallbackStates,
  );
  const byId = useMemo(() => new Map(states.map((s) => [s.id, s])), [states]);
  const groups = useMemo(
    () => buildAttemptGroups({ questions: attempt.questions, passages: attempt.passages, reveal }),
    [attempt.questions, attempt.passages, reveal],
  );
  const revealedIds = useMemo(() => new Set(reveal.questions.map((r) => r.questionId)), [reveal]);
  const completed = result !== null;

  const select = useCallback(
    (questionId: string, answer: Answer) => {
      if (readOnly || completed || revealedIds.has(questionId)) return;
      queue?.select(questionId, answer);
    },
    [queue, readOnly, completed, revealedIds],
  );
  const toggleFlag = useCallback(
    (questionId: string, flagged?: boolean) => {
      if (!readOnly && !completed) void queue?.toggleFlag(questionId, flagged);
    },
    [queue, readOnly, completed],
  );
  const addTime = useCallback(
    (questionIds: readonly string[], seconds: number) => {
      if (!queue || readOnly || completed || questionIds.length === 0 || !(seconds > 0)) return;
      const share = seconds / questionIds.length;
      questionIds.forEach((id) => queue.addTime(id, share));
    },
    [queue, readOnly, completed],
  );

  const flush = useCallback(async () => (queue ? queue.flush() : true), [queue]);

  const busy = useRef(false);
  const check = async (questionIds: readonly string[]) => {
    if (readOnly || completed) throw new Error("read_only");
    setChecking(true);
    setCheckError(null);
    try {
      await queue?.flush();
      let merged = reveal;
      for (let i = 0; i < questionIds.length; i += 60) {
        const chunk = await attemptsApi.check(attempt.id, [...questionIds.slice(i, i + 60)]);
        merged = mergeRevealInto(merged, chunk);
        queue?.lock(chunk.questions.map((r) => ({ id: r.questionId, userAnswer: r.userAnswer })));
        setReveal((current) => mergeRevealInto(current, chunk));
      }
      return merged;
    } catch (error) {
      setCheckError(error);
      throw error;
    } finally {
      setChecking(false);
    }
  };

  const submit = async ({ force = false }: { force?: boolean } = {}) => {
    if (busy.current) throw new Error("busy");
    if (result) return result;
    busy.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const saved = queue ? await queue.flush() : true;
      if (!saved && !force) {
        const unsaved = (queue?.snapshot() ?? []).filter(
          (s) => s.status !== "saved" && s.status !== "locked",
        ).length;
        throw new UnsavedAnswersError(unsaved);
      }
      const graded = await attemptsApi.submit(attempt.id);
      client.setQueryData(practiceExamKeys.attemptResult(learnerId, graded.attemptId), graded);
      void client.invalidateQueries({
        queryKey: practiceExamKeys.me(learnerId),
        predicate: (query) => !String(query.queryKey[3]).startsWith("attempt"),
      });
      setResult(graded);
      return graded;
    } catch (error) {
      setSubmitError(error);
      throw error;
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  return {
    attempt,
    groups,
    states,
    stateOf: (questionId) => byId.get(questionId),
    answerOf: (questionId) => byId.get(questionId)?.selected ?? null,
    isFlagged: (questionId) => byId.get(questionId)?.flagged ?? false,
    isRevealed: (questionId) => readOnly || revealedIds.has(questionId),
    select,
    toggleFlag,
    addTime,
    check,
    checking,
    checkError,
    submit,
    submitting,
    submitError,
    result,
    flush,
    dirty: states.some((s) => s.status !== "saved" && s.status !== "locked"),
    answeredCount: states.filter((s) => s.selected != null).length,
    flaggedCount: states.filter((s) => s.flagged).length,
    total: states.length,
    readOnly: readOnly || completed,
    queue,
  };
}

/**
 * Counts visible time on the given questions (practice workspace) and hands it to the session
 * when they change, the tab is hidden or the component unmounts.
 */
export function useQuestionTimer(
  session: Pick<AttemptSession, "addTime" | "readOnly">,
  questionIds: readonly string[],
) {
  const key = questionIds.join(",");
  const add = useEffectEvent((ids: readonly string[], seconds: number) =>
    session.addTime(ids, seconds),
  );
  useEffect(() => {
    if (session.readOnly || !key) return;
    const ids = key.split(",");
    let started = document.visibilityState === "visible" ? Date.now() : null;
    const stop = () => {
      if (started === null) return;
      const seconds = (Date.now() - started) / 1000;
      started = null;
      // Ignore idle tabs left open: cap one sitting at 10 minutes per group.
      add(ids, Math.min(seconds, 600));
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") started ??= Date.now();
      else stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [key, session.readOnly]);
}
